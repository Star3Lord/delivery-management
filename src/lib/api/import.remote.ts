import { eq, and, ne, inArray, desc, sql, count } from 'drizzle-orm';
import * as v from 'valibot';
import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import {
  import_session,
  import_row,
  customer,
  product,
  vehicle,
  delivery_slip,
} from '$lib/server/db/schema';
import {
  parse_file,
  validate_royalty,
  validate_mapped_row,
  normalize_date,
} from '$lib/utils/import/parse';
import { apply_column_mapping } from '$lib/utils/import/column-mapping';
import {
  compute_delivery_hash,
  compute_duplicate_score,
  type DuplicateCheckInput,
} from '$lib/utils/import/hash';
import {
  find_name_match,
  find_vehicle_match,
  find_fuzzy_map_key,
  normalize_string,
  normalize_vehicle_number,
} from '$lib/utils/import/fuzzy-match';
import type {
  ColumnMapping,
  ImportStats,
  RowIssue,
} from '$lib/utils/import/types';

// ─── Session Queries ──────────────────────────────────────────────

export const get_import_session = query(
  v.object({ id: v.string() }),
  async ({ id }) => {
    const [session] = await db
      .select()
      .from(import_session)
      .where(eq(import_session.id, id))
      .limit(1);
    return session ?? null;
  }
);

export const list_import_sessions = query(async () => {
  return db
    .select({
      id: import_session.id,
      file_name: import_session.file_name,
      status: import_session.status,
      stats: import_session.stats,
      created_at: import_session.created_at,
    })
    .from(import_session)
    .orderBy(desc(import_session.created_at))
    .limit(20);
});

// ─── Create Import Session ────────────────────────────────────────

export const create_import_session = command(
  v.object({
    file_name: v.string(),
    file_data: v.string(), // base64-encoded file content
  }),
  async ({ file_name, file_data }) => {
    const buffer = base64_to_array_buffer(file_data);
    const result = parse_file(buffer, file_name);

    if (result.rows.length === 0) {
      throw new Error('No valid rows found in file');
    }

    const [session] = await db
      .insert(import_session)
      .values({
        file_name,
        status: 'mapping',
        raw_headers: result.headers,
        suggested_mapping: result.suggested_mapping,
        sample_rows: result.sample_rows,
        stats: result.stats,
      })
      .returning();

    const row_values = result.rows.map((r) => ({
      session_id: session.id,
      row_index: r.row_index,
      raw_data: r.raw_data,
      status: 'pending' as const,
      issues: r.issues.length > 0 ? r.issues : null,
    }));

    // Insert in chunks to avoid exceeding parameter limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < row_values.length; i += CHUNK_SIZE) {
      await db.insert(import_row).values(row_values.slice(i, i + CHUNK_SIZE));
    }

    return session;
  }
);

// ─── Confirm Column Mapping ───────────────────────────────────────

export const confirm_column_mapping = command(
  v.object({
    session_id: v.string(),
    mapping: v.record(v.string(), v.nullable(v.string())),
  }),
  async ({ session_id, mapping }) => {
    const typed_mapping = mapping as ColumnMapping;

    // Update session with confirmed mapping
    await db
      .update(import_session)
      .set({ column_mapping: typed_mapping, status: 'processing' })
      .where(eq(import_session.id, session_id));

    // Load all rows for this session
    const rows = await db
      .select()
      .from(import_row)
      .where(eq(import_row.session_id, session_id))
      .orderBy(import_row.row_index);

    // Load existing entities for matching
    const [all_parties, all_vehicles, all_products] = await Promise.all([
      db.select({ id: customer.id, name: customer.name }).from(customer),
      db
        .select({ id: vehicle.id, number_plate: vehicle.number_plate })
        .from(vehicle),
      db.select({ id: product.id, name: product.name }).from(product),
    ]);

    // Track new entity names for consolidation
    const new_parties = new Map<string, string>(); // normalized -> display name
    const new_vehicles = new Map<string, string>();
    const new_products = new Map<string, string>();

    // Process each row: apply mapping, validate, resolve entities, compute hash
    const updates: {
      id: string;
      mapped_data: Record<string, unknown>;
      hash: string | null;
      dup_input: DuplicateCheckInput;
      status: 'pending' | 'skipped' | 'duplicate';
      issues: RowIssue[] | null;
      duplicate_score: number;
      matched_party_id: string | null;
      matched_vehicle_id: string | null;
      matched_product_id: string | null;
      match_confidence: {
        party: number;
        vehicle: number;
        product: number;
        duplicate?: number;
      } | null;
      new_party_name: string | null;
      new_vehicle_number: string | null;
      new_product_name: string | null;
    }[] = [];

    const hash_counts = new Map<string, number>();

    for (const row of rows) {
      const { fields: mapped, metadata: row_metadata } = apply_column_mapping(
        row.raw_data as Record<string, unknown>,
        typed_mapping
      );

      // Store metadata alongside fields for later use
      const mapped_data: Record<string, unknown> = {
        ...mapped,
        _metadata:
          Object.keys(row_metadata).length > 0 ? row_metadata : undefined,
      };

      // Normalize date -- use null if unparseable, never keep raw garbage
      if (mapped.date) {
        const normalized = normalize_date(mapped.date);
        mapped.date = normalized;
        mapped_data.date = normalized;
      }

      // Validate required fields
      const field_issues = validate_mapped_row(mapped, typed_mapping);

      // Validate royalty
      const royalty = validate_royalty(mapped);
      mapped.royalty_number = royalty.royalty_number;
      mapped.royalty_quantity = royalty.royalty_quantity;
      mapped_data.royalty_number = royalty.royalty_number;
      mapped_data.royalty_quantity = royalty.royalty_quantity;
      const all_issues = [...field_issues, ...royalty.issues];

      // Discard if critical fields are missing
      const has_critical_issues = field_issues.some(
        (i) => i.field === 'date' || i.field === 'product_quantity'
      );

      if (has_critical_issues) {
        updates.push({
          id: row.id,
          mapped_data,
          hash: null,
          dup_input: { date: null },
          status: 'skipped',
          issues: all_issues.length > 0 ? all_issues : null,
          duplicate_score: 0,
          matched_party_id: null,
          matched_vehicle_id: null,
          matched_product_id: null,
          match_confidence: null,
          new_party_name: null,
          new_vehicle_number: null,
          new_product_name: null,
        });
        continue;
      }

      // Resolve entities via fuzzy matching
      const entity_result = resolve_entities(
        mapped,
        all_parties,
        all_vehicles,
        all_products,
        new_parties,
        new_vehicles,
        new_products
      );

      // Build duplicate check input using resolved entity IDs
      const dup_input: DuplicateCheckInput = {
        date: mapped.date ? String(mapped.date) : null,
        party_id: entity_result.matched_party_id,
        vehicle_id: entity_result.matched_vehicle_id,
        product_id: entity_result.matched_product_id,
        product_quantity: mapped.product_quantity
          ? String(mapped.product_quantity)
          : null,
        party_name:
          entity_result.new_party_name ??
          (mapped.party_name ? String(mapped.party_name) : null),
        vehicle_number:
          entity_result.new_vehicle_number ??
          (mapped.vehicle_number ? String(mapped.vehicle_number) : null),
        product_name:
          entity_result.new_product_name ??
          (mapped.product_name ? String(mapped.product_name) : null),
      };

      const hash = compute_delivery_hash(dup_input);

      updates.push({
        id: row.id,
        mapped_data,
        hash,
        dup_input,
        status: 'pending',
        issues: all_issues.length > 0 ? all_issues : null,
        duplicate_score: 0,
        ...entity_result,
      });
    }

    // Within-file duplicate detection: require near-exact match (0.98+)
    // because two deliveries on the same date/party/vehicle/product
    // with different quantities are legitimate separate trips
    for (let i = 0; i < updates.length; i++) {
      if (updates[i].status !== 'pending') continue;
      for (let j = 0; j < i; j++) {
        if (updates[j].status === 'skipped') continue;
        const score = compute_duplicate_score(
          updates[i].dup_input,
          updates[j].dup_input
        );
        if (score > updates[i].duplicate_score) {
          updates[i].duplicate_score = score;
        }
        if (score >= 0.98) {
          updates[i].status = 'duplicate';
          break;
        }
      }
    }

    // Check against existing delivery slips in DB (looser threshold 0.85)
    const pending_updates = updates.filter((u) => u.status === 'pending');
    if (pending_updates.length > 0) {
      const db_scores = await find_db_duplicate_scores(pending_updates);
      for (const update of updates) {
        const db_score = db_scores.get(update.id);
        if (db_score != null && db_score > update.duplicate_score) {
          update.duplicate_score = db_score;
        }
        if (update.status === 'pending' && update.duplicate_score >= 0.85) {
          update.status = 'duplicate';
        }
      }
    }

    // Write updates in chunks, merging duplicate_score into match_confidence
    const UPDATE_CHUNK = 100;
    for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
      const chunk = updates.slice(i, i + UPDATE_CHUNK);
      await Promise.all(
        chunk.map((u) => {
          const confidence = u.match_confidence
            ? { ...u.match_confidence, duplicate: u.duplicate_score }
            : u.duplicate_score > 0
              ? {
                  party: 0,
                  vehicle: 0,
                  product: 0,
                  duplicate: u.duplicate_score,
                }
              : null;
          return db
            .update(import_row)
            .set({
              mapped_data: u.mapped_data,
              hash: u.hash,
              status: u.status,
              issues: u.issues,
              matched_party_id: u.matched_party_id,
              matched_vehicle_id: u.matched_vehicle_id,
              matched_product_id: u.matched_product_id,
              match_confidence: confidence,
              new_party_name: u.new_party_name,
              new_vehicle_number: u.new_vehicle_number,
              new_product_name: u.new_product_name,
            })
            .where(eq(import_row.id, u.id));
        })
      );
    }

    // Recompute stats
    const stats = compute_stats(updates);
    await db
      .update(import_session)
      .set({ status: 'reviewing', stats })
      .where(eq(import_session.id, session_id));

    return { session_id, stats };
  }
);

// ─── List Import Rows ─────────────────────────────────────────────

export const list_import_rows = query(
  v.object({
    session_id: v.string(),
    status: v.optional(
      v.union([
        v.picklist(['pending', 'approved', 'skipped', 'saved', 'duplicate']),
        v.array(
          v.picklist(['pending', 'approved', 'skipped', 'saved', 'duplicate'])
        ),
      ])
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  }),
  async ({ session_id, status, limit = 20, offset = 0 }) => {
    const conditions = [eq(import_row.session_id, session_id)];

    if (status) {
      // Expand 'skipped' to also include legacy 'discarded' rows
      const expand = (s: string) =>
        s === 'skipped' ? ['skipped', 'discarded'] : [s];
      const statuses = (Array.isArray(status) ? status : [status]).flatMap(
        expand
      );
      conditions.push(
        inArray(
          import_row.status,
          statuses as typeof import_row.status.enumValues
        )
      );
    }

    const [rows, [total_result]] = await Promise.all([
      db
        .select()
        .from(import_row)
        .where(and(...conditions))
        .orderBy(import_row.row_index)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(import_row)
        .where(and(...conditions)),
    ]);

    return {
      rows,
      total: total_result?.count ?? 0,
      limit,
      offset,
    };
  }
);

// ─── Find Duplicate Matches ───────────────────────────────────────

export const find_duplicate_matches = query(
  v.object({
    row_id: v.string(),
    session_id: v.string(),
  }),
  async ({ row_id, session_id }) => {
    const [target] = await db
      .select()
      .from(import_row)
      .where(
        and(eq(import_row.id, row_id), eq(import_row.session_id, session_id))
      )
      .limit(1);

    if (!target) return { matches: [] };

    const mapped = target.mapped_data as Record<string, unknown>;
    const target_date = mapped?.date ? String(mapped.date) : null;
    if (!target_date) return { matches: [] };

    const target_input: DuplicateCheckInput = {
      date: target_date,
      party_id: target.matched_party_id,
      vehicle_id: target.matched_vehicle_id,
      product_id: target.matched_product_id,
      product_quantity: mapped?.product_quantity
        ? String(mapped.product_quantity)
        : null,
      party_name:
        target.new_party_name ??
        (mapped?.party_name ? String(mapped.party_name) : null),
      vehicle_number:
        target.new_vehicle_number ??
        (mapped?.vehicle_number ? String(mapped.vehicle_number) : null),
      product_name:
        target.new_product_name ??
        (mapped?.product_name ? String(mapped.product_name) : null),
    };

    type MatchResult = {
      source: 'import' | 'database';
      score: number;
      date: string | null;
      party_name: string | null;
      vehicle_number: string | null;
      product_name: string | null;
      product_quantity: string | null;
      row_index?: number;
      delivery_id?: string;
    };

    const matches: MatchResult[] = [];

    // Within-import: load other rows with same date
    const same_date_rows = await db
      .select()
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          ne(import_row.id, row_id),
          ne(import_row.status, 'skipped')
        )
      )
      .orderBy(import_row.row_index);

    for (const other of same_date_rows) {
      const other_mapped = other.mapped_data as Record<string, unknown>;
      if (!other_mapped) continue;
      const other_date = other_mapped.date ? String(other_mapped.date) : null;
      if (other_date !== target_date) continue;

      const other_input: DuplicateCheckInput = {
        date: other_date,
        party_id: other.matched_party_id,
        vehicle_id: other.matched_vehicle_id,
        product_id: other.matched_product_id,
        product_quantity: other_mapped.product_quantity
          ? String(other_mapped.product_quantity)
          : null,
        party_name:
          other.new_party_name ??
          (other_mapped.party_name ? String(other_mapped.party_name) : null),
        vehicle_number:
          other.new_vehicle_number ??
          (other_mapped.vehicle_number
            ? String(other_mapped.vehicle_number)
            : null),
        product_name:
          other.new_product_name ??
          (other_mapped.product_name
            ? String(other_mapped.product_name)
            : null),
      };

      const score = compute_duplicate_score(target_input, other_input);
      if (score >= 0.8) {
        matches.push({
          source: 'import',
          score,
          date: other_date,
          party_name: other_mapped.party_name
            ? String(other_mapped.party_name)
            : null,
          vehicle_number: other_mapped.vehicle_number
            ? String(other_mapped.vehicle_number)
            : null,
          product_name: other_mapped.product_name
            ? String(other_mapped.product_name)
            : null,
          product_quantity: other_mapped.product_quantity
            ? String(other_mapped.product_quantity)
            : null,
          row_index: other.row_index,
        });
      }
    }

    // DB delivery slips with same date
    const slips = await db
      .select({
        id: delivery_slip.id,
        date: delivery_slip.date,
        party_id: delivery_slip.party_id,
        vehicle_id: delivery_slip.vehicle_id,
        product_id: delivery_slip.product_id,
        product_quantity: delivery_slip.product_quantity,
        party_name: customer.name,
        vehicle_number: vehicle.number_plate,
        product_name: product.name,
      })
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .where(eq(delivery_slip.date, target_date));

    for (const slip of slips) {
      const score = compute_duplicate_score(target_input, {
        date: slip.date,
        party_id: slip.party_id,
        vehicle_id: slip.vehicle_id,
        product_id: slip.product_id,
        product_quantity: slip.product_quantity,
        party_name: slip.party_name,
        vehicle_number: slip.vehicle_number,
        product_name: slip.product_name,
      });

      if (score >= 0.8) {
        matches.push({
          source: 'database',
          score,
          date: slip.date,
          party_name: slip.party_name,
          vehicle_number: slip.vehicle_number,
          product_name: slip.product_name,
          product_quantity: slip.product_quantity,
          delivery_id: slip.id,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return { matches: matches.slice(0, 5) };
  }
);

// ─── Review Import Rows ───────────────────────────────────────────

export const review_import_rows = command(
  v.object({
    session_id: v.string(),
    decisions: v.array(
      v.object({
        row_id: v.string(),
        action: v.picklist(['approve', 'skip']),
        party_id: v.optional(v.nullable(v.string())),
        vehicle_id: v.optional(v.nullable(v.string())),
        product_id: v.optional(v.nullable(v.string())),
        new_party_name: v.optional(v.nullable(v.string())),
        new_vehicle_number: v.optional(v.nullable(v.string())),
        new_product_name: v.optional(v.nullable(v.string())),
      })
    ),
  }),
  async ({ session_id, decisions }) => {
    await Promise.all(
      decisions.map((d) => {
        const set: Record<string, unknown> = {
          status: d.action === 'approve' ? 'approved' : 'skipped',
        };
        if (d.party_id !== undefined) set.matched_party_id = d.party_id;
        if (d.vehicle_id !== undefined) set.matched_vehicle_id = d.vehicle_id;
        if (d.product_id !== undefined) set.matched_product_id = d.product_id;
        if (d.new_party_name !== undefined)
          set.new_party_name = d.new_party_name;
        if (d.new_vehicle_number !== undefined)
          set.new_vehicle_number = d.new_vehicle_number;
        if (d.new_product_name !== undefined)
          set.new_product_name = d.new_product_name;

        return db
          .update(import_row)
          .set(set)
          .where(
            and(
              eq(import_row.id, d.row_id),
              eq(import_row.session_id, session_id)
            )
          );
      })
    );

    // Refresh stats
    await refresh_session_stats(session_id);

    return { success: true };
  }
);

// ─── Bulk Actions (all rows, not just current page) ──────────────

export const bulk_action_all_rows = command(
  v.object({
    session_id: v.string(),
    action: v.picklist(['approve', 'skip']),
    filter: v.optional(
      v.picklist(['all', 'clean', 'with_issues', 'duplicates'])
    ),
  }),
  async ({ session_id, action, filter = 'all' }) => {
    const target_status = action === 'approve' ? 'approved' : 'skipped';

    const conditions = [
      eq(import_row.session_id, session_id),
      eq(import_row.status, 'pending'),
    ];

    if (filter === 'clean') {
      conditions.push(
        sql`(${import_row.issues} IS NULL OR jsonb_array_length(${import_row.issues}) = 0)`
      );
    } else if (filter === 'with_issues') {
      conditions.push(
        sql`${import_row.issues} IS NOT NULL AND jsonb_array_length(${import_row.issues}) > 0`
      );
    } else if (filter === 'duplicates') {
      // For duplicates, target the duplicate status instead of pending
      conditions.pop(); // remove pending filter
      conditions.push(eq(import_row.status, 'duplicate'));
    }

    const result = await db
      .update(import_row)
      .set({ status: target_status })
      .where(and(...conditions))
      .returning({ id: import_row.id });

    await refresh_session_stats(session_id);
    return { updated: result.length };
  }
);

// ─── Recover Skipped Rows ─────────────────────────────────────────

export const recover_skipped_rows = command(
  v.object({
    session_id: v.string(),
    row_ids: v.array(v.string()),
  }),
  async ({ session_id, row_ids }) => {
    if (row_ids.length === 0) return { updated: 0 };

    await db
      .update(import_row)
      .set({ status: 'pending' })
      .where(
        and(
          eq(import_row.session_id, session_id),
          inArray(import_row.id, row_ids),
          inArray(import_row.status, ['skipped', 'discarded'])
        )
      );

    await refresh_session_stats(session_id);
    return { updated: row_ids.length };
  }
);

// ─── Save Approved Rows ───────────────────────────────────────────

export const save_approved_rows = command(
  v.object({
    session_id: v.string(),
    limit: v.optional(v.number()),
  }),
  async ({ session_id, limit = 50 }) => {
    const rows = await db
      .select()
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          eq(import_row.status, 'approved')
        )
      )
      .orderBy(import_row.row_index)
      .limit(limit);

    if (rows.length === 0) {
      return { saved: 0, remaining: 0 };
    }

    // Prepare slip values and identify failures before the transaction
    const entities_to_create = collect_new_entities(rows);

    const slip_prep = prepare_slip_values(rows, entities_to_create);

    // Run entity creation + delivery slip inserts + status updates in a transaction
    await db.transaction(async (tx) => {
      // Create new entities
      const created_ids = await create_new_entities_tx(tx, entities_to_create);

      // Resolve entity IDs in slip values
      const slip_values = resolve_slip_entity_ids(
        slip_prep.slips,
        rows,
        created_ids
      );

      // Mark rows with invalid dates as skipped
      if (slip_prep.failed_row_ids.length > 0) {
        await tx
          .update(import_row)
          .set({ status: 'skipped' })
          .where(inArray(import_row.id, slip_prep.failed_row_ids));
      }

      // Insert delivery slips in small chunks
      if (slip_values.length > 0) {
        const CHUNK = 20;
        for (let i = 0; i < slip_values.length; i += CHUNK) {
          await tx
            .insert(delivery_slip)
            .values(slip_values.slice(i, i + CHUNK));
        }
      }

      // Mark successfully inserted rows as saved
      const saved_row_ids = rows
        .filter((r) => !slip_prep.failed_row_ids.includes(r.id))
        .map((r) => r.id);

      if (saved_row_ids.length > 0) {
        await tx
          .update(import_row)
          .set({ status: 'saved' })
          .where(inArray(import_row.id, saved_row_ids));
      }
    });

    // Post-transaction: propagate entity IDs and refresh stats
    await propagate_entity_ids(session_id);

    const stats = await refresh_session_stats(session_id);
    const remaining_pending = await db
      .select({ count: count() })
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          inArray(import_row.status, ['pending', 'approved'])
        )
      );

    const pending_count = remaining_pending[0]?.count ?? 0;
    if (pending_count === 0) {
      await db
        .update(import_session)
        .set({ status: 'completed' })
        .where(eq(import_session.id, session_id));
    }

    return {
      saved: rows.length - slip_prep.failed_row_ids.length,
      remaining: pending_count,
      stats,
    };
  }
);

// ─── Delete Import Session ────────────────────────────────────────

export const delete_import_session = command(
  v.object({ id: v.string() }),
  async ({ id }) => {
    await db.delete(import_session).where(eq(import_session.id, id));
  }
);

// ─── New Entities ─────────────────────────────────────────────────

export const list_new_entities = query(
  v.object({ session_id: v.string() }),
  async ({ session_id }) => {
    const rows = await db
      .select({
        id: import_row.id,
        status: import_row.status,
        new_party_name: import_row.new_party_name,
        new_vehicle_number: import_row.new_vehicle_number,
        new_product_name: import_row.new_product_name,
        matched_party_id: import_row.matched_party_id,
        matched_vehicle_id: import_row.matched_vehicle_id,
        matched_product_id: import_row.matched_product_id,
      })
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          inArray(import_row.status, ['pending', 'approved'])
        )
      );

    const parties = new Map<string, { name: string; row_count: number }>();
    const vehicles = new Map<
      string,
      { number_plate: string; row_count: number }
    >();
    const products = new Map<string, { name: string; row_count: number }>();

    for (const row of rows) {
      if (row.new_party_name && !row.matched_party_id) {
        const key = row.new_party_name.trim().toUpperCase();
        const existing = parties.get(key);
        if (existing) {
          existing.row_count++;
        } else {
          parties.set(key, { name: row.new_party_name, row_count: 1 });
        }
      }
      if (row.new_vehicle_number && !row.matched_vehicle_id) {
        const key = row.new_vehicle_number
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
        const existing = vehicles.get(key);
        if (existing) {
          existing.row_count++;
        } else {
          vehicles.set(key, {
            number_plate: row.new_vehicle_number,
            row_count: 1,
          });
        }
      }
      if (row.new_product_name && !row.matched_product_id) {
        const key = row.new_product_name.trim().toUpperCase();
        const existing = products.get(key);
        if (existing) {
          existing.row_count++;
        } else {
          products.set(key, { name: row.new_product_name, row_count: 1 });
        }
      }
    }

    // Load existing entities for link suggestions
    const [all_parties, all_vehicles, all_products] = await Promise.all([
      db.select({ id: customer.id, name: customer.name }).from(customer),
      db
        .select({ id: vehicle.id, number_plate: vehicle.number_plate })
        .from(vehicle),
      db.select({ id: product.id, name: product.name }).from(product),
    ]);

    return {
      parties: add_link_and_merge_suggestions(
        [...parties.values()],
        (p) => p.name,
        all_parties,
        (e) => e.name,
        (e) => ({ id: e.id, label: e.name })
      ),
      vehicles: add_link_and_merge_suggestions(
        [...vehicles.values()],
        (v) => v.number_plate,
        all_vehicles,
        (e) => e.number_plate,
        (e) => ({ id: e.id, label: e.number_plate }),
        normalize_vehicle_number
      ),
      products: add_link_and_merge_suggestions(
        [...products.values()],
        (p) => p.name,
        all_products,
        (e) => e.name,
        (e) => ({ id: e.id, label: e.name })
      ),
    };
  }
);

/**
 * Link a "new entity" across all rows in a session to an existing entity.
 * E.g., user decides "CHOPDA EN..." should map to existing party "Chopda Enterprise".
 */
export const resolve_new_entity = command(
  v.object({
    session_id: v.string(),
    entity_type: v.picklist(['party', 'vehicle', 'product']),
    new_value: v.string(),
    existing_id: v.string(),
  }),
  async ({ session_id, entity_type, new_value, existing_id }) => {
    const pending_rows = await db
      .select({ id: import_row.id })
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          inArray(import_row.status, ['pending', 'approved'])
        )
      );

    const row_ids = pending_rows.map((r) => r.id);
    if (row_ids.length === 0) return { updated: 0 };

    let updated = 0;

    if (entity_type === 'party') {
      const rows_to_update = await db
        .select({ id: import_row.id })
        .from(import_row)
        .where(
          and(
            eq(import_row.session_id, session_id),
            inArray(import_row.status, ['pending', 'approved']),
            eq(import_row.new_party_name, new_value)
          )
        );
      if (rows_to_update.length > 0) {
        await db
          .update(import_row)
          .set({ matched_party_id: existing_id, new_party_name: null })
          .where(
            inArray(
              import_row.id,
              rows_to_update.map((r) => r.id)
            )
          );
        updated = rows_to_update.length;
      }
    } else if (entity_type === 'vehicle') {
      const rows_to_update = await db
        .select({ id: import_row.id })
        .from(import_row)
        .where(
          and(
            eq(import_row.session_id, session_id),
            inArray(import_row.status, ['pending', 'approved']),
            eq(import_row.new_vehicle_number, new_value)
          )
        );
      if (rows_to_update.length > 0) {
        await db
          .update(import_row)
          .set({ matched_vehicle_id: existing_id, new_vehicle_number: null })
          .where(
            inArray(
              import_row.id,
              rows_to_update.map((r) => r.id)
            )
          );
        updated = rows_to_update.length;
      }
    } else if (entity_type === 'product') {
      const rows_to_update = await db
        .select({ id: import_row.id })
        .from(import_row)
        .where(
          and(
            eq(import_row.session_id, session_id),
            inArray(import_row.status, ['pending', 'approved']),
            eq(import_row.new_product_name, new_value)
          )
        );
      if (rows_to_update.length > 0) {
        await db
          .update(import_row)
          .set({ matched_product_id: existing_id, new_product_name: null })
          .where(
            inArray(
              import_row.id,
              rows_to_update.map((r) => r.id)
            )
          );
        updated = rows_to_update.length;
      }
    }

    return { updated };
  }
);

/**
 * Merge multiple new entity names into one canonical name.
 * All rows referencing any of the source names get updated.
 */
export const merge_new_entities = command(
  v.object({
    session_id: v.string(),
    entity_type: v.picklist(['party', 'vehicle', 'product']),
    source_values: v.array(v.string()),
    target_name: v.string(),
  }),
  async ({ session_id, entity_type, source_values, target_name }) => {
    if (source_values.length === 0) return { updated: 0 };

    const col =
      entity_type === 'party'
        ? import_row.new_party_name
        : entity_type === 'vehicle'
          ? import_row.new_vehicle_number
          : import_row.new_product_name;

    const rows_to_update = await db
      .select({ id: import_row.id })
      .from(import_row)
      .where(
        and(
          eq(import_row.session_id, session_id),
          inArray(import_row.status, ['pending', 'approved']),
          inArray(col, source_values)
        )
      );

    if (rows_to_update.length === 0) return { updated: 0 };

    const set: Record<string, unknown> = {};
    if (entity_type === 'party') set.new_party_name = target_name;
    else if (entity_type === 'vehicle') set.new_vehicle_number = target_name;
    else set.new_product_name = target_name;

    await db
      .update(import_row)
      .set(set)
      .where(
        inArray(
          import_row.id,
          rows_to_update.map((r) => r.id)
        )
      );

    return { updated: rows_to_update.length };
  }
);

// ─── Helpers ──────────────────────────────────────────────────────

function base64_to_array_buffer(base64: string): ArrayBuffer {
  const idx = base64.indexOf(',');
  const pure = idx >= 0 ? base64.slice(idx + 1) : base64;
  const binary = atob(pure);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function resolve_entities(
  mapped: Record<string, unknown>,
  all_parties: { id: string; name: string }[],
  all_vehicles: { id: string; number_plate: string }[],
  all_products: { id: string; name: string }[],
  new_parties: Map<string, string>,
  new_vehicles: Map<string, string>,
  new_products: Map<string, string>
) {
  let matched_party_id: string | null = null;
  let matched_vehicle_id: string | null = null;
  let matched_product_id: string | null = null;
  let match_confidence: {
    party: number;
    vehicle: number;
    product: number;
  } | null = null;
  let new_party_name: string | null = null;
  let new_vehicle_number: string | null = null;
  let new_product_name: string | null = null;

  const party_name = mapped.party_name ? String(mapped.party_name).trim() : '';
  const vehicle_number = mapped.vehicle_number
    ? String(mapped.vehicle_number).trim()
    : '';
  const product_name = mapped.product_name
    ? String(mapped.product_name).trim()
    : '';

  let party_score = 0;
  let vehicle_score = 0;
  let product_score = 0;

  // Match party
  if (party_name) {
    const match = find_name_match(party_name, all_parties, (p) => p.name);
    if (match) {
      matched_party_id = match.item.id;
      party_score = match.score;
    } else {
      const fuzzy_key = find_fuzzy_map_key(
        party_name,
        new_parties,
        normalize_string,
        0.85
      );
      if (fuzzy_key) {
        new_party_name = new_parties.get(fuzzy_key) ?? party_name;
      } else {
        const key = normalize_string(party_name);
        new_parties.set(key, party_name);
        new_party_name = party_name;
      }
    }
  }

  // Match vehicle
  if (vehicle_number) {
    const match = find_vehicle_match(
      vehicle_number,
      all_vehicles,
      (v) => v.number_plate
    );
    if (match) {
      matched_vehicle_id = match.item.id;
      vehicle_score = match.score;
    } else {
      const fuzzy_key = find_fuzzy_map_key(
        vehicle_number,
        new_vehicles,
        normalize_vehicle_number,
        0.9
      );
      if (fuzzy_key) {
        new_vehicle_number = new_vehicles.get(fuzzy_key) ?? vehicle_number;
      } else {
        const key = normalize_vehicle_number(vehicle_number);
        new_vehicles.set(key, vehicle_number);
        new_vehicle_number = vehicle_number;
      }
    }
  }

  // Match product
  if (product_name) {
    const match = find_name_match(product_name, all_products, (p) => p.name);
    if (match) {
      matched_product_id = match.item.id;
      product_score = match.score;
    } else {
      const fuzzy_key = find_fuzzy_map_key(
        product_name,
        new_products,
        normalize_string,
        0.85
      );
      if (fuzzy_key) {
        new_product_name = new_products.get(fuzzy_key) ?? product_name;
      } else {
        const key = normalize_string(product_name);
        new_products.set(key, product_name);
        new_product_name = product_name;
      }
    }
  }

  if (party_name || vehicle_number || product_name) {
    match_confidence = {
      party: party_score,
      vehicle: vehicle_score,
      product: product_score,
    };
  }

  return {
    matched_party_id,
    matched_vehicle_id,
    matched_product_id,
    match_confidence,
    new_party_name,
    new_vehicle_number,
    new_product_name,
  };
}

/**
 * Find duplicate scores for import rows against existing DB delivery slips.
 * Groups by date for efficient querying, then scores each candidate.
 */
async function find_db_duplicate_scores(
  updates: { id: string; dup_input: DuplicateCheckInput }[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Group updates by valid date for batch querying
  const by_date = new Map<string, typeof updates>();
  for (const u of updates) {
    const d = u.dup_input.date;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const group = by_date.get(d) ?? [];
    group.push(u);
    by_date.set(d, group);
  }

  // Query DB slips for each date batch
  for (const [date_val, group] of by_date) {
    const slips = await db
      .select({
        date: delivery_slip.date,
        party_id: delivery_slip.party_id,
        vehicle_id: delivery_slip.vehicle_id,
        product_id: delivery_slip.product_id,
        product_quantity: delivery_slip.product_quantity,
        party_name: customer.name,
        vehicle_number: vehicle.number_plate,
        product_name: product.name,
      })
      .from(delivery_slip)
      .leftJoin(customer, eq(delivery_slip.party_id, customer.id))
      .leftJoin(vehicle, eq(delivery_slip.vehicle_id, vehicle.id))
      .leftJoin(product, eq(delivery_slip.product_id, product.id))
      .where(eq(delivery_slip.date, date_val));

    for (const update of group) {
      let best = scores.get(update.id) ?? 0;
      for (const slip of slips) {
        const score = compute_duplicate_score(update.dup_input, {
          date: slip.date,
          party_id: slip.party_id,
          vehicle_id: slip.vehicle_id,
          product_id: slip.product_id,
          product_quantity: slip.product_quantity,
          party_name: slip.party_name,
          vehicle_number: slip.vehicle_number,
          product_name: slip.product_name,
        });
        if (score > best) best = score;
      }
      if (best > 0) scores.set(update.id, best);
    }
  }

  return scores;
}

function compute_stats(
  updates: { status: string; issues: RowIssue[] | null }[]
): ImportStats {
  let valid = 0;
  let skipped = 0;
  let issue_rows = 0;
  let duplicates = 0;

  for (const u of updates) {
    if (u.status === 'skipped') {
      skipped++;
    } else if (u.status === 'duplicate') {
      duplicates++;
    } else {
      valid++;
    }
    if (u.issues && u.issues.length > 0) {
      issue_rows++;
    }
  }

  return {
    total_rows: updates.length,
    valid_rows: valid,
    pending_rows: valid,
    approved_rows: 0,
    skipped_rows: skipped,
    issue_rows: issue_rows,
    duplicate_rows: duplicates,
    saved_rows: 0,
  };
}

function collect_new_entities(rows: (typeof import_row.$inferSelect)[]) {
  const parties = new Map<string, string>(); // normalized -> display name
  const vehicles = new Map<string, string>();
  const products = new Map<string, string>();

  for (const row of rows) {
    if (row.new_party_name && !row.matched_party_id) {
      const key = row.new_party_name.trim().toUpperCase();
      if (!parties.has(key)) parties.set(key, row.new_party_name);
    }
    if (row.new_vehicle_number && !row.matched_vehicle_id) {
      const key = row.new_vehicle_number
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (!vehicles.has(key)) vehicles.set(key, row.new_vehicle_number);
    }
    if (row.new_product_name && !row.matched_product_id) {
      const key = row.new_product_name.trim().toUpperCase();
      if (!products.has(key)) products.set(key, row.new_product_name);
    }
  }

  return { parties, vehicles, products };
}

async function create_new_entities(entities: {
  parties: Map<string, string>;
  vehicles: Map<string, string>;
  products: Map<string, string>;
}) {
  const result = {
    parties: new Map<string, string>(), // normalized key -> id
    vehicles: new Map<string, string>(),
    products: new Map<string, string>(),
  };

  if (entities.parties.size > 0) {
    const values = [...entities.parties.entries()].map(([_, name]) => ({
      name,
    }));
    const created = await db
      .insert(customer)
      .values(values)
      .returning({ id: customer.id, name: customer.name });
    for (const c of created) {
      result.parties.set(c.name.trim().toUpperCase(), c.id);
    }
  }

  if (entities.vehicles.size > 0) {
    const values = [...entities.vehicles.entries()].map(([_, plate]) => ({
      number_plate: plate,
    }));
    const created = await db
      .insert(vehicle)
      .values(values)
      .returning({ id: vehicle.id, number_plate: vehicle.number_plate });
    for (const v of created) {
      result.vehicles.set(
        v.number_plate
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ''),
        v.id
      );
    }
  }

  if (entities.products.size > 0) {
    const values = [...entities.products.entries()].map(([_, name]) => ({
      name,
    }));
    const created = await db
      .insert(product)
      .values(values)
      .returning({ id: product.id, name: product.name });
    for (const p of created) {
      result.products.set(p.name.trim().toUpperCase(), p.id);
    }
  }

  return result;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type NewEntitiesMap = {
  parties: Map<string, string>;
  vehicles: Map<string, string>;
  products: Map<string, string>;
};

type CreatedIdsMap = {
  parties: Map<string, string>;
  vehicles: Map<string, string>;
  products: Map<string, string>;
};

function prepare_slip_values(
  rows: (typeof import_row.$inferSelect)[],
  _entities: NewEntitiesMap
) {
  const slips: {
    row_id: string;
    date: string;
    royalty_number: string | null;
    royalty_quantity: string | null;
    product_quantity: string;
    metadata: Record<string, unknown>;
  }[] = [];
  const failed_row_ids: string[] = [];

  for (const row of rows) {
    const mapped = row.mapped_data as Record<string, unknown>;
    const raw_date = String(mapped.date ?? '');
    const date_val = normalize_date(raw_date);
    const row_metadata = (mapped._metadata as Record<string, unknown>) ?? {};

    if (!date_val) {
      failed_row_ids.push(row.id);
      continue;
    }

    slips.push({
      row_id: row.id,
      date: date_val,
      royalty_number: mapped.royalty_number
        ? String(mapped.royalty_number)
        : null,
      royalty_quantity: mapped.royalty_quantity
        ? String(mapped.royalty_quantity)
        : null,
      product_quantity: String(mapped.product_quantity ?? '0'),
      metadata: Object.keys(row_metadata).length > 0 ? row_metadata : {},
    });
  }

  return { slips, failed_row_ids };
}

function resolve_slip_entity_ids(
  slips: ReturnType<typeof prepare_slip_values>['slips'],
  rows: (typeof import_row.$inferSelect)[],
  created_ids: CreatedIdsMap
): (typeof delivery_slip.$inferInsert)[] {
  return slips.map((slip) => {
    const row = rows.find((r) => r.id === slip.row_id)!;

    let party_id = row.matched_party_id;
    let vehicle_id = row.matched_vehicle_id;
    let product_id = row.matched_product_id;

    if (!party_id && row.new_party_name) {
      party_id =
        created_ids.parties.get(row.new_party_name.trim().toUpperCase()) ??
        null;
    }
    if (!vehicle_id && row.new_vehicle_number) {
      vehicle_id =
        created_ids.vehicles.get(
          row.new_vehicle_number
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
        ) ?? null;
    }
    if (!product_id && row.new_product_name) {
      product_id =
        created_ids.products.get(row.new_product_name.trim().toUpperCase()) ??
        null;
    }

    return {
      date: slip.date,
      party_id,
      vehicle_id,
      product_id,
      royalty_number: slip.royalty_number,
      royalty_quantity: slip.royalty_quantity,
      product_quantity: slip.product_quantity,
      product_quantity_unit: 'tonne' as const,
      state: 'pending' as const,
      metadata: slip.metadata,
    };
  });
}

async function create_new_entities_tx(
  tx: Tx,
  entities: NewEntitiesMap
): Promise<CreatedIdsMap> {
  const result: CreatedIdsMap = {
    parties: new Map(),
    vehicles: new Map(),
    products: new Map(),
  };

  if (entities.parties.size > 0) {
    const values = [...entities.parties.entries()].map(([_, name]) => ({
      name,
    }));
    const created = await tx
      .insert(customer)
      .values(values)
      .returning({ id: customer.id, name: customer.name });
    for (const c of created) {
      result.parties.set(c.name.trim().toUpperCase(), c.id);
    }
  }

  if (entities.vehicles.size > 0) {
    const values = [...entities.vehicles.entries()].map(([_, plate]) => ({
      number_plate: plate,
    }));
    const created = await tx
      .insert(vehicle)
      .values(values)
      .returning({ id: vehicle.id, number_plate: vehicle.number_plate });
    for (const v of created) {
      result.vehicles.set(
        v.number_plate
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, ''),
        v.id
      );
    }
  }

  if (entities.products.size > 0) {
    const values = [...entities.products.entries()].map(([_, name]) => ({
      name,
    }));
    const created = await tx
      .insert(product)
      .values(values)
      .returning({ id: product.id, name: product.name });
    for (const p of created) {
      result.products.set(p.name.trim().toUpperCase(), p.id);
    }
  }

  return result;
}

async function refresh_session_stats(session_id: string): Promise<ImportStats> {
  const status_counts = await db
    .select({
      status: import_row.status,
      count: count(),
    })
    .from(import_row)
    .where(eq(import_row.session_id, session_id))
    .groupBy(import_row.status);

  const counts: Record<string, number> = {};
  for (const { status, count: c } of status_counts) {
    counts[status] = c;
  }

  const issue_count_result = await db
    .select({ count: count() })
    .from(import_row)
    .where(
      and(
        eq(import_row.session_id, session_id),
        sql`${import_row.issues} IS NOT NULL AND jsonb_array_length(${import_row.issues}) > 0`
      )
    );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const stats: ImportStats = {
    total_rows: total,
    valid_rows:
      (counts['pending'] ?? 0) +
      (counts['approved'] ?? 0) +
      (counts['saved'] ?? 0),
    pending_rows: counts['pending'] ?? 0,
    approved_rows: counts['approved'] ?? 0,
    skipped_rows: (counts['skipped'] ?? 0) + (counts['discarded'] ?? 0),
    issue_rows: issue_count_result[0]?.count ?? 0,
    duplicate_rows: counts['duplicate'] ?? 0,
    saved_rows: counts['saved'] ?? 0,
  };

  await db
    .update(import_session)
    .set({ stats })
    .where(eq(import_session.id, session_id));

  return stats;
}

/**
 * After creating new entities, re-match ALL remaining rows against the
 * full set of entities in the DB (not just the ones created in this batch).
 * Uses fuzzy matching so typos still resolve correctly.
 */
async function propagate_entity_ids(session_id: string) {
  const [all_parties, all_vehicles, all_products] = await Promise.all([
    db.select({ id: customer.id, name: customer.name }).from(customer),
    db
      .select({ id: vehicle.id, number_plate: vehicle.number_plate })
      .from(vehicle),
    db.select({ id: product.id, name: product.name }).from(product),
  ]);

  const remaining = await db
    .select({
      id: import_row.id,
      new_party_name: import_row.new_party_name,
      new_vehicle_number: import_row.new_vehicle_number,
      new_product_name: import_row.new_product_name,
      matched_party_id: import_row.matched_party_id,
      matched_vehicle_id: import_row.matched_vehicle_id,
      matched_product_id: import_row.matched_product_id,
    })
    .from(import_row)
    .where(
      and(
        eq(import_row.session_id, session_id),
        inArray(import_row.status, ['pending', 'approved'])
      )
    );

  const updates: Promise<unknown>[] = [];

  for (const row of remaining) {
    const set: Record<string, unknown> = {};
    let needs_update = false;

    if (row.new_party_name && !row.matched_party_id) {
      const match = find_name_match(
        row.new_party_name,
        all_parties,
        (p) => p.name
      );
      if (match) {
        set.matched_party_id = match.item.id;
        set.new_party_name = null;
        needs_update = true;
      }
    }

    if (row.new_vehicle_number && !row.matched_vehicle_id) {
      const match = find_vehicle_match(
        row.new_vehicle_number,
        all_vehicles,
        (v) => v.number_plate
      );
      if (match) {
        set.matched_vehicle_id = match.item.id;
        set.new_vehicle_number = null;
        needs_update = true;
      }
    }

    if (row.new_product_name && !row.matched_product_id) {
      const match = find_name_match(
        row.new_product_name,
        all_products,
        (p) => p.name
      );
      if (match) {
        set.matched_product_id = match.item.id;
        set.new_product_name = null;
        needs_update = true;
      }
    }

    if (needs_update) {
      updates.push(
        db.update(import_row).set(set).where(eq(import_row.id, row.id))
      );
    }
  }

  if (updates.length > 0) {
    const CHUNK = 50;
    for (let i = 0; i < updates.length; i += CHUNK) {
      await Promise.all(updates.slice(i, i + CHUNK));
    }
  }
}

/**
 * For a list of new entities, find:
 * 1. Which ones are similar to each other (merge suggestions)
 * 2. Which existing DB entities they might match (link suggestions)
 */
function add_link_and_merge_suggestions<T extends { row_count: number }, E>(
  items: T[],
  get_label: (item: T) => string,
  existing_entities: E[],
  get_existing_label: (item: E) => string,
  format_existing: (item: E) => { id: string; label: string },
  normalize_fn: (s: string) => string = normalize_string
): (T & {
  similar_to?: string[];
  suggested_link?: { id: string; label: string; score: number };
})[] {
  const result = items.map((item) => ({
    ...item,
    similar_to: undefined as string[] | undefined,
    suggested_link: undefined as
      | { id: string; label: string; score: number }
      | undefined,
  }));

  for (let i = 0; i < result.length; i++) {
    const label_i = normalize_fn(get_label(result[i]));

    // Merge suggestions (similar new entities)
    const similar: string[] = [];
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const label_j = normalize_fn(get_label(result[j]));
      if (similarity_score(label_i, label_j) >= 0.7) {
        similar.push(get_label(result[j]));
      }
    }
    if (similar.length > 0) result[i].similar_to = similar;

    // Link suggestions (similar existing entities)
    let best_link: { id: string; label: string; score: number } | undefined;
    for (const existing of existing_entities) {
      const existing_label = normalize_fn(get_existing_label(existing));
      const score = similarity_score(label_i, existing_label);
      if (score >= 0.6 && (!best_link || score > best_link.score)) {
        const formatted = format_existing(existing);
        best_link = { ...formatted, score };
      }
    }
    if (best_link) result[i].suggested_link = best_link;
  }

  return result;
}

function similarity_score(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // If one string starts with the other, it's very likely a truncated version
  if (a.startsWith(b) || b.startsWith(a)) return 0.9;

  // If one fully contains the other as a substring
  if (a.includes(b) || b.includes(a)) return 0.85;

  // Levenshtein
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return 1 - dp[m][n] / maxLen;
}

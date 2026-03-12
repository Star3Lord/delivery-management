import { browser } from '$app/environment';
import {
  create_import_session,
  get_import_session,
  confirm_column_mapping,
  list_import_rows,
  review_import_rows,
  save_approved_rows,
  bulk_action_all_rows,
  delete_import_session,
} from '$lib/api/import.remote';
import type {
  ColumnMapping,
  ImportStats,
  RowDecision,
} from '$lib/utils/import/types';

const STORAGE_KEY = 'import_session_id';

type Session = Awaited<ReturnType<typeof get_import_session>>;
type ImportRow = Awaited<ReturnType<typeof list_import_rows>>['rows'][number];

function read_stored_session_id(): string | null {
  if (!browser) return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store_session_id(id: string | null) {
  if (!browser) return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable
  }
}

export class ImportState {
  session_id = $state<string | null>(null);
  session = $state<Session>(null);
  current_batch = $state.raw<ImportRow[]>([]);
  batch_total = $state(0);
  batch_page = $state(0);
  batch_size = 20;
  loading = $state(false);
  error = $state<string | null>(null);
  initialized = $state(false);
  /** Increments on every server mutation so child components can react */
  version = $state(0);

  get step(): 1 | 2 {
    if (!this.session) return 1;
    const s = this.session.status;
    if (s === 'mapping' || s === 'processing') return 1;
    return 2;
  }

  get stats(): ImportStats | null {
    return (this.session?.stats as ImportStats) ?? null;
  }

  get raw_headers(): string[] {
    return (this.session?.raw_headers as string[]) ?? [];
  }

  get suggested_mapping(): ColumnMapping {
    return (this.session?.suggested_mapping as ColumnMapping) ?? {};
  }

  get sample_rows(): Record<string, unknown>[] {
    return (this.session?.sample_rows as Record<string, unknown>[]) ?? [];
  }

  get column_mapping(): ColumnMapping {
    return (
      (this.session?.column_mapping as ColumnMapping) ?? this.suggested_mapping
    );
  }

  get is_processing(): boolean {
    return this.session?.status === 'processing';
  }

  get is_completed(): boolean {
    return this.session?.status === 'completed';
  }

  get can_proceed_to_stage2(): boolean {
    if (!this.session) return false;
    const mapping = this.column_mapping;
    const values = Object.values(mapping);
    return (
      values.includes('date') &&
      values.includes('product_name') &&
      values.includes('product_quantity')
    );
  }

  /**
   * Try to restore session from localStorage or URL param.
   * Call once on mount.
   */
  async init(url_session_id?: string | null) {
    if (this.initialized) return;
    this.initialized = true;

    const id = url_session_id || read_stored_session_id();
    if (id) {
      await this.load_session(id);
    }
  }

  async load_session(id: string) {
    this.loading = true;
    this.error = null;
    try {
      const session = await get_import_session({ id });
      if (!session) {
        store_session_id(null);
        this.error = 'Session not found or expired';
        return;
      }
      this.session = session;
      this.session_id = session.id;
      store_session_id(session.id);

      if (session.status === 'reviewing' || session.status === 'completed') {
        await this.load_batch(0);
      }
    } catch (e) {
      store_session_id(null);
      this.error = e instanceof Error ? e.message : 'Failed to load session';
    } finally {
      this.loading = false;
    }
  }

  async upload_file(file: File) {
    this.loading = true;
    this.error = null;
    try {
      const base64 = await file_to_base64(file);
      const session = await create_import_session({
        file_name: file.name,
        file_data: base64,
      });
      this.session = session;
      this.session_id = session.id;
      store_session_id(session.id);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to parse file';
    } finally {
      this.loading = false;
    }
  }

  async confirm_mapping(mapping: ColumnMapping) {
    if (!this.session_id) return;
    this.loading = true;
    this.error = null;
    try {
      await confirm_column_mapping({
        session_id: this.session_id,
        mapping,
      });
      await this.reload_session();
      await this.load_batch(0);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to confirm mapping';
    } finally {
      this.loading = false;
    }
  }

  async load_batch(page: number, status_filter?: string | string[]) {
    if (!this.session_id) return;
    this.loading = true;
    try {
      const result = await list_import_rows({
        session_id: this.session_id,
        status: status_filter as undefined,
        limit: this.batch_size,
        offset: page * this.batch_size,
      });
      this.current_batch = result.rows;
      this.batch_total = result.total;
      this.batch_page = page;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load rows';
    } finally {
      this.loading = false;
    }
  }

  async review_batch(decisions: RowDecision[]) {
    if (!this.session_id) return;
    this.loading = true;
    this.error = null;
    try {
      await review_import_rows({
        session_id: this.session_id,
        decisions,
      });
      await this.reload_session();
      await this.load_batch(0, 'pending');
      this.version++;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to review rows';
    } finally {
      this.loading = false;
    }
  }

  async save_approved() {
    if (!this.session_id) return;
    this.loading = true;
    this.error = null;
    try {
      let total_saved = 0;
      let remaining = 1;

      while (remaining > 0) {
        const result = await save_approved_rows({
          session_id: this.session_id,
          limit: 100,
        });
        total_saved += result.saved;
        remaining = result.remaining;
        if (result.saved === 0) break;
      }

      await this.reload_session();
      await this.load_batch(this.batch_page, 'pending');
      this.version++;

      if (this.is_completed) {
        store_session_id(null);
      }

      return { saved: total_saved, remaining: 0 };
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to save rows';
    } finally {
      this.loading = false;
    }
  }

  async bulk_action(
    action: 'approve' | 'skip',
    filter?: 'all' | 'clean' | 'with_issues' | 'duplicates'
  ) {
    if (!this.session_id) return;
    this.loading = true;
    this.error = null;
    try {
      const result = await bulk_action_all_rows({
        session_id: this.session_id,
        action,
        filter,
      });
      await this.reload_session();
      await this.load_batch(0, 'pending');
      this.version++;
      return result;
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Failed to perform bulk action';
    } finally {
      this.loading = false;
    }
  }

  async reset() {
    if (this.session_id) {
      try {
        await delete_import_session({ id: this.session_id });
      } catch {
        // Ignore
      }
    }
    store_session_id(null);
    this.session = null;
    this.session_id = null;
    this.current_batch = [];
    this.batch_total = 0;
    this.batch_page = 0;
    this.error = null;
  }

  private async reload_session() {
    if (!this.session_id) return;
    const session = await get_import_session({ id: this.session_id });
    if (session) this.session = session;
  }
}

function file_to_base64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

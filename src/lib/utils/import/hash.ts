/**
 * Delivery slip duplicate detection.
 *
 * Uses entity IDs where available for exact matching,
 * falls back to fuzzy name comparison for unresolved entities.
 */

import {
  similarity,
  normalize_string,
  normalize_vehicle_number,
} from './fuzzy-match';

export interface DuplicateCheckInput {
  date: string | null;
  party_id?: string | null;
  vehicle_id?: string | null;
  product_id?: string | null;
  product_quantity?: string | null;
  party_name?: string | null;
  vehicle_number?: string | null;
  product_name?: string | null;
}

/**
 * Compute a duplicate score between 0 and 1 for two delivery records.
 * 1.0 = certain duplicate, 0.0 = completely different.
 *
 * Scoring:
 * - Date must match exactly (if not, score = 0)
 * - Product quantity near-match gives base score
 * - Entity matches (by ID or fuzzy name) add to score
 */
export function compute_duplicate_score(
  a: DuplicateCheckInput,
  b: DuplicateCheckInput
): number {
  if (!a.date || !b.date || a.date !== b.date) return 0;

  let score = 0;
  let weights = 0;

  // Quantity match (weight: 3) -- strongest differentiator
  // Two deliveries with different quantities are almost certainly different
  const qty_a = parse_qty(a.product_quantity);
  const qty_b = parse_qty(b.product_quantity);
  if (qty_a != null && qty_b != null) {
    const qty_diff = Math.abs(qty_a - qty_b);
    // Only score as match if quantities are within 0.5% of each other
    const qty_score =
      qty_diff <= 0.01
        ? 1
        : qty_diff / Math.max(qty_a, qty_b) < 0.005
          ? 0.9
          : 0;
    score += qty_score * 3;
    weights += 3;
  }

  // Party match (weight: 2)
  const party_score = match_entity(
    a.party_id,
    b.party_id,
    a.party_name,
    b.party_name,
    normalize_string
  );
  if (party_score != null) {
    score += party_score * 2;
    weights += 2;
  }

  // Vehicle match (weight: 1.5)
  const vehicle_score = match_entity(
    a.vehicle_id,
    b.vehicle_id,
    a.vehicle_number,
    b.vehicle_number,
    normalize_vehicle_number
  );
  if (vehicle_score != null) {
    score += vehicle_score * 1.5;
    weights += 1.5;
  }

  // Product match (weight: 1.5)
  const product_score = match_entity(
    a.product_id,
    b.product_id,
    a.product_name,
    b.product_name,
    normalize_string
  );
  if (product_score != null) {
    score += product_score * 1.5;
    weights += 1.5;
  }

  return weights > 0 ? score / weights : 0;
}

function match_entity(
  id_a: string | null | undefined,
  id_b: string | null | undefined,
  name_a: string | null | undefined,
  name_b: string | null | undefined,
  normalize: (s: string) => string
): number | null {
  if (id_a && id_b) return id_a === id_b ? 1 : 0;
  if (id_a && name_b) return null; // can't compare ID to name
  if (name_a && id_b) return null;

  const na = name_a ? normalize(name_a) : '';
  const nb = name_b ? normalize(name_b) : '';
  if (!na && !nb) return null;
  if (!na || !nb) return 0;
  return similarity(na, nb);
}

function parse_qty(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * Build a simple hash for fast exact-match pre-filtering.
 * Uses entity IDs where available.
 */
export function compute_delivery_hash(input: DuplicateCheckInput): string {
  const parts = [
    input.date ?? '',
    input.party_id ?? normalize_string(input.party_name ?? ''),
    input.vehicle_id ?? normalize_vehicle_number(input.vehicle_number ?? ''),
    input.product_id ?? normalize_string(input.product_name ?? ''),
    String(parse_qty(input.product_quantity) ?? ''),
  ];
  return string_hash(parts.join('|'));
}

function string_hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

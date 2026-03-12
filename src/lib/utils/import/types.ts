/**
 * Delivery fields that map directly to delivery_slip table columns.
 */
export const DELIVERY_FIELDS = [
  'date',
  'vehicle_number',
  'product_name',
  'party_name',
  'product_quantity',
  'royalty_number',
  'royalty_quantity',
] as const;

export type DeliveryField = (typeof DELIVERY_FIELDS)[number];

export const DELIVERY_FIELD_LABELS: Record<DeliveryField, string> = {
  date: 'Date',
  vehicle_number: 'Vehicle',
  product_name: 'Product',
  party_name: 'Party',
  product_quantity: 'Quantity',
  royalty_number: 'Royalty Number',
  royalty_quantity: 'Royalty Quantity',
};

export const REQUIRED_FIELDS: DeliveryField[] = [
  'date',
  'product_name',
  'product_quantity',
];

/**
 * A mapping target is either a delivery field, a metadata key (prefixed
 * with "metadata:"), or null (skip this column entirely).
 */
export type MappingTarget = DeliveryField | `metadata:${string}` | null;

export interface ColumnMapping {
  [fileHeader: string]: MappingTarget;
}

export function is_delivery_field(
  target: MappingTarget
): target is DeliveryField {
  return target !== null && !target.startsWith('metadata:');
}

export function is_metadata_field(
  target: MappingTarget
): target is `metadata:${string}` {
  return target !== null && target.startsWith('metadata:');
}

export function get_metadata_key(target: `metadata:${string}`): string {
  return target.slice('metadata:'.length);
}

export interface RowIssue {
  field: string;
  type: 'invalid' | 'missing' | 'unparseable';
  message: string;
  original_value?: unknown;
}

export interface ParsedRow {
  row_index: number;
  raw_data: Record<string, unknown>;
  issues: RowIssue[];
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  suggested_mapping: ColumnMapping;
  sample_rows: Record<string, unknown>[];
  stats: ImportStats;
}

export interface ImportStats {
  total_rows: number;
  valid_rows: number;
  pending_rows: number;
  approved_rows: number;
  skipped_rows: number;
  issue_rows: number;
  duplicate_rows: number;
  saved_rows: number;
}

export interface RowDecision {
  row_id: string;
  action: 'approve' | 'skip';
  party_id?: string | null;
  vehicle_id?: string | null;
  product_id?: string | null;
  new_party_name?: string | null;
  new_vehicle_name?: string | null;
  new_product_name?: string | null;
}

export type ImportSessionStatus =
  | 'mapping'
  | 'processing'
  | 'reviewing'
  | 'completed'
  | 'cancelled';

export type ImportRowStatus =
  | 'pending'
  | 'approved'
  | 'skipped'
  | 'saved'
  | 'duplicate';

export interface FuzzyMatch<T = unknown> {
  item: T;
  score: number;
}

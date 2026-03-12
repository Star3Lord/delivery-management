import {
  DELIVERY_FIELDS,
  is_delivery_field,
  is_metadata_field,
  get_metadata_key,
} from './types';
import type { DeliveryField, ColumnMapping, MappingTarget } from './types';

/**
 * Synonym map: each delivery field has a list of header names that
 * should auto-map to it. All values are stored uppercase for comparison.
 */
/**
 * Headers that should auto-map to specific metadata keys.
 */
const METADATA_SYNONYMS: Record<string, string[]> = {
  RST: ['RST', 'RST NO', 'RST NO.', 'RST NUMBER'],
};

const SYNONYMS: Record<DeliveryField, string[]> = {
  date: ['DATE', 'DT', 'DELIVERY DATE', 'SLIP DATE'],
  vehicle_number: [
    'VEHICLE NO',
    'VEHICLE NO.',
    'VEHICLE NUMBER',
    'VEHICLE',
    'TRUCK NO',
    'TRUCK NO.',
    'TRUCK',
  ],
  product_name: ['ITEM', 'PRODUCT', 'MATERIAL', 'PRODUCT NAME', 'ITEM NAME'],
  party_name: [
    'TRANSPORT',
    'TRANSPORTER',
    'PARTY',
    'CUSTOMER',
    'PARTY NAME',
    'CUSTOMER NAME',
    'TRANSPORT NAME',
  ],
  product_quantity: [
    'QTY',
    'QUANTITY',
    'PRODUCT QTY',
    'PRODUCT QUANTITY',
    'WEIGHT',
    'WT',
  ],
  royalty_number: ['ROYALTY', 'ROYALTY NO', 'ROYALTY NO.', 'ROYALTY NUMBER'],
  royalty_quantity: [
    'ROYALTY QTY',
    'ROYALTY QUANTITY',
    'ROYALTY MT',
    'ROYALTY WT',
  ],
};

function normalize_header(header: string): string {
  return header.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Given raw file headers, produce a suggested mapping.
 * Recognized headers -> delivery field.
 * Unrecognized non-empty headers -> metadata:<header_name>.
 * Empty/placeholder headers -> null (skip).
 */
export function suggest_column_mapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used_fields = new Set<DeliveryField>();

  for (const header of headers) {
    const normalized = normalize_header(header);
    let matched: DeliveryField | null = null;

    for (const [field, synonyms] of Object.entries(SYNONYMS) as [
      DeliveryField,
      string[],
    ][]) {
      if (used_fields.has(field)) continue;
      if (synonyms.includes(normalized)) {
        matched = field;
        break;
      }
    }

    if (matched) {
      mapping[header] = matched;
      used_fields.add(matched);
    } else if (is_empty_header(header)) {
      mapping[header] = null;
    } else {
      // Check if it matches a known metadata synonym
      let metadata_key: string | null = null;
      for (const [key, synonyms] of Object.entries(METADATA_SYNONYMS)) {
        if (synonyms.includes(normalized)) {
          metadata_key = key;
          break;
        }
      }
      mapping[header] = `metadata:${metadata_key ?? header}`;
    }
  }

  return mapping;
}

function is_empty_header(header: string): boolean {
  const trimmed = header.trim();
  return !trimmed || trimmed.startsWith('__EMPTY');
}

/**
 * Apply a column mapping to a raw row, producing:
 * - mapped data keyed by delivery field names
 * - metadata object for metadata-mapped columns
 */
export function apply_column_mapping(
  raw_data: Record<string, unknown>,
  mapping: ColumnMapping
): { fields: Record<string, unknown>; metadata: Record<string, unknown> } {
  const fields: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};

  for (const [header, target] of Object.entries(mapping)) {
    if (target == null || raw_data[header] == null) continue;

    if (is_delivery_field(target)) {
      fields[target] = raw_data[header];
    } else if (is_metadata_field(target)) {
      const key = get_metadata_key(target);
      metadata[key] = raw_data[header];
    }
  }

  return { fields, metadata };
}

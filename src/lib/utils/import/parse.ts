import * as XLSX from 'xlsx';
import { suggest_column_mapping } from './column-mapping';
import type {
  ParsedRow,
  ParseResult,
  RowIssue,
  ColumnMapping,
  ImportStats,
} from './types';

const MAX_SAMPLE_ROWS = 10;

/**
 * Parse an Excel or CSV file buffer into structured data.
 * Discards empty columns and validates royalty fields.
 */
export function parse_file(
  buffer: ArrayBuffer,
  file_name: string
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet_name = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheet_name];

  const raw_rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });

  if (raw_rows.length === 0) {
    return empty_result();
  }

  const all_headers = Object.keys(raw_rows[0]);
  const headers = discard_empty_columns(all_headers, raw_rows);

  const rows: ParsedRow[] = [];
  let discarded = 0;

  for (let i = 0; i < raw_rows.length; i++) {
    const raw = pick_headers(raw_rows[i], headers);

    if (is_empty_row(raw)) {
      discarded++;
      continue;
    }

    rows.push({
      row_index: i + 1,
      raw_data: raw,
      issues: [],
    });
  }

  const suggested_mapping = suggest_column_mapping(headers);
  const sample_rows = rows.slice(0, MAX_SAMPLE_ROWS).map((r) => r.raw_data);

  const stats: ImportStats = {
    total_rows: raw_rows.length,
    valid_rows: rows.length,
    pending_rows: rows.length,
    approved_rows: 0,
    skipped_rows: discarded,
    issue_rows: 0,
    duplicate_rows: 0,
    saved_rows: 0,
  };

  return { headers, rows, suggested_mapping, sample_rows, stats };
}

/**
 * Validate royalty fields on mapped data.
 * Royalty is only valid when number is numerical+non-zero AND quantity is numerical+non-zero.
 */
export function validate_royalty(mapped: Record<string, unknown>): {
  royalty_number: string | null;
  royalty_quantity: string | null;
  issues: RowIssue[];
} {
  const issues: RowIssue[] = [];
  const raw_number = mapped.royalty_number;
  const raw_quantity = mapped.royalty_quantity;

  let royalty_number: string | null = null;
  let royalty_quantity: string | null = null;

  const num_str = raw_number != null ? String(raw_number).trim() : '';
  const qty_str = raw_quantity != null ? String(raw_quantity).trim() : '';

  const num_parsed = Number(num_str);
  const qty_parsed = Number(qty_str);

  const num_valid =
    num_str.length > 0 && !isNaN(num_parsed) && num_parsed !== 0;
  const qty_valid =
    qty_str.length > 0 && !isNaN(qty_parsed) && qty_parsed !== 0;

  if (num_valid && qty_valid) {
    royalty_number = num_str;
    royalty_quantity = qty_str;
  } else {
    if (num_str.length > 0 && !num_valid) {
      issues.push({
        field: 'royalty_number',
        type: 'invalid',
        message: `Unparseable or zero royalty number: "${num_str}"`,
        original_value: raw_number,
      });
    }
    if (qty_str.length > 0 && !qty_valid) {
      issues.push({
        field: 'royalty_quantity',
        type: 'invalid',
        message: `Unparseable or zero royalty quantity: "${qty_str}"`,
        original_value: raw_quantity,
      });
    }
    if (
      (num_str.length > 0 || qty_str.length > 0) &&
      !(num_valid && qty_valid)
    ) {
      issues.push({
        field: 'royalty',
        type: 'missing',
        message:
          'Royalty requires both a valid numeric non-zero number and quantity',
        original_value: { number: raw_number, quantity: raw_quantity },
      });
    }
  }

  return { royalty_number, royalty_quantity, issues };
}

/**
 * Validate required fields are present and non-empty in mapped data.
 */
export function validate_mapped_row(
  mapped: Record<string, unknown>,
  mapping: ColumnMapping
): RowIssue[] {
  const issues: RowIssue[] = [];

  const has_date = mapped.date != null && String(mapped.date).trim().length > 0;
  if (!has_date) {
    issues.push({
      field: 'date',
      type: 'missing',
      message: 'Date is required',
    });
  }

  const has_product =
    mapped.product_name != null &&
    String(mapped.product_name).trim().length > 0;
  if (!has_product) {
    issues.push({
      field: 'product_name',
      type: 'missing',
      message: 'Product is required',
    });
  }

  const qty_str =
    mapped.product_quantity != null
      ? String(mapped.product_quantity).trim()
      : '';
  const qty_parsed = Number(qty_str);
  if (!qty_str || isNaN(qty_parsed) || qty_parsed <= 0) {
    issues.push({
      field: 'product_quantity',
      type: qty_str ? 'invalid' : 'missing',
      message: qty_str
        ? `Invalid product quantity: "${qty_str}"`
        : 'Product quantity is required',
      original_value: mapped.product_quantity,
    });
  }

  return issues;
}

/**
 * Normalize a date value from various formats to YYYY-MM-DD.
 * Handles: YYYY-MM-DD, DD-MM-YY, DD-MM-YYYY, DD/MM/YY, DD/MM/YYYY,
 *          DD.MM.YY, DD.MM.YYYY, and native Date objects.
 */
export function normalize_date(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return format_date(value);
  }

  const str = String(value).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return validate_date_string(str) ? str : null;
  }

  // DD-MM-YY or DD-MM-YYYY (with -, /, or . separators)
  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);

    // 2-digit year
    if (year < 100) year += 2000;

    // Swap if day > 12 and month <= 12 (it's DD-MM-YY)
    // If both are <= 12, assume DD-MM-YY (Indian format)
    // If day <= 12 and month > 12, it's MM-DD-YY
    if (day > 12 && month <= 12) {
      // Already DD-MM-YY, correct
    } else if (day <= 12 && month > 12) {
      // Actually MM-DD-YY format
      [day, month] = [month, day];
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return validate_date_string(result) ? result : null;
  }

  // Try native Date parsing as fallback
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
    return format_date(d);
  }

  return null;
}

function format_date(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validate_date_string(str: string): boolean {
  const parts = str.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31)
    return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function discard_empty_columns(
  headers: string[],
  rows: Record<string, unknown>[]
): string[] {
  return headers.filter((h) => {
    if (!h || !h.trim()) {
      const has_values = rows.some(
        (r) => r[h] != null && String(r[h]).trim() !== ''
      );
      return has_values;
    }
    return true;
  });
}

function pick_headers(
  row: Record<string, unknown>,
  headers: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const h of headers) {
    result[h] = row[h];
  }
  return result;
}

function is_empty_row(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v == null || String(v).trim() === '');
}

function empty_result(): ParseResult {
  return {
    headers: [],
    rows: [],
    suggested_mapping: {},
    sample_rows: [],
    stats: {
      total_rows: 0,
      valid_rows: 0,
      pending_rows: 0,
      approved_rows: 0,
      skipped_rows: 0,
      issue_rows: 0,
      duplicate_rows: 0,
      saved_rows: 0,
    },
  };
}

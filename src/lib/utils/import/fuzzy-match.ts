import type { FuzzyMatch } from './types';

const DEFAULT_THRESHOLD = 0.75;

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Normalized similarity score between 0 and 1.
 * 1 = exact match, 0 = completely different.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export function normalize_string(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalize vehicle number plate by stripping all non-alphanumeric chars.
 * "CG 06 GW 1923" -> "CG06GW1923"
 */
export function normalize_vehicle_number(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Find the best fuzzy match for a query string among candidates.
 */
export function find_best_match<T>(
  query: string,
  candidates: T[],
  get_label: (item: T) => string,
  options?: {
    threshold?: number;
    normalize?: (s: string) => string;
  }
): FuzzyMatch<T> | null {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const norm = options?.normalize ?? normalize_string;

  const normalized_query = norm(query);
  if (!normalized_query) return null;

  let best: FuzzyMatch<T> | null = null;

  for (const item of candidates) {
    const label = norm(get_label(item));
    const score = similarity(normalized_query, label);

    if (score >= threshold && (!best || score > best.score)) {
      best = { item, score };
    }
  }

  return best;
}

/**
 * Find the best vehicle match, using plate normalization.
 */
export function find_vehicle_match<T>(
  query: string,
  candidates: T[],
  get_plate: (item: T) => string,
  threshold = DEFAULT_THRESHOLD
): FuzzyMatch<T> | null {
  return find_best_match(query, candidates, get_plate, {
    threshold,
    normalize: normalize_vehicle_number,
  });
}

/**
 * Find the best name match (party or product).
 */
export function find_name_match<T>(
  query: string,
  candidates: T[],
  get_name: (item: T) => string,
  threshold = DEFAULT_THRESHOLD
): FuzzyMatch<T> | null {
  return find_best_match(query, candidates, get_name, { threshold });
}

/**
 * Find the best matching key in a Map, using fuzzy comparison.
 * Used to consolidate "CHOPDA EN..." and "CHOPDA EN.." into one entry.
 */
export function find_fuzzy_map_key(
  query: string,
  map: Map<string, string>,
  normalize: (s: string) => string = normalize_string,
  threshold = 0.85
): string | null {
  const norm_query = normalize(query);
  if (!norm_query) return null;

  let best_key: string | null = null;
  let best_score = 0;

  for (const key of map.keys()) {
    const score = similarity(norm_query, normalize(key));
    if (score >= threshold && score > best_score) {
      best_key = key;
      best_score = score;
    }
  }

  return best_key;
}

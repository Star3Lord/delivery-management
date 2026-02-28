import { formatDateTime } from './format';

// const parseISOString = (s: string) => {
//   const b = s.split(/\D+/);
//   return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
// };

export const atTimeFormat = (formatedDateTime: string) =>
  formatedDateTime.replace(
    /, ((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm]))/,
    (t) => t.replace(',', ' at')
  );

export const hm12 = (date?: string | number | Date, timezone?: string) =>
  date
    ? formatDateTime(new Date(date), {
        hour: 'numeric',
        minute: 'numeric',
        ...(timezone && { timeZone: timezone }),
      })
    : undefined;

export const mdhm12 = (date?: string | number | Date) =>
  date
    ? atTimeFormat(
        formatDateTime(new Date(date), {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        })
      )
    : undefined;

export const fullShortDateTime = (
  date?: string | number | Date,
  timezone?: string
) =>
  date
    ? atTimeFormat(
        formatDateTime(new Date(date), {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          ...(timezone && { timeZone: timezone }),
        })
      )
    : undefined;

export const fullLongDateTime = (
  date?: string | number | Date,
  timezone?: string
) =>
  date
    ? atTimeFormat(
        formatDateTime(new Date(date), {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          ...(timezone && { timeZone: timezone }),
        })
      )
    : undefined;

export const fullShortDate = (
  date?: string | number | Date,
  timezone?: string
) =>
  date
    ? formatDateTime(new Date(date), {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(timezone && { timeZone: timezone }),
      })
    : undefined;

const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 31536000000 },
  { unit: 'month', ms: 2628000000 },
  { unit: 'day', ms: 86400000 },
  { unit: 'hour', ms: 3600000 },
  { unit: 'minute', ms: 60000 },
  { unit: 'second', ms: 1000 },
];
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Get language-sensitive relative time message from elapsed time.
 * @param elapsed   - the elapsed time in milliseconds
 */
export function relativeTimeFromElapsed(elapsed: number): string {
  for (const { unit, ms } of units) {
    if (Math.abs(elapsed) >= ms || unit === 'second') {
      return rtf.format(Math.round(elapsed / ms), unit);
    }
  }
  return '';
}

/**
 * Get language-sensitive relative time message from Dates.
 * @param relative  - the relative dateTime, generally is in the past or future
 * @param pivot     - the dateTime of reference, generally is the current time
 */
export function formatRelativeDate(
  relative: Date | null,
  pivot: Date = new Date()
): string {
  if (!relative || isNaN(relative.getTime())) return '';
  const elapsed = relative.getTime() - pivot.getTime();
  return relativeTimeFromElapsed(elapsed);
}

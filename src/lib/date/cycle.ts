/**
 * Date cycle helpers — control-ingresos
 *
 * Pure utility functions for date arithmetic that complements the financial
 * engine in src/engine/cycle.ts (which is card-cycle specific).
 *
 * All functions are deterministic; `today` is always a parameter.
 */

/** Returns the day-of-month (1-31) for the given date. */
export function dayOfMonth(date: Date): number {
  return date.getDate();
}

/**
 * Find the next occurrence of a given day-of-month on or after `from`.
 * If the day-of-month does not exist in a month (e.g. 31 in Feb), it
 * clamps to the LAST day of that month.
 */
export function nextOccurrence(
  from: Date,
  targetDay: number,
): Date {
  const result = new Date(from.getTime());
  result.setHours(0, 0, 0, 0);

  const fromDay = result.getDate();
  if (fromDay < targetDay) {
    // Try this month first.
    const candidate = new Date(result.getTime());
    candidate.setDate(targetDay);
    if (candidate.getDate() === targetDay) {
      return candidate;
    }
    // Day doesn't exist this month (e.g. 31 in Feb) — fall through to next.
  }
  // Move to next month, day 1, then advance.
  result.setMonth(result.getMonth() + 1, 1);
  result.setHours(0, 0, 0, 0);
  const candidate = new Date(result.getTime());
  candidate.setDate(targetDay);
  if (candidate.getDate() !== targetDay) {
    // Clamp to last day of the month.
    candidate.setDate(0);
  }
  return candidate;
}

/** Whole-day count between two dates (b - a). Truncates time components. */
export function daysBetween(a: Date, b: Date): number {
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const ms = bMid.getTime() - aMid.getTime();
  return Math.round(ms / 86_400_000);
}

/** Add `n` days to `date`, returning a new Date (does not mutate). */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** Add `n` months to `date`, clamping to the last valid day of target month. */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const originalDay = d.getDate();
  // Set to the first of the current month to avoid month overflow when
  // adding (e.g. Jan 31 + 1 month must not roll over into March).
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  // Now find the last day of the target month.
  const lastDayOfTargetMonth = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  // Clamp original day to the target month's last day.
  d.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return d;
}

/** Returns true if both dates fall on the same calendar day (local TZ). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

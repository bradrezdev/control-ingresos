/**
 * Date formatting utilities — control-ingresos
 *
 * Long and relative formats use the Spanish (es) locale; numeric short
 * formats are locale-agnostic. Pure: no internal Date.now() calls.
 */
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const DEFAULT_LOCALE = es;

/**
 * Format a date with the "es-MX" long-style pattern.
 *
 *   formatDate(new Date(2026, 5, 4)) -> "4 de junio de 2026"
 *   formatDate("2026-06-04T12:00:00Z") -> parses ISO, then formats
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: DEFAULT_LOCALE });
}

/**
 * Short numeric date format DD/MM/YYYY. Tokens are numeric and don't
 * require a locale — useful for compact UI like table columns.
 *
 *   formatShortDate(new Date(2026, 6, 27)) -> "27/07/2026"
 *   formatShortDate("2026-06-04") -> "04/06/2026"
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/** Format a month as "Junio 2026" or "Jun 2026" depending on length. */
export function formatMonth(monthIso: string, style: "long" | "short" = "long"): string {
  // monthIso expected as "YYYY-MM" — derive a Date from it.
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthIso;
  // Use the first of the month to avoid TZ edge cases.
  const d = new Date(year, month - 1, 1);
  return format(d, style === "long" ? "MMMM yyyy" : "MMM yyyy", {
    locale: DEFAULT_LOCALE,
  });
}

/**
 * Human-friendly relative date. e.g. "hace 2 horas", "en 3 días".
 * Useful for transactions list and notifications.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: DEFAULT_LOCALE,
  });
}

/** ISO short date (YYYY-MM-DD) for inputs. Always uses local TZ. */
export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts an engine date (UTC midnight, e.g. from `computeActivePaymentDate`)
 * into a local-calendar Date with the same year/month/day, so the local
 * formatters in this module render the engine's intended calendar day in
 * any timezone.
 *
 *   utcDateToLocal(new Date("2026-11-22T00:00:00.000Z"))
 *     -> local midnight of November 22, 2026
 */
export function utcDateToLocal(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Parse a "YYYY-MM" month string to a Date at the first of that month. */
export function monthIsoToDate(monthIso: string): Date {
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error(`Invalid month ISO: ${monthIso}`);
  }
  return new Date(year, month - 1, 1);
}

/** Inverse of `monthIsoToDate` — "2026-06". */
export function dateToMonthIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Capitalises the first letter of a Spanish date string (e.g. "viernes"). */
function capitalizeEs(value: string): string {
  return value.replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Long weekday date without year, used for the dashboard header.
 *
 *   formatLongDate(new Date(2026, 5, 4)) -> "Jueves 4 de junio"
 */
export function formatLongDate(date: Date): string {
  return capitalizeEs(format(date, "EEEE d 'de' MMMM", { locale: DEFAULT_LOCALE }));
}

/**
 * Day and month without year, used for due dates.
 *
 *   formatDayAndMonth(new Date(2026, 10, 22)) -> "22 de noviembre"
 */
export function formatDayAndMonth(date: Date): string {
  return format(date, "d 'de' MMMM", { locale: DEFAULT_LOCALE });
}

/**
 * Compact day + short month, used for recent transactions.
 *
 *   formatShortDay(new Date(2026, 7, 6)) -> "6 ago"
 */
export function formatShortDay(date: Date): string {
  return format(date, "d MMM", { locale: DEFAULT_LOCALE }).toLowerCase();
}

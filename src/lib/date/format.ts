/**
 * Date formatting utilities — control-ingresos
 *
 * All functions take a Date (or ISO string) and return a localized string.
 * Locale defaults to es-MX. Pure: no internal Date.now() calls.
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

/** Inverse of monthIsoToDate — "2026-06". */
export function dateToMonthIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

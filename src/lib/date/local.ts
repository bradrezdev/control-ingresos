/**
 * Local date helpers — control-ingresos
 *
 * R-4 (bug 4): cuando un usuario en zona horaria UTC-6 edita una
 * transacción del 2026-06-04, el `new Date("2026-06-04").toISOString()`
 * produce `2026-06-04T06:00:00.000Z`, y al volver a leerla el offset
 * local puede empujar la fecha al día previo. La solución es **no tener
 * zona horaria en absoluto**: date-only strings "YYYY-MM-DD" en storage,
 * y helpers que sólo usan componentes LOCALES.
 *
 * Convención:
 *   - toLocalDateString(Date)   → "YYYY-MM-DD" (componentes LOCALES)
 *   - fromLocalDateString(s)    → Date local-midnight (NO UTC)
 *   - todayLocalDateString()    → "YYYY-MM-DD" de hoy
 *   - normalizeToDateString(s)  → "YYYY-MM-DD" idempotente (strip T... si está)
 *
 * Ninguna función usa `new Date(YYYY-MM-DD)` (eso es UTC en JS).
 * `new Date(y, m-1, d)` es el constructor local correcto.
 */
import { parseISO } from "date-fns";

/** "YYYY-MM-DD" usando componentes LOCALES (no UTC). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inverso: parsea "YYYY-MM-DD" como local-midnight (no UTC). */
export function fromLocalDateString(s: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) throw new Error(`Invalid local date string: ${s}`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Hoy como "YYYY-MM-DD" local. */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}

/**
 * Normaliza un valor ISO datetime o date a date-only "YYYY-MM-DD".
 * Idempotente: si la entrada ya es date-only, retorna igual. Si tiene
 * sufijo "T...", recorta los primeros 10 caracteres. Si es otro formato
 * ISO (con hora, minutos, segundos), usa date-fns parseISO y luego
 * formatea en componentes LOCALES.
 *
 * Usado por el read-through normalizer para filas legacy y por la
 * import-side del backup para limpiar exports antiguos.
 */
export function normalizeToDateString(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Cannot normalize to date: ${value}`);
  }
  return toLocalDateString(d);
}

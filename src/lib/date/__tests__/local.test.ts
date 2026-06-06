/**
 * Local date helpers — control-ingresos
 *
 * R-4 (bug 4): storage must be date-only ("YYYY-MM-DD") with no TZ math.
 * These helpers are the boundary: callers convert between Date objects
 * (in the UI layer) and date-only strings (in the storage layer).
 *
 * `toLocalDateString` uses the Date's LOCAL components (not UTC).
 * `fromLocalDateString` parses "YYYY-MM-DD" as local-midnight, not UTC.
 * `todayLocalDateString` returns today's local date as "YYYY-MM-DD".
 * `normalizeToDateString` is idempotent: strips a "T..." suffix if present.
 */
import { describe, it, expect } from "vitest";
import {
  toLocalDateString,
  fromLocalDateString,
  todayLocalDateString,
  normalizeToDateString,
} from "../local";

describe("toLocalDateString", () => {
  it("formats a Date using its local components", () => {
    // Construimos la fecha en el timezone del runner, no en UTC, para
    // evitar drift de +1 día en zonas UTC-.
    const d = new Date(2026, 5, 4); // 4 jun 2026 local
    expect(toLocalDateString(d)).toBe("2026-06-04");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5); // 5 ene
    expect(toLocalDateString(d)).toBe("2026-01-05");
  });

  it("handles December 31", () => {
    const d = new Date(2026, 11, 31);
    expect(toLocalDateString(d)).toBe("2026-12-31");
  });
});

describe("fromLocalDateString", () => {
  it("parses 'YYYY-MM-DD' as local-midnight", () => {
    const d = fromLocalDateString("2026-06-04");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // 0-indexed
    expect(d.getDate()).toBe(4);
  });

  it("round-trips: toLocalDateString → fromLocalDateString preserves the day", () => {
    const original = new Date(2026, 5, 22, 14, 30, 0);
    const iso = toLocalDateString(original);
    const back = fromLocalDateString(iso);
    expect(back.getDate()).toBe(original.getDate());
    expect(back.getMonth()).toBe(original.getMonth());
    expect(back.getFullYear()).toBe(original.getFullYear());
  });

  it("throws on invalid input", () => {
    expect(() => fromLocalDateString("2026-6-4")).toThrow();
    expect(() => fromLocalDateString("not-a-date")).toThrow();
  });
});

describe("todayLocalDateString", () => {
  it("returns the current local date as 'YYYY-MM-DD'", () => {
    const result = todayLocalDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Round-trip: debe coincidir con toLocalDateString(new Date()).
    expect(result).toBe(toLocalDateString(new Date()));
  });
});

describe("normalizeToDateString", () => {
  it("returns date-only strings unchanged (idempotente)", () => {
    expect(normalizeToDateString("2026-06-04")).toBe("2026-06-04");
  });

  it("strips the 'T...' suffix from datetime strings", () => {
    expect(normalizeToDateString("2026-06-04T00:00:00.000Z")).toBe("2026-06-04");
    expect(normalizeToDateString("2026-06-04T15:30:45.123Z")).toBe("2026-06-04");
  });

  it("handles local datetime strings (no Z)", () => {
    expect(normalizeToDateString("2026-06-04T15:30:00")).toBe("2026-06-04");
  });

  it("is idempotent: applying twice yields the same result", () => {
    const once = normalizeToDateString("2026-06-04T12:00:00.000Z");
    const twice = normalizeToDateString(once);
    expect(once).toBe(twice);
  });
});

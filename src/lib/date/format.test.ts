import { describe, expect, it } from "vitest";
import {
  dateToMonthIso,
  formatDate,
  formatMonth,
  formatRelativeDate,
  formatShortDate,
  monthIsoToDate,
  toIsoDateString,
} from "./format";

describe("formatDate", () => {
  it("formats a Date in Spanish long style", () => {
    const d = new Date(2026, 5, 4); // June 4, 2026
    expect(formatDate(d)).toBe("4 de junio de 2026");
  });

  it("accepts an ISO string", () => {
    expect(formatDate("2026-01-15T12:00:00Z")).toMatch(/15 de enero de 2026/);
  });

  it("handles December correctly", () => {
    const d = new Date(2026, 11, 25);
    expect(formatDate(d)).toBe("25 de diciembre de 2026");
  });
});

describe("formatMonth", () => {
  it("formats '2026-06' as 'junio 2026' by default", () => {
    expect(formatMonth("2026-06")).toBe("junio 2026");
  });

  it("formats in short style as 'jun 2026'", () => {
    expect(formatMonth("2026-06", "short")).toBe("jun 2026");
  });

  it("returns the input unchanged when invalid", () => {
    expect(formatMonth("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRelativeDate", () => {
  it("uses 'hace' for past dates", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
    expect(formatRelativeDate(past)).toMatch(/hace/);
  });

  it("uses 'en' for future dates", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    expect(formatRelativeDate(future)).toMatch(/en/);
  });
});

describe("toIsoDateString", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(toIsoDateString(d)).toBe("2026-01-05");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 8, 9); // Sep 9
    expect(toIsoDateString(d)).toBe("2026-09-09");
  });
});

describe("monthIsoToDate / dateToMonthIso", () => {
  it("round-trips correctly", () => {
    const iso = "2026-06";
    const d = monthIsoToDate(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June (0-indexed)
    expect(dateToMonthIso(d)).toBe(iso);
  });

  it("throws on invalid input", () => {
    expect(() => monthIsoToDate("invalid")).toThrow();
  });
});

describe("formatShortDate", () => {
  it("formats a Date as DD/MM/YYYY", () => {
    const d = new Date(2026, 6, 27); // July 27, 2026
    expect(formatShortDate(d)).toBe("27/07/2026");
  });

  it("accepts an ISO date-only string without shifting the day", () => {
    expect(formatShortDate("2026-01-05")).toBe("05/01/2026");
  });

  it("accepts an ISO timestamp", () => {
    expect(formatShortDate("2026-12-31T12:00:00Z")).toBe("31/12/2026");
  });
});

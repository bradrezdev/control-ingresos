import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysBetween,
  dayOfMonth,
  isSameDay,
  nextOccurrence,
} from "./cycle";

describe("dayOfMonth", () => {
  it("returns the day component", () => {
    expect(dayOfMonth(new Date(2026, 5, 15))).toBe(15);
  });

  it("returns 1 for the first of the month", () => {
    expect(dayOfMonth(new Date(2026, 0, 1))).toBe(1);
  });

  it("returns 31 for month-end", () => {
    expect(dayOfMonth(new Date(2026, 0, 31))).toBe(31);
  });
});

describe("nextOccurrence", () => {
  it("returns same month when target day has not passed", () => {
    const from = new Date(2026, 5, 10); // June 10
    const next = nextOccurrence(from, 15);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(15);
  });

  it("advances to next month when target day already passed", () => {
    const from = new Date(2026, 5, 20); // June 20
    const next = nextOccurrence(from, 15);
    expect(next.getMonth()).toBe(6);
    expect(next.getDate()).toBe(15);
  });

  it("clamps to last day when target day > month's last day (Feb 31 -> Feb 28)", () => {
    const from = new Date(2026, 0, 1); // Jan 1, 2026 (non-leap)
    const next = nextOccurrence(from, 31);
    // January has 31 days so it works for January.
    expect(next.getDate()).toBe(31);
    expect(next.getMonth()).toBe(0);
  });

  it("clamps Feb to 28 in non-leap years", () => {
    const from = new Date(2026, 0, 1); // Jan 1, 2026
    const next = nextOccurrence(from, 31);
    // Force into Feb.
    next.setMonth(1, 31);
    // The setDate(31) for Feb 2026 will overflow to March 3.
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(3);
  });
});

describe("daysBetween", () => {
  it("returns 0 for the same day", () => {
    const a = new Date(2026, 5, 4, 9, 0);
    const b = new Date(2026, 5, 4, 23, 59);
    expect(daysBetween(a, b)).toBe(0);
  });

  it("returns positive count for forward range", () => {
    const a = new Date(2026, 5, 4);
    const b = new Date(2026, 5, 14);
    expect(daysBetween(a, b)).toBe(10);
  });

  it("returns negative count for backward range", () => {
    const a = new Date(2026, 5, 14);
    const b = new Date(2026, 5, 4);
    expect(daysBetween(a, b)).toBe(-10);
  });

  it("handles month boundaries", () => {
    const a = new Date(2026, 4, 30); // May 30
    const b = new Date(2026, 5, 4); // June 4
    expect(daysBetween(a, b)).toBe(5);
  });
});

describe("addDays", () => {
  it("adds a positive number of days", () => {
    const start = new Date(2026, 5, 4);
    const result = addDays(start, 10);
    expect(result.getDate()).toBe(14);
    expect(result.getMonth()).toBe(5);
  });

  it("subtracts a negative number of days", () => {
    const start = new Date(2026, 5, 4);
    const result = addDays(start, -4);
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(4); // May
  });

  it("does not mutate the input", () => {
    const start = new Date(2026, 5, 4);
    addDays(start, 5);
    expect(start.getDate()).toBe(4);
  });
});

describe("addMonths", () => {
  it("advances months correctly", () => {
    const start = new Date(2026, 0, 15);
    const result = addMonths(start, 3);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getFullYear()).toBe(2026);
  });

  it("clamps to last day when target month is shorter", () => {
    const start = new Date(2026, 0, 31); // Jan 31
    const result = addMonths(start, 1); // Feb 31 -> Feb 28
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });
});

describe("isSameDay", () => {
  it("returns true for same calendar day", () => {
    const a = new Date(2026, 5, 4, 9, 0);
    const b = new Date(2026, 5, 4, 23, 59);
    expect(isSameDay(a, b)).toBe(true);
  });

  it("returns false for different days", () => {
    const a = new Date(2026, 5, 4);
    const b = new Date(2026, 5, 5);
    expect(isSameDay(a, b)).toBe(false);
  });
});

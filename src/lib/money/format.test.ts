import { describe, expect, it } from "vitest";
import {
  centsToDisplay,
  displayToCents,
  formatCurrency,
  parseCurrencyInput,
} from "./format";

describe("formatCurrency", () => {
  it("formats MXN with thousand separators and two decimals", () => {
    expect(formatCurrency(123450, "MXN")).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "MXN")).toBe("$0.00");
  });

  it("formats USD with en-US locale (dollar sign prefix, dot decimal)", () => {
    const result = formatCurrency(100000, "USD");
    expect(result).toMatch(/1,000\.00/);
    expect(result).toContain("$");
  });

  it("formats EUR with es-ES locale (symbol suffix, comma decimal)", () => {
    const result = formatCurrency(50000, "EUR");
    expect(result).toMatch(/500,00/);
  });

  it("falls back to '—' for non-finite cents", () => {
    expect(formatCurrency(Number.NaN, "MXN")).toBe("—");
    expect(formatCurrency(Number.POSITIVE_INFINITY, "MXN")).toBe("—");
  });

  it("handles negative cents (refunds, corrections)", () => {
    expect(formatCurrency(-123450, "MXN")).toMatch(/-?1,234\.50/);
  });
});

describe("centsToDisplay", () => {
  it("converts 123450 cents to 1234.5", () => {
    expect(centsToDisplay(123450)).toBe(1234.5);
  });

  it("converts 0 cents to 0", () => {
    expect(centsToDisplay(0)).toBe(0);
  });

  it("handles fractional cents correctly", () => {
    expect(centsToDisplay(99)).toBe(0.99);
  });
});

describe("displayToCents", () => {
  it("converts 1234.5 to 123450 cents", () => {
    expect(displayToCents(1234.5)).toBe(123450);
  });

  it("rounds half-up", () => {
    expect(displayToCents(1234.505)).toBe(123451);
    expect(displayToCents(1234.504)).toBe(123450);
  });

  it("returns 0 for non-finite", () => {
    expect(displayToCents(Number.NaN)).toBe(0);
    expect(displayToCents(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("is inverse of centsToDisplay within rounding tolerance", () => {
    expect(displayToCents(centsToDisplay(123456))).toBe(123456);
  });
});

describe("parseCurrencyInput", () => {
  it("parses '1,234.50' to 123450 cents", () => {
    expect(parseCurrencyInput("1,234.50")).toBe(123450);
  });

  it("parses '1.234,50' (es-MX style) to 123450 cents", () => {
    expect(parseCurrencyInput("1.234,50")).toBe(123450);
  });

  it("parses '1234.5' (no thousand sep) to 123450 cents", () => {
    expect(parseCurrencyInput("1234.5")).toBe(123450);
  });

  it("parses '$1,234.50' (with currency symbol) to 123450 cents", () => {
    expect(parseCurrencyInput("$1,234.50")).toBe(123450);
  });

  it("parses '' to 0", () => {
    expect(parseCurrencyInput("")).toBe(0);
  });

  it("parses null and undefined to 0", () => {
    expect(parseCurrencyInput(null)).toBe(0);
    expect(parseCurrencyInput(undefined)).toBe(0);
  });

  it("parses '  $ 99.00  ' (whitespace) to 9900 cents", () => {
    expect(parseCurrencyInput("  $ 99.00  ")).toBe(9900);
  });

  it("returns 0 for alphabetic input", () => {
    expect(parseCurrencyInput("abc")).toBe(0);
    expect(parseCurrencyInput("1a2b3")).toBe(0);
  });

  it("parses '1234' (no decimal) to 123400 cents", () => {
    expect(parseCurrencyInput("1234")).toBe(123400);
  });

  it("rejects multiple decimal separators", () => {
    expect(parseCurrencyInput("1.2.3")).toBe(0);
  });
});

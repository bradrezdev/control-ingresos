/**
 * isFixedPaymentDueThisMonth — engine tests
 *
 * Verifica la recurrencia de pagos fijos:
 *   - monthly: siempre true
 *   - bimonthly: par (monthsDiff % 2 === 0)
 *   - quarterly: cada 3 (monthsDiff % 3 === 0)
 *
 * Importante: monthsDiff=0 (mismo mes de creación) siempre es true,
 * independientemente del período (mes base).
 */
import { describe, it, expect } from "vitest";
import { isFixedPaymentDueThisMonth } from "../fixedPayments";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

function makeFp(period: FixedPayment["period"], createdAt: string): FixedPayment {
  return {
    id: crypto.randomUUID(),
    amount: 10000, // 100.00 MXN en centavos (no relevante para la recurrencia)
    description: "Test",
    paymentDay: 15,
    period,
    paymentMethod: "cash",
    createdAt,
    updatedAt: createdAt,
  };
}

describe("isFixedPaymentDueThisMonth — monthly", () => {
  const created = "2026-05-15T12:00:00.000Z";

  it("siempre true en el mismo mes de creación", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("monthly", created), new Date("2026-05-20T12:00:00.000Z"))).toBe(true);
  });

  it("true al mes siguiente", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("monthly", created), new Date("2026-06-15T12:00:00.000Z"))).toBe(true);
  });

  it("true 6 meses después", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("monthly", created), new Date("2026-11-15T12:00:00.000Z"))).toBe(true);
  });

  it("true al año siguiente (year crossing)", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("monthly", created), new Date("2027-05-15T12:00:00.000Z"))).toBe(true);
  });
});

describe("isFixedPaymentDueThisMonth — bimonthly", () => {
  const created = "2026-05-15T12:00:00.000Z";

  it("May (monthsDiff=0) → true (mes base)", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2026-05-20T12:00:00.000Z"))).toBe(true);
  });

  it("June (monthsDiff=1) → false", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2026-06-15T12:00:00.000Z"))).toBe(false);
  });

  it("July (monthsDiff=2) → true", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2026-07-15T12:00:00.000Z"))).toBe(true);
  });

  it("August (monthsDiff=3) → false", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2026-08-15T12:00:00.000Z"))).toBe(false);
  });

  it("December (monthsDiff=7) → false", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2026-12-15T12:00:00.000Z"))).toBe(false);
  });

  it("May del año siguiente (monthsDiff=12) → true", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", created), new Date("2027-05-15T12:00:00.000Z"))).toBe(true);
  });
});

describe("isFixedPaymentDueThisMonth — quarterly", () => {
  const created = "2026-05-15T12:00:00.000Z";

  it("May (monthsDiff=0) → true (mes base)", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2026-05-20T12:00:00.000Z"))).toBe(true);
  });

  it("June (monthsDiff=1) → false", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2026-06-15T12:00:00.000Z"))).toBe(false);
  });

  it("July (monthsDiff=2) → false", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2026-07-15T12:00:00.000Z"))).toBe(false);
  });

  it("August (monthsDiff=3) → true", () => {
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2026-08-15T12:00:00.000Z"))).toBe(true);
  });

  it("November (monthsDiff=6) → true (6 % 3 === 0)", () => {
    // Spec original decía "false" pero 6 % 3 === 0 → true. La recurrencia
    // es estrictamente cada 3 meses, no cada 3 meses "con desfase".
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2026-11-15T12:00:00.000Z"))).toBe(true);
  });

  it("February del año siguiente (monthsDiff=9) → true", () => {
    // year crossing: noviembre→febrero cruza año
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", created), new Date("2027-02-15T12:00:00.000Z"))).toBe(true);
  });
});

describe("isFixedPaymentDueThisMonth — mes base (monthsDiff=0)", () => {
  it("monthsDiff=0 es true para cualquier período", () => {
    // createdAt y today en el mismo mes → siempre true
    const today = new Date("2026-06-15T12:00:00.000Z");
    const sameMonthCreated = "2026-06-01T00:00:00.000Z";
    expect(isFixedPaymentDueThisMonth(makeFp("monthly", sameMonthCreated), today)).toBe(true);
    expect(isFixedPaymentDueThisMonth(makeFp("bimonthly", sameMonthCreated), today)).toBe(true);
    expect(isFixedPaymentDueThisMonth(makeFp("quarterly", sameMonthCreated), today)).toBe(true);
  });
});

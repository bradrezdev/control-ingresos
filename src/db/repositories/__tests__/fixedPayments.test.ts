/**
 * fixedPaymentsRepo — CRUD roundtrip tests (fake-indexeddb)
 *
 * Covers:
 *   - list() returns [] when the table is empty
 *   - create() + get() roundtrip
 *   - update() modifies fields and bumps updatedAt
 *   - delete() removes the row
 *   - Schema validation rejects bad data (negative amount, invalid period,
 *     missing cardId for debit/credit, msiMonths for non-credit)
 */
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/db/database";
import { fixedPaymentsRepo } from "@/db/repositories/fixedPayments";
import {
  FixedPaymentSchema,
  type FixedPaymentInput,
} from "@/db/schemas/fixedPayment";

const NOW = "2026-06-05T10:00:00.000Z";

function makeInput(
  overrides: Partial<FixedPaymentInput> = {},
): FixedPaymentInput {
  return {
    amount: 10000, // 100.00 MXN en centavos
    description: "Netflix",
    paymentDay: 15,
    period: "monthly",
    paymentMethod: "credit",
    cardId: "11111111-1111-4111-8111-111111111111",
    ...overrides,
  };
}

describe("fixedPaymentsRepo", () => {
  beforeEach(async () => {
    await db.fixedPayments.clear();
  });

  it("list() returns [] when the table is empty", async () => {
    const list = await fixedPaymentsRepo.list();
    expect(list).toEqual([]);
  });

  it("create() + get() roundtrip preserves all fields", async () => {
    const created = await fixedPaymentsRepo.create(makeInput());
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updatedAt).toBe(created.createdAt);

    const fetched = await fixedPaymentsRepo.get(created.id);
    expect(fetched).toEqual(created);
  });

  it("update() modifies fields and bumps updatedAt", async () => {
    const created = await fixedPaymentsRepo.create(makeInput());
    // Yield a tick so the new Date() inside the repo observes a different
    // millisecond. fake-indexeddb transactions resolve on microtask queue,
    // and we don't fake the wall clock (that would deadlock the IDB
    // microtask scheduling used by the transaction).
    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await fixedPaymentsRepo.update(created.id, {
      amount: 20000,
      description: "Netflix Premium",
    });
    expect(updated.amount).toBe(20000);
    expect(updated.description).toBe("Netflix Premium");
    expect(updated.paymentDay).toBe(created.paymentDay); // unchanged
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("delete() removes the row", async () => {
    const created = await fixedPaymentsRepo.create(makeInput());
    await fixedPaymentsRepo.delete(created.id);
    const fetched = await fixedPaymentsRepo.get(created.id);
    expect(fetched).toBeUndefined();
  });

  it("create() throws on negative amount (schema validation)", async () => {
    await expect(
      fixedPaymentsRepo.create(makeInput({ amount: -1 })),
    ).rejects.toThrow();
  });

  it("create() throws on invalid period (schema validation)", async () => {
    // Cast to bypass TypeScript — the Zod parse is the real guardrail.
    const bad = {
      ...makeInput(),
      period: "weekly" as unknown as FixedPaymentInput["period"],
    };
    await expect(fixedPaymentsRepo.create(bad)).rejects.toThrow();
  });

  it("create() throws when paymentMethod=debit but cardId is missing", async () => {
    await expect(
      fixedPaymentsRepo.create(
        makeInput({ paymentMethod: "debit", cardId: undefined }),
      ),
    ).rejects.toThrow();
  });

  it("create() throws when paymentMethod=cash but msiMonths is set", async () => {
    await expect(
      fixedPaymentsRepo.create(
        makeInput({ paymentMethod: "cash", msiMonths: 3 }),
      ),
    ).rejects.toThrow();
  });

  it("get() returns undefined for unknown id", async () => {
    const fetched = await fixedPaymentsRepo.get("does-not-exist");
    expect(fetched).toBeUndefined();
  });
});

describe("FixedPaymentSchema direct validation", () => {
  it("accepts a complete valid row", () => {
    const row = {
      id: crypto.randomUUID(),
      amount: 10000,
      description: "Renta",
      paymentDay: 1,
      period: "monthly" as const,
      paymentMethod: "cash" as const,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(() => FixedPaymentSchema.parse(row)).not.toThrow();
  });
});

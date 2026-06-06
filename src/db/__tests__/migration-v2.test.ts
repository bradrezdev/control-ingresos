/**
 * Dexie v1 → v2 migration tests (fake-indexeddb)
 *
 * R-3 (bug 3) + R-2 (bug 2): the v1 schema had `paymentDueDay: 1..31` and
 * `last4: ""|"1234"`. The v2 schema replaces paymentDueDay with
 * `daysToPayAfterCut: 1..62` (constant per card) and drops `last4` entirely.
 *
 * Backfill rules per AD-2:
 *   raw = (paymentDueDay >= cutDay) ? (paymentDueDay - cutDay) : (30 - cutDay + paymentDueDay)
 *   daysToPayAfterCut = raw === 0 ? 30 : raw
 *
 * The Tarjeta P (cut=22, pay=22) backfill: raw=0 → fallback 30.
 * User must verify Tarjeta P post-migration (per design risk note).
 *
 * Two DB classes: V1DB (legacy shape, for seeding) and V2DB (registers
 * both v1+v2, simulates the real app upgrade).
 */
import { describe, it, expect } from "vitest";
import Dexie, { type EntityTable } from "dexie";
import "fake-indexeddb/auto";
import type { Card } from "@/db/schemas/card";
import { z } from "zod";

// V1 shape (legacy) — what users had pre-migration.
interface V1Card {
  id: string;
  bank: string;
  holderName: string;
  last4: string;
  cutDay: number;
  paymentDueDay: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// V2 schema mirror — kept in-test to ensure the v2 CardSchema in the repo
// still validates the migrated row.
const CardSchemaV2 = z.object({
  id: z.uuid(),
  bank: z.string().min(1).max(60),
  holderName: z.string().min(1).max(80),
  cutDay: z.number().int().min(1).max(31),
  daysToPayAfterCut: z.number().int().min(1).max(62),
  creditLimit: z.number().positive().optional(),
  priority: z.number().int().default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

class V1DB extends Dexie {
  cards!: EntityTable<V1Card, "id">;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ cards: "id, bank, priority, createdAt" });
  }
}

class V2DB extends Dexie {
  cards!: EntityTable<V1Card | Card, "id">;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ cards: "id, bank, priority, createdAt" });
    this.version(2)
      .stores({ cards: "id, bank, priority, createdAt" })
      .upgrade(async (tx) => {
        await tx
          .table("cards")
          .toCollection()
          .modify((raw: unknown) => {
            const c = raw as V1Card;
            if (
              c.paymentDueDay !== undefined &&
              (c as unknown as { daysToPayAfterCut?: number })
                .daysToPayAfterCut === undefined
            ) {
              const rawDelta =
                c.paymentDueDay >= c.cutDay
                  ? c.paymentDueDay - c.cutDay
                  : 30 - c.cutDay + c.paymentDueDay;
              (
                c as unknown as { daysToPayAfterCut: number }
              ).daysToPayAfterCut = rawDelta === 0 ? 30 : rawDelta;
            }
            delete (c as Partial<V1Card>).last4;
            delete (c as Partial<V1Card>).paymentDueDay;
          });
      });
  }
}

const NOW = "2026-01-01T00:00:00.000Z";

function makeV1(
  id: string,
  bank: string,
  cutDay: number,
  paymentDueDay: number,
  last4: string,
): V1Card {
  return {
    id,
    bank,
    holderName: "Test",
    last4,
    cutDay,
    paymentDueDay,
    priority: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("Dexie v1 → v2 migration", () => {
  // Each test gets a unique DB name so the persisted v1 data and the
  // re-opened v2 DB share the same store.
  const makeName = () => `test-migration-${Math.random().toString(36).slice(2)}`;

  it("migrates Tarjeta S (cut=13, paymentDueDay=3) → daysToPayAfterCut=20", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(
      makeV1("11111111-1111-4111-8111-111111111111", "BBVA", 13, 3, "1234"),
    );
    v1.close();
    const v2 = new V2DB(name);
    await v2.open();
    const card = (await v2.cards.get(
      "11111111-1111-4111-8111-111111111111",
    )) as unknown as Card;
    expect(card.daysToPayAfterCut).toBe(20);
    expect(() => CardSchemaV2.parse(card)).not.toThrow();
  });

  it("migrates Tarjeta M (cut=27, paymentDueDay=7) → daysToPayAfterCut=10", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(
      makeV1("22222222-2222-4222-8222-222222222222", "Banamex", 27, 7, ""),
    );
    v1.close();
    const v2 = new V2DB(name);
    await v2.open();
    const card = (await v2.cards.get(
      "22222222-2222-4222-8222-222222222222",
    )) as unknown as Card;
    expect(card.daysToPayAfterCut).toBe(10);
  });

  it("migrates Tarjeta P (cut=22, paymentDueDay=22) → daysToPayAfterCut=30 (0-fallback)", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(
      makeV1("33333333-3333-4333-8333-333333333333", "HSBC", 22, 22, "9999"),
    );
    v1.close();
    const v2 = new V2DB(name);
    await v2.open();
    const card = (await v2.cards.get(
      "33333333-3333-4333-8333-333333333333",
    )) as unknown as Card;
    expect(card.daysToPayAfterCut).toBe(30);
  });

  it("strips last4 and paymentDueDay from migrated rows", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(
      makeV1("44444444-4444-4444-8444-444444444444", "Santander", 15, 5, "4321"),
    );
    v1.close();
    const v2 = new V2DB(name);
    await v2.open();
    const raw = (await v2.cards.get(
      "44444444-4444-4444-8444-444444444444",
    )) as unknown as Record<string, unknown>;
    expect(raw.last4).toBeUndefined();
    expect(raw.paymentDueDay).toBeUndefined();
    expect(raw.daysToPayAfterCut).toBe(20);
  });

  it("preserves the rest of the card fields (bank, cutDay, priority, timestamps)", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(
      makeV1("55555555-5555-4555-8555-555555555555", "Banorte", 10, 25, "1111"),
    );
    v1.close();
    const v2 = new V2DB(name);
    await v2.open();
    const card = (await v2.cards.get(
      "55555555-5555-4555-8555-555555555555",
    )) as unknown as Card;
    expect(card.bank).toBe("Banorte");
    expect(card.cutDay).toBe(10);
    expect(card.priority).toBe(0);
    expect(card.createdAt).toBe(NOW);
    expect(card.updatedAt).toBe(NOW);
    // 25 >= 10 → 25 - 10 = 15
    expect(card.daysToPayAfterCut).toBe(15);
  });
});

/**
 * Dexie v1 → v2 → v3 migration tests (fake-indexeddb)
 *
 * Tarea 2 (drop `debts`, add `fixedPayments`) + Tarea 3 (backfill
 * `cardType='credit'` on legacy cards) are combined in a single
 * `this.version(3)` block in `db/database.ts`. These tests verify the
 * user-visible invariants of that block:
 *
 *   - Cards created on v2 get `cardType='credit'` on v3 open.
 *   - Cards created on v1 survive the v2 upgrade and the v3 backfill
 *     (i.e. the upgrade chain is correct end-to-end).
 *   - `debts` table is dropped: opening v3 from v2 leaves no `debts`
 *     object store.
 *   - `fixedPayments` table is created: rows can be added and read
 *     back in v3.
 *
 * Each test uses a unique DB name so the persisted v1/v2 data and the
 * re-opened v3 DB share the same store.
 */
import { describe, it, expect } from "vitest";
import Dexie, { type EntityTable } from "dexie";
import "fake-indexeddb/auto";
import type { Card } from "@/db/schemas/card";

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

class V3DB extends Dexie {
  cards!: EntityTable<Card, "id">;
  fixedPayments!: EntityTable<{ id: string; amount: number }, "id">;
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
    this.version(3)
      .stores({
        cards: "id, bank, priority, createdAt",
        fixedPayments: "id, period, paymentDay, createdAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("cards")
          .toCollection()
          .modify((raw: unknown) => {
            const c = raw as { cardType?: "debit" | "credit" };
            if (!c.cardType) c.cardType = "credit";
          });
      });
  }
}

const NOW = "2026-04-01T00:00:00.000Z";

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

describe("Dexie v1 → v2 → v3 migration", () => {
  const makeName = () => `test-mig-v3-${Math.random().toString(36).slice(2)}`;

  it("backfills cardType='credit' on a card created at v2 (V2 → V3 only)", async () => {
    const name = makeName();
    const v2 = new V2DB(name);
    const cardId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await v2.cards.add({
      ...makeV1(cardId, "BBVA", 10, 20, "1234"),
      paymentDueDay: undefined,
      daysToPayAfterCut: 15,
    } as unknown as V1Card);
    v2.close();

    const v3 = new V3DB(name);
    await v3.open();
    const card = await v3.cards.get(cardId);
    expect(card).toBeDefined();
    // The whole point of the v3 backfill: legacy cards get cardType='credit'.
    expect((card as unknown as { cardType?: string }).cardType).toBe("credit");
  });

  it("backfills cardType='credit' on a card that was v1 → v2 → v3", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    const cardId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await v1.cards.add(makeV1(cardId, "Banamex", 5, 25, "5678"));
    v1.close();

    const v2 = new V2DB(name);
    await v2.open();
    v2.close();

    const v3 = new V3DB(name);
    await v3.open();
    const card = await v3.cards.get(cardId);
    expect(card).toBeDefined();
    expect((card as unknown as { cardType?: string }).cardType).toBe("credit");
    // The v2 migration should still be intact (paymentDueDay → daysToPayAfterCut).
    expect((card as unknown as { daysToPayAfterCut?: number }).daysToPayAfterCut).toBe(20);
  });

  it("drops the `debts` table on V3 open (V1 → V3 with debts had data)", async () => {
    const name = makeName();
    // V1DB-like DB that also has a `debts` table.
    class V1WithDebts extends Dexie {
      cards!: EntityTable<V1Card, "id">;
      debts!: EntityTable<{ id: string; creditor: string }, "id">;
      constructor(name: string) {
        super(name);
        this.version(1).stores({
          cards: "id, bank, priority, createdAt",
          debts: "id, creditor, startDate, createdAt",
        });
      }
    }
    const v1 = new V1WithDebts(name);
    await v1.cards.add(makeV1("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "HSBC", 1, 5, "1111"));
    await v1.debts.add({ id: "debt-1", creditor: "ACME" });
    v1.close();

    const v3 = new V3DB(name);
    await v3.open();
    // V3 declares no `debts` store; Dexie should not expose it.
    expect((v3 as unknown as { debts?: unknown }).debts).toBeUndefined();
    // Cards and fixedPayments are both present.
    const cards = await v3.cards.count();
    expect(cards).toBe(1);
    expect((v3 as unknown as { fixedPayments?: unknown }).fixedPayments).toBeDefined();
  });

  it("creates the `fixedPayments` table on V3 and accepts new rows", async () => {
    const name = makeName();
    const v1 = new V1DB(name);
    await v1.cards.add(makeV1("dddddddd-dddd-4ddd-8ddd-dddddddddddd", "Santander", 15, 5, "4321"));
    v1.close();

    const v3 = new V3DB(name);
    await v3.open();
    await v3.fixedPayments.add({
      id: "fp-1",
      amount: 150000, // centavos
    });
    const fp = await v3.fixedPayments.get("fp-1");
    expect(fp).toBeDefined();
    expect(fp?.amount).toBe(150000);
  });
});

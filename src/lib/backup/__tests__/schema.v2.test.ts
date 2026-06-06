/**
 * Backup schema v3 tests
 *
 * v3 introduces `cardType` on every card and drops the `debts` store in
 * favor of `fixedPayments`. A v2 payload (no cardType, has debts) is
 * rejected because the card shape is incompatible.
 */
import { describe, it, expect } from "vitest";
import {
  BACKUP_VERSION,
  APP_NAME,
  BackupPayloadSchema,
} from "../schema";

describe("BACKUP_VERSION", () => {
  it("is 3 (bumped from v2 to add cardType + drop debts)", () => {
    expect(BACKUP_VERSION).toBe(3);
  });
});

describe("BackupPayloadSchema v3 — cards", () => {
  it("accepts a v3 credit card with cardType='credit'", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            bank: "BBVA",
            holderName: "Test",
            cardType: "credit",
            cutDay: 15,
            daysToPayAfterCut: 20,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).not.toThrow();
  });

  it("accepts a v3 debit card (no cutDay, no daysToPayAfterCut)", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            bank: "BBVA",
            holderName: "Débito Test",
            cardType: "debit",
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).not.toThrow();
  });

  it("accepts a legacy v2-shaped card (no cardType); Zod defaults to 'credit'", () => {
    // The v3 schema has `cardType: z.enum(...).default('credit')`, so a v2
    // payload without an explicit cardType is backfilled to 'credit' at
    // parse time. This mirrors the v3 Dexie migration backfill: the
    // upgrade path is symmetric (a v2 card in a v3 backup → cardType=credit).
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            bank: "BBVA",
            holderName: "Legacy",
            cutDay: 15,
            daysToPayAfterCut: 20,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    const parsed = BackupPayloadSchema.parse(payload);
    expect(parsed.data.cards[0]?.cardType).toBe("credit");
  });

  it("rejects a v2 card with cutDay present but no daysToPayAfterCut", () => {
    // After defaulting cardType to 'credit', the superRefine requires BOTH
    // cutDay and daysToPayAfterCut. A partial legacy shape still fails.
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a",
            bank: "BBVA",
            holderName: "Partial Legacy",
            cutDay: 15,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });

  it("rejects a debit card that has cutDay (superRefine guard)", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            bank: "BBVA",
            holderName: "Bad Débito",
            cardType: "debit",
            cutDay: 15,
            daysToPayAfterCut: 20,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });

  it("rejects a credit card without cutDay (superRefine guard)", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            bank: "BBVA",
            holderName: "Bad Crédito",
            cardType: "credit",
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        fixedPayments: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });
});

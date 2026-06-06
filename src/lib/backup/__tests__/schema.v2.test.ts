/**
 * Backup schema v2 tests
 *
 * R-3 + R-2: BACKUP_VERSION bumps to 2. CardSchema drops last4 and
 * paymentDueDay (replaced by daysToPayAfterCut). v1 payloads (with
 * paymentDueDay+last4) are rejected as incompatible.
 */
import { describe, it, expect } from "vitest";
import {
  BACKUP_VERSION,
  APP_NAME,
  BackupPayloadSchema,
} from "../schema";

describe("BACKUP_VERSION", () => {
  it("is 2 (bumped from v1 to align with card cycle schema)", () => {
    expect(BACKUP_VERSION).toBe(2);
  });
});

describe("BackupPayloadSchema v2 — cards", () => {
  it("accepts a v2 card with daysToPayAfterCut (no paymentDueDay, no last4)", () => {
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
            cutDay: 15,
            daysToPayAfterCut: 20,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        debts: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).not.toThrow();
  });

  it("rejects a v1 card that still has paymentDueDay + last4 (no daysToPayAfterCut)", () => {
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
            last4: "1234",
            cutDay: 15,
            paymentDueDay: 5,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        debts: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });

  it("rejects card with daysToPayAfterCut=0 (must be 1..62)", () => {
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
            cutDay: 15,
            daysToPayAfterCut: 0,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        debts: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });

  it("rejects card with daysToPayAfterCut=63 (must be 1..62)", () => {
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
            cutDay: 15,
            daysToPayAfterCut: 63,
            priority: 0,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        debts: [],
      },
    };
    expect(() => BackupPayloadSchema.parse(payload)).toThrow();
  });
});

/**
 * Backup schema tests
 */
import { describe, it, expect } from "vitest";
import {
  BACKUP_VERSION,
  APP_NAME,
  BackupPayloadSchema,
} from "../schema";

describe("BackupPayloadSchema", () => {
  function makeValidPayload() {
    return {
      version: BACKUP_VERSION,
      exportedAt: "2026-06-05T12:00:00.000Z",
      appName: APP_NAME,
      data: {
        transactions: [],
        cards: [],
        fixedPayments: [],
      },
    };
  }

  it("accepts a minimal valid payload", () => {
    expect(() => BackupPayloadSchema.parse(makeValidPayload())).not.toThrow();
  });

  it("rejects wrong appName", () => {
    const p = makeValidPayload();
    p.appName = "otra-app" as typeof APP_NAME;
    expect(() => BackupPayloadSchema.parse(p)).toThrow();
  });

  it("rejects non-ISO exportedAt", () => {
    const p = makeValidPayload();
    p.exportedAt = "not-a-date";
    expect(() => BackupPayloadSchema.parse(p)).toThrow();
  });

  it("rejects version < 1", () => {
    const p = makeValidPayload() as Record<string, unknown>;
    p.version = 0;
    expect(() => BackupPayloadSchema.parse(p)).toThrow();
  });

  it("requires `data` to be an object", () => {
    const p = makeValidPayload() as Record<string, unknown>;
    p.data = null;
    expect(() => BackupPayloadSchema.parse(p)).toThrow();
  });

  it("validates inner transactions through TransactionSchema", () => {
    const p = makeValidPayload();
    (p.data.transactions as unknown[]).push({
      id: "not-a-uuid",
      type: "income",
      amount: 100,
      currency: "MXN",
      description: "Test",
      date: "2026-06-05T00:00:00.000Z",
      paymentMethod: "cash",
    });
    expect(() => BackupPayloadSchema.parse(p)).toThrow(/uuid/i);
  });

  it("settings is optional", () => {
    const p = makeValidPayload();
    expect(() => BackupPayloadSchema.parse(p)).not.toThrow();
  });

  it("validates settings when provided", () => {
    const p = makeValidPayload() as Record<string, unknown> & {
      data: { settings?: unknown };
    };
    p.data.settings = {
      id: "singleton",
      monthlyLimit: 1000,
      currency: "MXN",
      updatedAt: "2026-06-05T00:00:00.000Z",
    };
    expect(() => BackupPayloadSchema.parse(p)).not.toThrow();
  });

  it("rejects invalid settings", () => {
    const p = makeValidPayload() as Record<string, unknown> & {
      data: { settings?: unknown };
    };
    p.data.settings = {
      id: "wrong-id",
      monthlyLimit: 1000,
      currency: "MXN",
      updatedAt: "2026-06-05T00:00:00.000Z",
    };
    expect(() => BackupPayloadSchema.parse(p)).toThrow();
  });
});

/**
 * Backup export tests
 *
 * Uses fake-indexeddb (provided by test/setup.ts). Each test seeds the
 * DB with known records, runs export, and asserts on the resulting
 * payload shape.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/database";
import { exportToJSON, formatBackupFilename } from "../export";
import { APP_NAME, BACKUP_VERSION } from "../schema";

const FIXED_NOW = new Date("2026-06-05T12:00:00.000Z");

async function resetDb(): Promise<void> {
  await db.open();
  await Promise.all([
    db.transactions.clear(),
    db.cards.clear(),
    db.fixedPayments.clear(),
    db.settings.clear(),
  ]);
}

describe("exportToJSON", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns a payload with the current version + appName + timestamp", async () => {
    const payload = await exportToJSON(FIXED_NOW);
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.appName).toBe(APP_NAME);
    expect(payload.exportedAt).toBe(FIXED_NOW.toISOString());
  });

  it("returns empty arrays when DB is empty", async () => {
    const payload = await exportToJSON(FIXED_NOW);
    expect(payload.data.transactions).toEqual([]);
    expect(payload.data.cards).toEqual([]);
    expect(payload.data.fixedPayments).toEqual([]);
    expect(payload.data.settings).toBeUndefined();
  });

  it("includes all stored records", async () => {
    const cardId = crypto.randomUUID();
    const txId = crypto.randomUUID();
    const fpId = crypto.randomUUID();

    await db.cards.add({
      id: cardId,
      bank: "BBVA",
      holderName: "Test Holder",
      cardType: "credit",
      cutDay: 15,
      daysToPayAfterCut: 20,
      priority: 0,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
    await db.transactions.add({
      id: txId,
      type: "income",
      amount: 5000,
      currency: "MXN",
      description: "Salary",
      date: "2026-06-05",
      paymentMethod: "transfer",
    });
    await db.fixedPayments.add({
      id: fpId,
      amount: 10000,
      description: "Renta",
      paymentDay: 1,
      period: "monthly",
      paymentMethod: "cash",
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
    await db.settings.put({
      id: "singleton",
      monthlyLimit: 20000,
      currency: "MXN",
      updatedAt: FIXED_NOW.toISOString(),
    });

    const payload = await exportToJSON(FIXED_NOW);
    expect(payload.data.transactions).toHaveLength(1);
    expect(payload.data.cards).toHaveLength(1);
    expect(payload.data.fixedPayments).toHaveLength(1);
    expect(payload.data.settings?.monthlyLimit).toBe(20000);
  });

  it("payload round-trips through JSON.stringify/parse without loss", async () => {
    const cardId = crypto.randomUUID();
    await db.cards.add({
      id: cardId,
      bank: "BBVA",
      holderName: "Round Trip",
      cardType: "credit",
      cutDay: 10,
      daysToPayAfterCut: 25,
      priority: 0,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });

    const original = await exportToJSON(FIXED_NOW);
    const roundTripped = JSON.parse(JSON.stringify(original));
    expect(roundTripped).toEqual(original);
  });
});

describe("formatBackupFilename", () => {
  it("formats the date as YYYY-MM-DD", () => {
    const name = formatBackupFilename(new Date("2026-06-05T12:00:00Z"));
    expect(name).toBe("control-ingresos-backup-2026-06-05.json");
  });

  it("zero-pads month and day", () => {
    const name = formatBackupFilename(new Date("2026-01-09T00:00:00Z"));
    expect(name).toBe("control-ingresos-backup-2026-01-09.json");
  });
});

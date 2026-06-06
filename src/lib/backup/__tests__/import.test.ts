/**
 * Backup import tests
 *
 * Covers: invalid JSON, schema validation, version mismatch,
 * round-trip (export → import → re-export equality), and the
 * replace vs merge modes.
 *
 * Card fixtures use the v2 shape (daysToPayAfterCut, no last4, no
 * paymentDueDay) per BACKUP_VERSION=2.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/database";
import { exportToJSON } from "../export";
import {
  parseBackupFile,
  importBackup,
  BackupVersionError,
} from "../import";
import { APP_NAME, BACKUP_VERSION } from "../schema";
import type { BackupPayload } from "../schema";

const NOW = new Date("2026-06-05T12:00:00.000Z");

const APP: BackupPayload["appName"] = APP_NAME;

async function resetDb(): Promise<void> {
  await db.open();
  await Promise.all([
    db.transactions.clear(),
    db.cards.clear(),
    db.debts.clear(),
    db.settings.clear(),
  ]);
}

function makeFile(payload: unknown): File {
  const json = JSON.stringify(payload);
  return new File([json], "backup.json", { type: "application/json" });
}

function seedCard(id: string) {
  return db.cards.add({
    id,
    bank: "BBVA",
    holderName: "Seed",
    cutDay: 15,
    daysToPayAfterCut: 20,
    priority: 0,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  });
}

describe("parseBackupFile", () => {
  it("parses a valid file", async () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: NOW.toISOString(),
      appName: APP_NAME,
      data: { transactions: [], cards: [], debts: [] },
    };
    const result = await parseBackupFile(makeFile(payload));
    expect(result.version).toBe(BACKUP_VERSION);
  });

  it("rejects non-JSON content", async () => {
    const file = new File(["not-json-at-all{"], "broken.json");
    await expect(parseBackupFile(file)).rejects.toThrow(/JSON válido/);
  });

  it("rejects schema-invalid payloads", async () => {
    const broken = { foo: "bar" };
    await expect(parseBackupFile(makeFile(broken))).rejects.toThrow();
  });

  it("throws BackupVersionError when version > supported", async () => {
    const payload = {
      version: BACKUP_VERSION + 1,
      exportedAt: NOW.toISOString(),
      appName: APP_NAME,
      data: { transactions: [], cards: [], debts: [] },
    };
    await expect(parseBackupFile(makeFile(payload))).rejects.toBeInstanceOf(
      BackupVersionError,
    );
  });
});

describe("importBackup — replace mode", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("clears existing data and writes the backup", async () => {
    const seededId = crypto.randomUUID();
    await seedCard(seededId);
    expect(await db.cards.count()).toBe(1);

    const replacementId = crypto.randomUUID();
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: NOW.toISOString(),
      appName: APP,
      data: {
        transactions: [],
        cards: [
          {
            id: replacementId,
            bank: "Santander",
            holderName: "New",
            cutDay: 10,
            daysToPayAfterCut: 25,
            priority: 0,
            createdAt: NOW.toISOString(),
            updatedAt: NOW.toISOString(),
          },
        ],
        debts: [],
      },
    };

    const result = await importBackup(payload, "replace");
    expect(result.total).toBe(1);
    expect(result.added).toBe(1);
    expect(result.updated).toBe(0);

    const cards = await db.cards.toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe(replacementId);
  });
});

describe("importBackup — merge mode", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("upserts by id, backup wins on conflict", async () => {
    const sharedId = crypto.randomUUID();
    await seedCard(sharedId);

    const newId = crypto.randomUUID();
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: NOW.toISOString(),
      appName: APP,
      data: {
        transactions: [],
        cards: [
          {
            id: sharedId,
            bank: "Santander",
            holderName: "Updated",
            cutDay: 1,
            daysToPayAfterCut: 1,
            priority: 0,
            createdAt: NOW.toISOString(),
            updatedAt: NOW.toISOString(),
          },
          {
            id: newId,
            bank: "Banamex",
            holderName: "Added",
            cutDay: 1,
            daysToPayAfterCut: 1,
            priority: 0,
            createdAt: NOW.toISOString(),
            updatedAt: NOW.toISOString(),
          },
        ],
        debts: [],
      },
    };

    const result = await importBackup(payload, "merge");
    expect(result.total).toBe(2);
    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);

    const updated = await db.cards.get(sharedId);
    expect(updated?.bank).toBe("Santander");
    const added = await db.cards.get(newId);
    expect(added?.holderName).toBe("Added");
  });

  it("keeps unrelated existing records", async () => {
    const existingId = crypto.randomUUID();
    await seedCard(existingId);

    const payload = {
      version: BACKUP_VERSION,
      exportedAt: NOW.toISOString(),
      appName: APP,
      data: {
        transactions: [],
        cards: [
          {
            id: crypto.randomUUID(),
            bank: "HSBC",
            holderName: "New",
            cutDay: 20,
            daysToPayAfterCut: 10,
            priority: 0,
            createdAt: NOW.toISOString(),
            updatedAt: NOW.toISOString(),
          },
        ],
        debts: [],
      },
    };

    await importBackup(payload, "merge");
    const existing = await db.cards.get(existingId);
    expect(existing?.bank).toBe("BBVA");
    expect(await db.cards.count()).toBe(2);
  });
});

describe("round-trip — export → import → export equality", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("preserves the dataset across replace import", async () => {
    await seedCard(crypto.randomUUID());
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: "income",
      amount: 100,
      currency: "MXN",
      description: "Trip",
      date: "2026-06-05T00:00:00.000Z",
      paymentMethod: "cash",
    });

    const exported = await exportToJSON(NOW);
    await resetDb();
    expect(await db.cards.count()).toBe(0);

    const result = await importBackup(exported, "replace");
    expect(result.total).toBe(2);

    const reExported = await exportToJSON(NOW);
    expect(reExported.data).toEqual(exported.data);
  });
});

/**
 * Backup export — control-ingresos
 *
 * Reads every Dexie store, assembles a versioned payload, and validates
 * it through the same Zod schemas used at write time. Two entry points:
 *
 *   - `exportToJSON(now?)` — pure-ish helper that returns the parsed
 *     payload. Useful for tests, programmatic backups, and the import
 *     round-trip test.
 *   - `downloadBackup(now?)` — assembles + triggers a browser download
 *     with a date-stamped filename.
 *
 * `now` is injected to keep the function deterministic in tests.
 */
import { db } from "@/db/database";
import { fixedPaymentsRepo } from "@/db/repositories/fixedPayments";
import { settingsRepo } from "@/db/repositories/settings";
import {
  APP_NAME,
  BACKUP_VERSION,
  BackupPayloadSchema,
  type BackupPayload,
} from "./schema";

export async function exportToJSON(now: Date = new Date()): Promise<BackupPayload> {
  await db.open();

  const [transactions, cards, fixedPayments, settings] = await Promise.all([
    db.transactions.toArray(),
    db.cards.toArray(),
    fixedPaymentsRepo.list(),
    settingsRepo.get(),
  ]);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    appName: APP_NAME,
    data: {
      transactions,
      cards,
      fixedPayments,
      ...(settings ? { settings } : {}),
    },
  };

  // Validate before returning so we never hand the user a corrupted
  // file. A failure here means the DB itself is inconsistent.
  return BackupPayloadSchema.parse(payload);
}

/**
 * Format a Date as `YYYY-MM-DD` (UTC). Stable across timezones so two
 * users with the same UTC instant get the same filename.
 */
export function formatBackupFilename(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `control-ingresos-backup-${y}-${m}-${d}.json`;
}

export async function downloadBackup(now: Date = new Date()): Promise<void> {
  const payload = await exportToJSON(now);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = formatBackupFilename(now);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Allow the browser to start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}

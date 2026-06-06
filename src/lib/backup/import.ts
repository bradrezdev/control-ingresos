/**
 * Backup import — control-ingresos
 *
 * Parses a user-supplied JSON file and writes it into Dexie. Two modes:
 *
 *   - "replace": clears every store and bulk-puts the backup. Used when
 *     the user wants a clean restore.
 *   - "merge": upserts by id; backup entries WIN on conflict (the user
 *     opted in to import these records). Added items keep their id and
 *     timestamps; updated items keep the backup's `updatedAt`.
 *
 * Forward-compat: a payload with `version > BACKUP_VERSION` is rejected
 * because we cannot guarantee the older code understands the new shape.
 * Older payloads (version < BACKUP_VERSION) should never happen until
 * we bump the version, but we accept them as long as Zod parses cleanly.
 */
import { db } from "@/db/database";
import {
  BACKUP_VERSION,
  BackupPayloadSchema,
  type BackupPayload,
} from "./schema";
import { normalizeToDateString } from "@/lib/date/local";

export type ImportMode = "replace" | "merge";

export interface ImportResult {
  added: number;
  updated: number;
  /** Total rows in the backup, regardless of mode. */
  total: number;
}

export class BackupVersionError extends Error {
  constructor(public payloadVersion: number, public maxSupported: number) {
    super(
      `Backup version ${payloadVersion} es superior a la versión soportada (${maxSupported}). ` +
        "Actualizá la aplicación e intentá de nuevo.",
    );
    this.name = "BackupVersionError";
  }
}

/**
 * Read the contents of a Blob/File as text.
 *
 * Avoids `blob.text()` because jsdom's File polyfill (used in tests)
 * does not implement it, and `new Response(file).text()` fails in jsdom
 * too (it stringifies File instead of reading bytes). FileReader is the
 * only path that works consistently in jsdom + browsers.
 */
async function readBlobAsText(file: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(reader.error ?? new Error("No se pudo leer el archivo"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("FileReader devolvió un resultado no-string"));
        }
      };
      reader.readAsText(file);
    });
  }
  // Pure-Node fallback (shouldn't be hit in browser or jsdom).
  return file.text();
}

/**
 * Read a `File` (or `Blob`) from disk and parse it into a validated
 * `BackupPayload`. Throws a `z.ZodError` on schema failure or a
 * `BackupVersionError` if the file is from a newer app.
 */
export async function parseBackupFile(file: File | Blob): Promise<BackupPayload> {
  const text = await readBlobAsText(file);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `El archivo no es un JSON válido: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const parsed = BackupPayloadSchema.parse(raw);
  if (parsed.version > BACKUP_VERSION) {
    throw new BackupVersionError(parsed.version, BACKUP_VERSION);
  }
  return parsed;
}

/**
 * Apply a previously-parsed payload to Dexie. Runs inside a single
 * transaction so partial writes never persist on error.
 *
 * Antes de pasar el payload al Zod parse, normalizamos los dates de las
 * transacciones y deudas: filas exportadas por una versión vieja del app
 * (date en formato `...T00:00:00.000Z`) se acortan a date-only
 * "YYYY-MM-DD" para que Zod 4 (con `z.iso.date()`) las acepte.
 */
function normalizePayloadDates(payload: BackupPayload): BackupPayload {
  return {
    ...payload,
    data: {
      ...payload.data,
      transactions: payload.data.transactions.map((tx) => ({
        ...tx,
        date: normalizeToDateString(tx.date),
        ...(tx.type === "expense_msi"
          ? { msiStartDate: normalizeToDateString(tx.msiStartDate) }
          : {}),
      })),
      debts: payload.data.debts.map((d) => ({
        ...d,
        startDate: normalizeToDateString(d.startDate),
        ...(d.endDate ? { endDate: normalizeToDateString(d.endDate) } : {}),
      })),
    },
  };
}

export async function importBackup(
  payload: BackupPayload,
  mode: ImportMode,
): Promise<ImportResult> {
  // Re-validate as a safety net (callers should already have validated
  // via parseBackupFile, but importBackup may be invoked programmatically).
  const normalized = normalizePayloadDates(payload);
  const validated = BackupPayloadSchema.parse(normalized);
  await db.open();

  const total =
    validated.data.transactions.length +
    validated.data.cards.length +
    validated.data.debts.length +
    (validated.data.settings ? 1 : 0);

  let added = 0;
  let updated = 0;

  await db.transaction(
    "rw",
    db.transactions,
    db.cards,
    db.debts,
    db.settings,
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.transactions.clear(),
          db.cards.clear(),
          db.debts.clear(),
          db.settings.clear(),
        ]);
        await Promise.all([
          db.transactions.bulkAdd(validated.data.transactions),
          db.cards.bulkAdd(validated.data.cards),
          db.debts.bulkAdd(validated.data.debts),
          validated.data.settings
            ? db.settings.put(validated.data.settings)
            : Promise.resolve(),
        ]);
        added = total;
        return;
      }

      // merge: upsert by id; backup wins.
      for (const tx of validated.data.transactions) {
        const existed = await db.transactions.get(tx.id);
        await db.transactions.put(tx);
        if (existed) updated++;
        else added++;
      }
      for (const card of validated.data.cards) {
        const existed = await db.cards.get(card.id);
        await db.cards.put(card);
        if (existed) updated++;
        else added++;
      }
      for (const debt of validated.data.debts) {
        const existed = await db.debts.get(debt.id);
        await db.debts.put(debt);
        if (existed) updated++;
        else added++;
      }
      if (validated.data.settings) {
        const existed = await db.settings.get(validated.data.settings.id);
        await db.settings.put(validated.data.settings);
        if (existed) updated++;
        else added++;
      }
    },
  );

  return { added, updated, total };
}

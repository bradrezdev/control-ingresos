/**
 * Backup schema — control-ingresos
 *
 * Versioned wire format for the JSON export/import feature. The payload
 * mirrors the four Dexie stores plus metadata. Every change to one of
 * the underlying schemas that breaks compatibility MUST bump
 * `BACKUP_VERSION`.
 *
 * Validation strategy:
 *   - The outer envelope (version, exportedAt, appName, data) is strict.
 *   - Each inner array passes through the existing Dexie Zod schema so
 *     we get the same guarantees that the repositories use at write
 *     time.
 *   - The settings entry is optional: a backup made before the user
 *     ever opened Settings won't have one. We default to "no settings"
 *     and let `importBackup` skip it.
 */
import { z } from "zod";
import { CardSchema } from "@/db/schemas/card";
import { DebtSchema } from "@/db/schemas/debt";
import { SettingsSchema } from "@/db/schemas/settings";
import { TransactionSchema } from "@/db/schemas/transaction";

export const BACKUP_VERSION = 2 as const;
export const APP_NAME = "control-ingresos" as const;

export const BackupDataSchema = z.object({
  transactions: z.array(TransactionSchema),
  cards: z.array(CardSchema),
  debts: z.array(DebtSchema),
  settings: SettingsSchema.optional(),
});

export const BackupPayloadSchema = z.object({
  version: z
    .number()
    .int()
    .min(1, "El campo 'version' debe ser un entero positivo"),
  exportedAt: z.iso.datetime({ message: "exportedAt no es una fecha ISO" }),
  appName: z.literal(APP_NAME, {
    error: `appName debe ser '${APP_NAME}'`,
  }),
  data: BackupDataSchema,
});

export type BackupPayload = z.infer<typeof BackupPayloadSchema>;
export type BackupData = z.infer<typeof BackupDataSchema>;

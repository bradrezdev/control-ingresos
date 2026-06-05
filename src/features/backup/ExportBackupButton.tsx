/**
 * ExportBackupButton — control-ingresos
 *
 * Triggers an offline JSON download of every Dexie store. Shows a
 * loading spinner while serializing and writing the file. On failure,
 * surfaces a human-readable error message.
 */
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadBackup } from "@/lib/backup";

export interface ExportBackupButtonProps {
  className?: string;
}

export function ExportBackupButton({
  className,
}: ExportBackupButtonProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function onClick(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await downloadBackup();
      setSavedAt(Date.now());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos generar el archivo. Intentá de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="primary"
        leftIcon={<Download className="size-4" aria-hidden />}
        onClick={onClick}
        loading={busy}
        disabled={busy}
        aria-label="Exportar respaldo en JSON"
      >
        Exportar a JSON
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      {!error && savedAt ? (
        <p
          role="status"
          className="mt-2 text-xs text-[var(--color-success)]"
        >
          Respaldo descargado.
        </p>
      ) : null}
    </div>
  );
}

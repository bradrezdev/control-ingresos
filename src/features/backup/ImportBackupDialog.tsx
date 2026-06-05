/**
 * ImportBackupDialog — control-ingresos
 *
 * Two-step modal: (1) preview the selected file's contents after Zod
 * validation, (2) let the user choose merge vs replace and confirm.
 *
 *   - Replace shows a destructive warning + a second Modal confirmation
 *     before mutating Dexie.
 *   - Validation errors are shown in the modal in the user's language.
 *   - When the user closes the modal mid-flow, all internal state is
 *     reset on next open.
 *
 * Accessibility: the file input is hidden behind a Button (the dialog
 * opens with the picker already triggered, but if the user cancels the
 * picker we fall back to a "Elegir archivo" button inside the modal).
 */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, FileUp, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  parseBackupFile,
  importBackup,
  BackupVersionError,
  type BackupPayload,
  type ImportMode,
} from "@/lib/backup";
import { ZodError } from "zod";

export interface ImportBackupDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: (result: { added: number; updated: number }) => void;
}

type Phase = "picking" | "validating" | "preview" | "confirming-replace" | "importing" | "done" | "error";

export function ImportBackupDialog({
  open,
  onClose,
  onImported,
}: ImportBackupDialogProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("picking");
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset all state on (re-)open.
  useEffect(() => {
    if (!open) return;
    setPhase("picking");
    setFile(null);
    setPayload(null);
    setMode("merge");
    setError(null);
    setResult(null);
  }, [open]);

  function pickFile(): void {
    inputRef.current?.click();
  }

  async function handleFile(selected: File): Promise<void> {
    setFile(selected);
    setPhase("validating");
    setError(null);
    try {
      const parsed = await parseBackupFile(selected);
      setPayload(parsed);
      setPhase("preview");
    } catch (err) {
      setPhase("error");
      setError(humanizeError(err));
    }
  }

  async function runImport(): Promise<void> {
    if (!payload) return;
    setPhase("importing");
    setError(null);
    try {
      const r = await importBackup(payload, mode);
      setResult(r);
      setPhase("done");
      onImported?.(r);
    } catch (err) {
      setPhase("error");
      setError(humanizeError(err));
    }
  }

  function onPrimary(): void {
    if (mode === "replace") {
      setPhase("confirming-replace");
      return;
    }
    void runImport();
  }

  const dismissable = phase !== "importing";

  return (
    <Modal
      open={open}
      onClose={dismissable ? onClose : () => undefined}
      title="Importar respaldo"
      description="Cargá un archivo JSON exportado previamente desde esta aplicación."
      size="lg"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          // Reset so re-picking the same file fires onChange.
          e.target.value = "";
        }}
        aria-label="Seleccionar archivo de respaldo"
      />

      {phase === "picking" ? (
        <PickerStep onPick={pickFile} />
      ) : null}

      {phase === "validating" ? (
        <LoadingStep label="Validando archivo…" />
      ) : null}

      {phase === "preview" && payload ? (
        <PreviewStep
          file={file}
          payload={payload}
          mode={mode}
          onChangeMode={setMode}
          onConfirm={onPrimary}
          onCancel={onClose}
          onPickAnother={pickFile}
        />
      ) : null}

      {phase === "confirming-replace" ? (
        <ReplaceConfirmStep
          onBack={() => setPhase("preview")}
          onConfirm={() => void runImport()}
        />
      ) : null}

      {phase === "importing" ? (
        <LoadingStep label="Aplicando respaldo…" />
      ) : null}

      {phase === "done" && result ? (
        <DoneStep
          added={result.added}
          updated={result.updated}
          onClose={onClose}
        />
      ) : null}

      {phase === "error" ? (
        <ErrorStep
          message={error ?? "Ocurrió un error desconocido."}
          onRetry={pickFile}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

/* ---------- Steps ---------- */

function PickerStep({ onPick }: { onPick: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <FileUp
        className="size-10 text-[var(--color-text-muted)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-text-body)]">
        Elegí un archivo <code className="font-mono">.json</code> generado por
        esta aplicación.
      </p>
      <Button variant="primary" onClick={onPick}>
        Elegir archivo
      </Button>
    </div>
  );
}

function LoadingStep({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="size-8 animate-spin text-[var(--color-text-muted)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function PreviewStep({
  file,
  payload,
  mode,
  onChangeMode,
  onConfirm,
  onCancel,
  onPickAnother,
}: {
  file: File | null;
  payload: BackupPayload;
  mode: ImportMode;
  onChangeMode: (m: ImportMode) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPickAnother: () => void;
}): React.JSX.Element {
  const counts = {
    transactions: payload.data.transactions.length,
    cards: payload.data.cards.length,
    debts: payload.data.debts.length,
    settings: payload.data.settings ? 1 : 0,
  };
  const total = counts.transactions + counts.cards + counts.debts + counts.settings;

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-inset)] px-4 py-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Archivo seleccionado
        </p>
        <p className="text-sm font-medium text-[var(--color-text-body)] break-all">
          {file?.name ?? "—"}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
          Exportado el{" "}
          <time dateTime={payload.exportedAt}>
            {new Date(payload.exportedAt).toLocaleString()}
          </time>{" "}
          · versión {payload.version}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Contenido del respaldo
        </h3>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <CountRow label="Transacciones" count={counts.transactions} />
          <CountRow label="Tarjetas" count={counts.cards} />
          <CountRow label="Deudas" count={counts.debts} />
          <CountRow label="Ajustes" count={counts.settings} />
        </ul>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Total: <strong>{total}</strong> registros.
        </p>
      </div>

      <fieldset className="space-y-2" aria-label="Modo de importación">
        <legend className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
          ¿Cómo aplicar el respaldo?
        </legend>

        <ModeOption
          name="import-mode"
          value="merge"
          checked={mode === "merge"}
          onChange={() => onChangeMode("merge")}
          title="Combinar con los datos existentes"
          description="Los registros del respaldo sobrescriben los actuales cuando coincide el id; el resto queda intacto."
        />
        <ModeOption
          name="import-mode"
          value="replace"
          checked={mode === "replace"}
          onChange={() => onChangeMode("replace")}
          title="Reemplazar todos los datos"
          description="Borra todo lo guardado actualmente y carga sólo el contenido del respaldo. Acción destructiva."
          destructive
        />
      </fieldset>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
        <Button type="button" variant="ghost" onClick={onPickAnother}>
          Elegir otro archivo
        </Button>
        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={mode === "replace" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {mode === "replace" ? "Reemplazar datos" : "Combinar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CountRow({
  label,
  count,
}: {
  label: string;
  count: number;
}): React.JSX.Element {
  return (
    <li className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)] px-3 py-2">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-text-body)]">
        {count}
      </span>
    </li>
  );
}

function ModeOption({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  destructive = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <label
      className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-3 cursor-pointer transition-colors ${
        checked
          ? destructive
            ? "border-[var(--color-danger)] bg-[var(--color-danger)]/5"
            : "border-[var(--color-primary)] bg-[var(--color-surface-inset)]"
          : "border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-inset)]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            destructive
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-text-body)]"
          }`}
        >
          {title}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {description}
        </p>
      </div>
    </label>
  );
}

function ReplaceConfirmStep({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-4">
        <AlertTriangle
          className="size-5 text-[var(--color-danger)] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-sm text-[var(--color-text-body)]">
          <p className="font-semibold text-[var(--color-danger)]">
            Esto borra todo lo guardado actualmente.
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Vamos a eliminar todas las transacciones, tarjetas, deudas y
            ajustes guardados, y luego cargar sólo el contenido del respaldo.
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Volver
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          Sí, reemplazar todo
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  added,
  updated,
  onClose,
}: {
  added: number;
  updated: number;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success)]/5 p-4">
        <Check
          className="size-5 text-[var(--color-success)] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-sm">
          <p className="font-semibold text-[var(--color-success)]">
            Respaldo aplicado.
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Se agregaron <strong>{added}</strong> y se actualizaron{" "}
            <strong>{updated}</strong> registros.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={onClose}>
          Listo
        </Button>
      </div>
    </div>
  );
}

function ErrorStep({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-4">
        <AlertTriangle
          className="size-5 text-[var(--color-danger)] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-sm">
          <p className="font-semibold text-[var(--color-danger)]">
            No pudimos importar el respaldo
          </p>
          <p className="mt-1 text-[var(--color-text-muted)] whitespace-pre-wrap">
            {message}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        <Button type="button" variant="primary" onClick={onRetry}>
          Elegir otro archivo
        </Button>
      </div>
    </div>
  );
}

/**
 * Convert any thrown value into a Spanish message suitable for the user.
 * `ZodError` produces a multi-line breakdown of each issue path.
 */
function humanizeError(err: unknown): string {
  if (err instanceof BackupVersionError) return err.message;
  if (err instanceof ZodError) {
    return err.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join("\n");
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

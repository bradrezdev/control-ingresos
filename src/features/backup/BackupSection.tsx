/**
 * BackupSection — control-ingresos
 *
 * Settings card that exposes the export + import flow. Both buttons live
 * inside a single GlassCard with a short description so the user
 * understands what each action does.
 */
import { useState } from "react";
import { Upload } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ExportBackupButton } from "./ExportBackupButton";
import { ImportBackupDialog } from "./ImportBackupDialog";

export function BackupSection(): React.JSX.Element {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <GlassCard className="p-6 md:p-8">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Respaldo de datos
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Exportá todos tus datos en un archivo JSON o importá un respaldo
          previo. Los archivos se generan y procesan localmente — nunca salen
          de este dispositivo.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
        <ExportBackupButton />
        <Button
          type="button"
          variant="secondary"
          leftIcon={<Upload className="size-4" aria-hidden />}
          onClick={() => setImportOpen(true)}
          aria-label="Importar respaldo desde JSON"
        >
          Importar desde JSON
        </Button>
      </div>

      <ImportBackupDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </GlassCard>
  );
}

/**
 * BackupSection — control-ingresos
 *
 * Settings card that exposes the export + import flow. Both buttons live
 * inside a single PaperCard with a short description so the user
 * understands what each action does.
 */
import { useState } from "react";
import { Upload } from "lucide-react";
import { PaperCard, SectionHeading } from "@/components/ui/design";
import { Button } from "@/components/ui/Button";
import { ExportBackupButton } from "./ExportBackupButton";
import { ImportBackupDialog } from "./ImportBackupDialog";

export function BackupSection(): React.JSX.Element {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <PaperCard className="p-5">
      <SectionHeading title="Respaldo de datos" />
      <p className="mt-1 text-aux text-muted">
        Exporta todos tus datos en un archivo JSON o importa un respaldo
        previo. Los archivos se generan y procesan localmente — nunca salen
        de este dispositivo.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-start">
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
    </PaperCard>
  );
}

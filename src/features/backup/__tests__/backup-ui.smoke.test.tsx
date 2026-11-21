/**
 * Backup UI smoke tests
 *
 * Mount each component once and assert that it renders without throwing
 * and that the expected affordances are present.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupSection } from "../BackupSection";
import { ExportBackupButton } from "../ExportBackupButton";
import { ImportBackupDialog } from "../ImportBackupDialog";

describe("BackupSection", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders title + both buttons", () => {
    render(<BackupSection />);
    expect(screen.getByText("Respaldo de datos")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Exportar información en JSON/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Importar información desde JSON/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders both actions at the same width", () => {
    render(<BackupSection />);
    const exportBtn = screen.getByRole("button", {
      name: /Exportar información en JSON/i,
    });
    const importBtn = screen.getByRole("button", {
      name: /Importar información desde JSON/i,
    });
    // Same size means the same layout contract: both stretch to the
    // container width instead of one sizing to its content.
    expect(exportBtn.className).toContain("w-full");
    expect(importBtn.className).toContain("w-full");
  });

  it("opens the import dialog when clicking Import", async () => {
    const user = userEvent.setup();
    render(<BackupSection />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: /Importar información desde JSON/i,
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Importar respaldo")).toBeInTheDocument();
  });

  it("uses tuteo (es-MX) in its copy", () => {
    render(<BackupSection />);
    expect(
      screen.getByText(
        /Exporta todos tus datos en un archivo JSON o importa un respaldo previo/,
      ),
    ).toBeInTheDocument();
  });
});

describe("ExportBackupButton", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders with the download icon and label", () => {
    render(<ExportBackupButton />);
    expect(
      screen.getByRole("button", { name: /Exportar información en JSON/i }),
    ).toBeInTheDocument();
  });
});

describe("ImportBackupDialog", () => {
  beforeEach(() => {
    cleanup();
  });

  it("does not render when closed", () => {
    render(<ImportBackupDialog open={false} onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the picker step when opened", () => {
    render(<ImportBackupDialog open={true} onClose={() => undefined} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Elegir archivo/i })).toBeInTheDocument();
  });

  it("uses tuteo (es-MX) in the dialog copy", () => {
    render(<ImportBackupDialog open={true} onClose={() => undefined} />);
    expect(
      screen.getByText(/Carga un archivo JSON exportado previamente/i),
    ).toBeInTheDocument();
    // The picker copy is "Elige un archivo .json…" (text split around <code>).
    expect(screen.getByText(/Elige un archivo/)).toBeInTheDocument();
  });
});

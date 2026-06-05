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
      screen.getByRole("button", { name: /Exportar respaldo en JSON/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Importar respaldo desde JSON/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens the import dialog when clicking Import", async () => {
    const user = userEvent.setup();
    render(<BackupSection />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: /Importar respaldo desde JSON/i,
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Importar respaldo")).toBeInTheDocument();
  });
});

describe("ExportBackupButton", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders with the download icon and label", () => {
    render(<ExportBackupButton />);
    expect(
      screen.getByRole("button", { name: /Exportar respaldo en JSON/i }),
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
});

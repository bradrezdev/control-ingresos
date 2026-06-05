/**
 * Tests for the bank tint lookup. Pure helper, no React needed.
 */
import { describe, expect, it } from "vitest";
import { tintFor, BANK_TINT } from "./bankTint";

describe("tintFor", () => {
  it("returns a known tint for an exact bank name", () => {
    expect(tintFor("BBVA").label).toBe("BBVA");
    expect(tintFor("Santander").label).toBe("Santander");
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(tintFor("  bbva  ").label).toBe("BBVA");
    expect(tintFor("SANTANDER").label).toBe("Santander");
  });

  it("falls back to default for unknown banks", () => {
    expect(tintFor("").label).toBe("Tarjeta");
    expect(tintFor("Banco Desconocido").label).toBe("Tarjeta");
  });

  it("exposes the full BANK_TINT map with the default key", () => {
    expect(BANK_TINT.default).toBeDefined();
    expect(BANK_TINT.default.label).toBe("Tarjeta");
  });
});

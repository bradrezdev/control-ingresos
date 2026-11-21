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

  it("exposes a flat card face for every tint (bg, ink, edge, muted)", () => {
    for (const tint of Object.values(BANK_TINT)) {
      expect(tint.face.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tint.face.ink).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tint.face.edge).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tint.face.muted).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tint.face.ink).not.toBe(tint.face.bg);
    }
  });

  it("gives each known bank a sober face and unknown banks the ink face", () => {
    expect(tintFor("BBVA").face).toBe(BANK_TINT.bbva!.face);
    expect(tintFor("Banco Desconocido").face).toBe(BANK_TINT.default.face);
    expect(BANK_TINT.default.face.bg).toBe("#233c63");
  });

  it("keeps the four prototype skin palettes distinct", () => {
    const backgrounds = new Set(Object.values(BANK_TINT).map((t) => t.face.bg));
    expect(backgrounds.size).toBeGreaterThanOrEqual(4);
  });
});

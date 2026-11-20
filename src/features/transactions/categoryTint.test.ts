import { describe, expect, it } from "vitest";
import { tintForCategory, CATEGORY_TINT } from "./categoryTint";

describe("tintForCategory", () => {
  it("returns a known tint for an exact category", () => {
    const tint = tintForCategory("Comida");
    expect(tint.bg).toBe(CATEGORY_TINT.comida.bg);
    expect(tint.text).toBe(CATEGORY_TINT.comida.text);
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(tintForCategory("  COMIDA  ").bg).toBe(CATEGORY_TINT.comida.bg);
    expect(tintForCategory("Transporte").text).toBe(CATEGORY_TINT.transporte.text);
  });

  it("falls back to default for unknown or empty categories", () => {
    expect(tintForCategory("").bg).toBe(CATEGORY_TINT.default.bg);
    expect(tintForCategory("Categoría rara").text).toBe(CATEGORY_TINT.default.text);
    expect(tintForCategory(undefined).bg).toBe(CATEGORY_TINT.default.bg);
  });

  it("exposes the full CATEGORY_TINT map with the default key", () => {
    expect(CATEGORY_TINT.default).toBeDefined();
    expect(CATEGORY_TINT.default.bg).toBeDefined();
    expect(CATEGORY_TINT.default.text).toBeDefined();
  });
});

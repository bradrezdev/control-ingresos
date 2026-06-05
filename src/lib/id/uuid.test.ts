import { describe, expect, it } from "vitest";
import { uuid } from "./uuid";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("uuid", () => {
  it("returns a valid v4 UUID", () => {
    const id = uuid();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("returns different values across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(ids.size).toBe(100);
  });

  it("has the correct length (36 chars including dashes)", () => {
    expect(uuid()).toHaveLength(36);
  });
});

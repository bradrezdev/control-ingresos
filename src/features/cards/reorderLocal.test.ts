/**
 * Tests for the pure reorder helper.
 */
import { describe, expect, it } from "vitest";
import { reorderLocal } from "./reorderLocal";

describe("reorderLocal", () => {
  it("moves an item forward (down the list)", () => {
    expect(reorderLocal(["a", "b", "c", "d"], "a", 3)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item backward (up the list)", () => {
    expect(reorderLocal(["a", "b", "c", "d"], "d", 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("moves to the middle", () => {
    expect(reorderLocal(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "a", "c", "d"]);
  });

  it("clamps target index at the end (append)", () => {
    expect(reorderLocal(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
  });

  it("clamps target index at 0 (prepend)", () => {
    expect(reorderLocal(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when target equals the current position (returns new array)", () => {
    const list = ["a", "b", "c"];
    const next = reorderLocal(list, "b", 1);
    expect(next).toEqual(["a", "b", "c"]);
    expect(next).not.toBe(list);
  });

  it("is a no-op when target is current + 1 (the post-removal position)", () => {
    // a at 0, target 1: removing a leaves [b, c], inserting at adjusted
    // 0 (= 1 - 1) puts a back where it was. No-op.
    const list = ["a", "b", "c"];
    const next = reorderLocal(list, "a", 1);
    expect(next).toEqual(["a", "b", "c"]);
    expect(next).not.toBe(list);
  });

  it("returns a copy when the id is not in the list", () => {
    const list = ["a", "b", "c"];
    const next = reorderLocal(list, "missing", 1);
    expect(next).toEqual(["a", "b", "c"]);
    expect(next).not.toBe(list);
  });
});

/**
 * Pure reorder helper used by the cards drag-and-drop list.
 *
 * Given an ordered list of IDs, the id being moved, and the target
 * index, returns a new array with the item moved. The target index is
 * interpreted in the "before reorder" coordinate system: if you drop
 * between items at positions N and N+1, the target index is N+1.
 *
 * No-op detections: returns a new array (not the same reference) when
 * the move is trivially redundant, so callers can compare by identity
 * to skip `setState`.
 */
export function reorderLocal(
  list: readonly string[],
  fromId: string,
  toIndex: number,
): string[] {
  const fromIndex = list.indexOf(fromId);
  if (fromIndex < 0) return [...list];
  const clampedTo = Math.max(0, Math.min(list.length, toIndex));
  // Detect "no-op" cases. When dragging down by one, the target index
  // is the current position + 1. When dragging up, target index ===
  // current position. Returning a fresh array lets callers do an
  // identity check (`if (next === list) return`) to avoid setState.
  if (fromIndex === clampedTo || fromIndex === clampedTo - 1) return [...list];

  const next = [...list];
  const removed = next.splice(fromIndex, 1);
  const moved = removed[0];
  if (moved === undefined) return [...list];
  const adjusted = clampedTo > fromIndex ? clampedTo - 1 : clampedTo;
  next.splice(adjusted, 0, moved);
  return next;
}

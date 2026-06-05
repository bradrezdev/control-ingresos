/**
 * UUID utilities — control-ingresos
 *
 * Wraps `crypto.randomUUID()` with a Math.random fallback for very old
 * environments or test contexts that don't expose crypto.
 *
 * All IDs in the app are UUIDs (per Zod schemas that use `z.uuid()`).
 */

/**
 * Generate a RFC 4122 v4 UUID string. Uses the global `crypto.randomUUID()`
 * when available, otherwise falls back to a `Math.random()` based generator
 * suitable for non-security-critical local IDs.
 */
export function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return fallbackUuid();
}

function fallbackUuid(): string {
  // Standard v4 UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const bytes = new Array(16)
    .fill(0)
    .map(() => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const b = bytes;
  return (
    hex(b[0]!) +
    hex(b[1]!) +
    hex(b[2]!) +
    hex(b[3]!) +
    "-" +
    hex(b[4]!) +
    hex(b[5]!) +
    "-" +
    hex(b[6]!) +
    hex(b[7]!) +
    "-" +
    hex(b[8]!) +
    hex(b[9]!) +
    "-" +
    hex(b[10]!) +
    hex(b[11]!) +
    hex(b[12]!) +
    hex(b[13]!) +
    hex(b[14]!) +
    hex(b[15]!)
  );
}

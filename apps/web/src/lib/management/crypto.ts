import { scryptSync, timingSafeEqual } from "node:crypto";

export function verifyScryptPassword(password: string, encoded: string): boolean {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  try {
    const actual = scryptSync(password, Buffer.from(salt, "base64url"), 32);
    const expectedBytes = Buffer.from(expected, "base64url");
    return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
  } catch {
    return false;
  }
}

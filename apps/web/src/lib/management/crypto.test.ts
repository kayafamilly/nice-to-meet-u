import { randomBytes, scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyScryptPassword } from "@/lib/management/crypto";

describe("management password hashing", () => {
  it("accepts only the password represented by a salted scrypt hash", () => {
    const salt = randomBytes(16);
    const encoded = `${salt.toString("base64url")}:${scryptSync("owner-passphrase", salt, 32).toString("base64url")}`;
    expect(verifyScryptPassword("owner-passphrase", encoded)).toBe(true);
    expect(verifyScryptPassword("wrong", encoded)).toBe(false);
  });

  it("fails closed for malformed hashes", () => {
    expect(verifyScryptPassword("anything", "invalid")).toBe(false);
  });
});

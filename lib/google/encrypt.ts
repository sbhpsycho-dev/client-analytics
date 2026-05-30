import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.SHEET_TOKEN_SECRET;
  if (!secret) throw new Error("SHEET_TOKEN_SECRET is not set");
  return Buffer.from(secret, "base64").slice(0, 32);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.slice(0, IV_LENGTH);
  const tag = buf.slice(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buf.slice(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

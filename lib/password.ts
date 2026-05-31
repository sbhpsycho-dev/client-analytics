import { compareSync, hashSync } from "bcryptjs";

export function verifyPassword(plain: string, hash: string): boolean {
  return compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
  return hashSync(plain, 12);
}

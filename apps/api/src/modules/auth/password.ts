import { randomBytes } from "node:crypto";

import argon2 from "argon2";

const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

export const hashPassword = async (password: string): Promise<string> =>
  argon2.hash(password, argon2Options);

const dummyHash = hashPassword(randomBytes(32).toString("base64url"));

export const verifyPassword = async (
  passwordHash: string | null,
  candidate: string,
): Promise<boolean> => {
  const hash = passwordHash ?? (await dummyHash);

  try {
    const matches = await argon2.verify(hash, candidate);
    return passwordHash === null ? false : matches;
  } catch {
    return false;
  }
};

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
// Long-lived session so each device stays signed in after one login (spec §3).
export const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ authed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.authed === true;
  } catch {
    return false;
  }
}

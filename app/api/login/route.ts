import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

// Small, escalating delay on failed attempts to slow brute force (spec §3).
// In-memory is best-effort on serverless, so a base delay always applies.
const failures = new Map<string, { count: number; last: number }>();
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function passwordsMatch(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Compare anyway to keep timing roughly constant.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  let password = "";
  try {
    const body = await request.json();
    if (typeof body?.password === "string") password = body.password;
  } catch {
    // fall through with empty password
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const entry = failures.get(ip);
  const recentCount =
    entry && Date.now() - entry.last < FAILURE_WINDOW_MS ? entry.count : 0;

  if (!password || !passwordsMatch(password, expected)) {
    failures.set(ip, { count: recentCount + 1, last: Date.now() });
    const delay = Math.min(
      BASE_DELAY_MS * Math.pow(2, recentCount),
      MAX_DELAY_MS
    );
    await sleep(delay);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  failures.delete(ip);
  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

import { NextResponse } from "next/server";

// Small per-IP limiter for the AI routes, so one visitor can't use up the
// shared free Gemini quota for everyone. It lives in memory, so each server
// instance counts separately: a safety net, not a hard guarantee.
export const AI_LIMIT = 20; // requests
export const AI_WINDOW_MS = 60_000; // per minute

const hits = new Map<string, number[]>();

export function rateLimited(req: Request): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < AI_WINDOW_MS);
  if (recent.length >= AI_LIMIT) {
    const wait = Math.ceil((AI_WINDOW_MS - (now - recent[0])) / 1000);
    return NextResponse.json(
      { error: `You're going a little fast. Try again in ${wait} seconds.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return null;
}

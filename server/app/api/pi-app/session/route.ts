import { NextRequest, NextResponse } from "next/server";
import { getAuthRetryAfterMs, recordAuthFailure, recordAuthSuccess, retryAfterSeconds } from "@/lib/auth-throttle";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import {
  createAppSessionToken,
  isAppTokenEnabled,
  isValidAppTokenValue,
  PI_APP_SESSION_COOKIE,
  PI_APP_SESSION_MAX_AGE,
} from "@/lib/pi-app-auth";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:"
    || request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() === "https";
}

/** Pi-App browser pairing: trade the QR's token for a session cookie. */
export async function POST(request: NextRequest) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403, headers: noStore });
  if (!hasJsonContentType(request)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415, headers: noStore });
  if (!isAppTokenEnabled()) return NextResponse.json({ error: "Pairing is not enabled on this server" }, { status: 404, headers: noStore });

  const retryAfterMs = getAuthRetryAfterMs();
  if (retryAfterMs > 0) {
    return NextResponse.json({ error: "Too many failed attempts", retryAfterMs }, {
      status: 429, headers: { ...noStore, "Retry-After": String(retryAfterSeconds(retryAfterMs)) },
    });
  }

  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!isValidAppTokenValue(body?.token)) {
    recordAuthFailure();
    return NextResponse.json({ error: "Invalid pairing code" }, { status: 401, headers: noStore });
  }
  recordAuthSuccess();

  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set({
    name: PI_APP_SESSION_COOKIE,
    value: createAppSessionToken() ?? "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: PI_APP_SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isApiRequestAllowed(request)) return NextResponse.json({ error: "Untrusted API request" }, { status: 403, headers: noStore });
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set({ name: PI_APP_SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: isSecureRequest(request), path: "/", maxAge: 0 });
  return response;
}

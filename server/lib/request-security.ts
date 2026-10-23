import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

function normalizeHostname(value: string): string {
  const unbracketed = value.startsWith("[") && value.endsWith("]")
    ? value.slice(1, -1)
    : value;
  return unbracketed.toLowerCase().replace(/\.$/, "");
}

function hostnameFromAuthority(value: string): string | null {
  if (!value || /[\s/@\\]/.test(value)) return null;
  try {
    const parsed = new URL(`http://${value}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return null;
    }
    return normalizeHostname(parsed.hostname);
  } catch {
    return null;
  }
}

function normalizeAuthority(value: string): string | null {
  if (!value || /[\s/@\\]/.test(value)) return null;
  try {
    const parsed = new URL(`http://${value}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return null;
    }
    const hostname = normalizeHostname(parsed.hostname);
    return parsed.port ? `${hostname}:${parsed.port}` : hostname;
  } catch {
    return null;
  }
}

function normalizeConfiguredHostname(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return isIP(trimmed) ? normalizeHostname(trimmed) : hostnameFromAuthority(trimmed);
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function configuredHostnamesFromEnvironment(): string[] {
  return [
    process.env.PI_WEB_HOSTNAME,
    ...(process.env.PI_WEB_ALLOWED_HOSTS?.split(",") ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));
}

function canonicalOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(request: Request): string | null {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  return host ? canonicalOrigin(`${requestUrl.protocol}//${host}`) : null;
}

function isPdfFileReadUrl(url: URL): boolean {
  if (!url.pathname.startsWith("/api/files/") || url.searchParams.get("type") !== "read") return false;
  const lastSegment = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(lastSegment).toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

/**
 * A top-level GET the user clicked can arrive marked cross-site with no Origin
 * when the page holding the link has an opaque origin: a PWA's own window
 * opening the session export, or Android Chrome's `data:` placeholder for a PDF
 * it will not render in the viewer's iframe (#1298). Only routes with no side
 * effect whose response cannot run script in the Pi Web origin qualify: the
 * export page (framing denied) and `type=read` of a `.pdf`, which the route
 * always serves as `application/pdf` with nosniff. The opening page cannot
 * read either response.
 */
function isUserInitiatedDocumentNavigation(request: Request): boolean {
  if (
    request.method !== "GET"
    || request.headers.get("sec-fetch-mode") !== "navigate"
    || request.headers.get("sec-fetch-dest") !== "document"
    || request.headers.get("sec-fetch-user") !== "?1"
  ) {
    return false;
  }

  try {
    const url = new URL(request.url);
    return /^\/api\/sessions\/[^/]+\/export$/.test(url.pathname) || isPdfFileReadUrl(url);
  } catch {
    return false;
  }
}

/**
 * Only trust local names, IP literals, or the hostname explicitly selected by
 * the operator. IP literals preserve LAN access but cannot be DNS-rebound
 * because the browser keeps the literal address in the Host header.
 */
export function isApiRequestHostAllowed(
  request: Request,
  configuredHostnames = configuredHostnamesFromEnvironment(),
): boolean {
  const host = request.headers.get("host");
  const hostname = host ? hostnameFromAuthority(host) : null;
  if (!hostname) return false;
  if (isLoopbackHostname(hostname) || isIP(hostname)) return true;

  return configuredHostnames.some(
    (configured) => normalizeConfiguredHostname(configured) === hostname,
  );
}

/**
 * A relay can report the external scheme in `x-forwarded-proto` while rewriting
 * `Origin` onto the backend authority, so the two disagree on the scheme alone
 * for a request that really is same-origin (Azure Dev Tunnels does this). Accept
 * that pairing only when the Origin's authority still equals the Host header,
 * a proxy is in front, and Fetch Metadata still reports a same-origin request.
 */
function isProxyRewrittenSameOrigin(request: Request, origin: string): boolean {
  if (
    request.headers.get("sec-fetch-site") !== "same-origin"
    || !request.headers.get("x-forwarded-proto")
  ) return false;

  const host = request.headers.get("host");
  if (!host) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const originAuthority = normalizeAuthority(originHost);
  return originAuthority !== null && originAuthority === normalizeAuthority(host);
}

/** Reject browser cross-site API requests while preserving non-browser clients. */
export function isApiRequestOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return true;

  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin !== null && canonicalOrigin(origin) === requestOrigin) return true;

  return isProxyRewrittenSameOrigin(request, origin);
}

export function shouldCheckApiRequestOrigin(request: Request): boolean {
  return request.headers.has("origin") || request.headers.has("sec-fetch-site");
}

export function isApiRequestAllowed(
  request: Request,
  configuredHostnames = configuredHostnamesFromEnvironment(),
): boolean {
  // Pi-App: a request carrying the pairing token is the paired Android app
  // (or a CLI client). The token defeats both DNS rebinding and cross-site
  // forgery, so its Host may be a Tailscale/LAN name and its Origin the app's
  // WebView origin. Any other browser origin is still refused.
  if (isValidAppToken(request)) {
    const origin = request.headers.get("origin");
    if (!origin || isAppOrigin(origin)) return true;
  }
  if (!isApiRequestHostAllowed(request, configuredHostnames)) return false;
  if (isUserInitiatedDocumentNavigation(request)) return true;
  return !shouldCheckApiRequestOrigin(request) || isApiRequestOriginAllowed(request);
}

export function hasJsonContentType(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json"
    || Boolean(mediaType?.startsWith("application/") && mediaType.endsWith("+json"));
}

// ---------------------------------------------------------------------------
/*
 * Pi-App bridge auth: a pairing token the Android app sends as
 * `Authorization: Bearer <token>`, and the CORS rules for the app's WebView
 * origin. The rest of the server (agent, sessions, files, SSE) is pi-web's,
 * unchanged.
 *
 * Token: PI_APP_TOKEN, or the one `pi-app` generated and stored in
 * <PI_CODING_AGENT_DIR or ~/.pi/agent>/pi-app.json (the CLI writes it and
 * exports PI_APP_TOKEN to this process before Next starts).
 */

/** WebView origins of the Capacitor app (androidScheme "http"). */
const DEFAULT_APP_ORIGINS = ["http://localhost", "https://localhost", "capacitor://localhost"];

function hash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function getAppToken(token: string | undefined = process.env.PI_APP_TOKEN): string | null {
  const trimmed = token?.trim();
  return trimmed && trimmed.length >= 24 ? trimmed : null;
}

export function isAppTokenEnabled(): boolean {
  return getAppToken() !== null;
}

/** Bearer header, or `?pi_app_token=` for the few GETs a WebView opens without headers (downloads, PDF). */
export function isValidAppToken(request: Request, expected = getAppToken()): boolean {
  if (!expected) return false;
  let supplied: string | null = null;
  const authorization = request.headers.get("authorization");
  const bearer = authorization ? /^Bearer\s+(\S+)$/i.exec(authorization) : null;
  if (bearer) supplied = bearer[1];
  if (!supplied && request.method === "GET") {
    try {
      supplied = new URL(request.url).searchParams.get("pi_app_token");
    } catch {
      supplied = null;
    }
  }
  if (!supplied) return false;
  return timingSafeEqual(hash(supplied), hash(expected));
}

export function appAllowedOrigins(): string[] {
  const extra = process.env.PI_APP_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return [...DEFAULT_APP_ORIGINS, ...extra];
}

export function isAppOrigin(origin: string | null): origin is string {
  if (!origin || !isAppTokenEnabled()) return false;
  return appAllowedOrigins().includes(origin);
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Last-Event-ID, X-Pi-App",
    "Access-Control-Expose-Headers": "Content-Disposition, Retry-After, X-Pi-Web-Version",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/*
 * Browser pairing: the QR opens `<server>/pair#t=<token>` in the phone's browser.
 * That page trades the token for this cookie, so the browser uses pi-web's own
 * UI without a password. The cookie is signed with the token: rotating the token
 * (`pi-app token --rotate`) signs every paired browser out.
 */
export const PI_APP_SESSION_COOKIE = "pi_app_session";
export const PI_APP_SESSION_MAX_AGE = 60 * 60 * 24 * 90;

function appSessionSignature(payload: string, token: string): string {
  return createHmac("sha256", token).update(`pi-app-session:${payload}`, "utf8").digest("hex");
}

export function isValidAppTokenValue(supplied: unknown, expected = getAppToken()): boolean {
  if (!expected || typeof supplied !== "string" || !supplied) return false;
  return timingSafeEqual(hash(supplied), hash(expected));
}

export function createAppSessionToken(
  token = getAppToken(),
  now = Date.now(),
  nonce = randomBytes(16).toString("hex"),
): string | null {
  if (!token) return null;
  const payload = `v1.${Math.floor(now / 1000) + PI_APP_SESSION_MAX_AGE}.${nonce}`;
  return `${payload}.${appSessionSignature(payload, token)}`;
}

export function isValidAppSessionToken(value: string | undefined, token = getAppToken(), now = Date.now()): boolean {
  if (!value || !token) return false;
  const match = /^(v1\.(\d+)\.[a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expiresAt = Number(match[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
  return timingSafeEqual(hash(match[3]), hash(appSessionSignature(match[1], token)));
}

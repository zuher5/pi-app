/**
 * The bridge: once paired, every `/api/...` request the client makes — ours
 * and the upstream pi-web client modules we reuse verbatim — goes to the paired
 * server with the token. Upstream code keeps calling `fetch("/api/...")` and
 * `new EventSource("/api/...")` exactly as it does in pi-web.
 */
import { FetchEventSource } from "./sse";
import type { Connection } from "./pairing";

let active: Connection | null = null;
const nativeFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export function currentConnection(): Connection | null {
  return active;
}

function isApiPath(input: string): boolean {
  return input === "/api" || input.startsWith("/api/") || input.startsWith("/api?");
}

/** `/api/x` → `http://server:port/api/x`; anything else untouched. */
export function resolveApiUrl(input: string, connection = active): string {
  if (!connection || !isApiPath(input)) return input;
  return `${connection.url}${input}`;
}

/** For URLs a WebView opens without our headers (downloads, PDFs, images). */
export function authedApiUrl(input: string, connection = active): string {
  const url = resolveApiUrl(input, connection);
  if (!connection || url === input) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("pi_app_token", connection.token);
  return parsed.toString();
}

function withAuth(init: RequestInit | undefined, connection: Connection): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${connection.token}`);
  return { ...init, headers };
}

export const bridgedFetch: typeof fetch = (input, init) => {
  const connection = active;
  if (connection) {
    if (typeof input === "string" && isApiPath(input)) {
      return nativeFetch(resolveApiUrl(input, connection), withAuth(init, connection));
    }
    if (input instanceof URL && input.origin === location.origin && isApiPath(input.pathname)) {
      return nativeFetch(resolveApiUrl(input.pathname + input.search, connection), withAuth(init, connection));
    }
    if (typeof input === "string" && input.startsWith(connection.url)) {
      return nativeFetch(input, withAuth(init, connection));
    }
  }
  return nativeFetch(input, init);
};

class BridgedEventSource extends FetchEventSource {
  constructor(url: string | URL) {
    const connection = active;
    const raw = typeof url === "string" ? url : url.pathname + url.search;
    super(resolveApiUrl(raw, connection), {
      headers: connection ? { Authorization: `Bearer ${connection.token}` } : {},
      fetchImpl: nativeFetch,
    });
  }
}

export function installBridge(connection: Connection | null): void {
  active = connection;
  globalThis.fetch = bridgedFetch;
  (globalThis as unknown as { EventSource: unknown }).EventSource = BridgedEventSource;
}

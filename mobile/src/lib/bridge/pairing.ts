/**
 * Pairing: what `pi-app` prints as a QR code —
 *   piapp://pair?u=http://192.168.1.5:30141&u=http://100.88.1.2:30141&t=<token>&n=<host>
 * — parsed, probed, and remembered.
 */
export interface Pairing {
  /** Candidate server URLs, best first (Tailscale before LAN). */
  urls: string[];
  token: string;
  /** Machine name the server reported, for the UI. */
  name: string;
}

export interface Connection {
  url: string;
  token: string;
  name: string;
}

export class PairingError extends Error {}

function cleanUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parsePairingLink(text: string): Pairing {
  const trimmed = text.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new PairingError("That is not a Pi-App pairing code.");
  }
  if (url.protocol !== "piapp:") throw new PairingError("That is not a Pi-App pairing code.");
  // piapp://pair?... parses with host "pair" on WHATWG URL.
  const params = url.searchParams;
  const urls = params.getAll("u").map(cleanUrl).filter((u): u is string => u !== null);
  const token = params.get("t")?.trim() ?? "";
  if (urls.length === 0) throw new PairingError("The code has no server address.");
  if (token.length < 24) throw new PairingError("The code has no valid token.");
  return { urls: [...new Set(urls)], token, name: params.get("n")?.trim() || "pi" };
}

export function manualPairing(server: string, token: string): Pairing {
  const withScheme = /^[a-z]+:\/\//i.test(server.trim()) ? server.trim() : `http://${server.trim()}`;
  let url = cleanUrl(withScheme);
  if (url && !new URL(url).port && new URL(withScheme).protocol === "http:") url = `${url}:30141`;
  if (!url) throw new PairingError("Enter an address like 192.168.1.5:30141.");
  if (token.trim().length < 24) throw new PairingError("The token is the long code under the QR.");
  return { urls: [url], token: token.trim(), name: new URL(url).hostname };
}

export type ProbeResult =
  | { ok: true; url: string }
  | { ok: false; reason: "unreachable" | "unauthorized" | "not-pi"; url: string };

/** One cheap authenticated read: the running-session snapshot. */
export async function probe(url: string, token: string, timeoutMs = 4000, fetchImpl: typeof fetch = fetch): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${url}/api/agent/running`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", url };
    if (!res.ok) return { ok: false, reason: "not-pi", url };
    const body = await res.json().catch(() => null);
    return body && Array.isArray(body.runningSessionIds) ? { ok: true, url } : { ok: false, reason: "not-pi", url };
  } catch {
    return { ok: false, reason: "unreachable", url };
  } finally {
    clearTimeout(timer);
  }
}

/** Try every candidate at once; the first that answers wins, in listed order on ties. */
export async function connect(pairing: Pairing, fetchImpl: typeof fetch = fetch): Promise<Connection> {
  const results = await Promise.all(pairing.urls.map((u) => probe(u, pairing.token, 4000, fetchImpl)));
  const hit = results.find((r) => r.ok);
  if (hit) return { url: hit.url, token: pairing.token, name: pairing.name };
  if (results.some((r) => !r.ok && r.reason === "unauthorized")) {
    throw new PairingError("The server refused the token. Run `pi-app pair` and scan again.");
  }
  throw new PairingError("Can't reach the server. Is `pi-app` running and the phone on the same network or Tailscale?");
}

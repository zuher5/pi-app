/** Thin typed wrappers over pi-web's HTTP API (calls go through the bridge). */
import type { AgentMessage, SessionInfo } from "@pi/types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("network", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error || res.statusText, res.status);
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export interface SessionSnapshot {
  sessionId: string;
  info: (SessionInfo & { projectRoot?: string; branch?: string }) | null;
  leafId: string | null;
  context: { messages: AgentMessage[]; entryIds: string[]; oldestEntryId?: string; hasMore: boolean; model?: { provider: string; modelId: string } | null; thinkingLevel?: string };
  stats?: { tokens: { total: number }; cost: number };
}

export type ListedSession = SessionInfo & { projectRoot?: string; projectKey?: string; branch?: string };

export const api = {
  sessions: () => json<{ sessions: ListedSession[] }>("/api/sessions"),
  session: (id: string) =>
    json<SessionSnapshot>(`/api/sessions/${encodeURIComponent(id)}?tree=summary&tail=50&deferThinking&deferMedia&force=1`),
  older: (id: string, leafId: string | null, before: string) =>
    json<{ context: SessionSnapshot["context"] }>(`/api/sessions/${encodeURIComponent(id)}/context?tail=50&deferThinking&deferMedia&before=${encodeURIComponent(before)}${leafId ? `&leafId=${encodeURIComponent(leafId)}` : ""}`),
  running: () => json<{ runningSessionIds: string[] }>("/api/agent/running"),
  newSession: (cwd: string) => json<{ sessionId: string; model: { provider: string; modelId: string } | null }>("/api/agent/new", post({ cwd, type: "ensure_session" })),
  command: <T = unknown>(id: string, body: Record<string, unknown>) => json<{ success?: boolean; data?: T }>(`/api/agent/${encodeURIComponent(id)}`, post(body)),
};

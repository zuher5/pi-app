/** Thin typed wrappers over pi-web's HTTP API (calls go through the bridge). */
import type { AgentMessage, SessionInfo } from "@pi/types";
import { encodeFilePathForApi } from "@pi/file-paths";
import type { GitFileDiffResponse, GitStatusResponse } from "@pi/git-types";

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
  tree?: TreeNode[];
  stats?: { tokens: { total: number }; cost: number };
}

export interface TreeNode {
  entry: { id: string; parentId: string | null; type: string; timestamp: string };
  children: TreeNode[];
  compressedEntryIds?: string[];
  branchPreview?: { role: string; text: string };
}

export interface ModelsResponse {
  modelList: { id: string; name: string; provider: string; input?: string[] }[];
  defaultModel: { provider: string; modelId: string } | null;
  thinkingLevels: Record<string, string[]>;
}

export type ListedSession = SessionInfo & { projectRoot?: string; projectKey?: string; branch?: string };

export const api = {
  sessions: () => json<{ sessions: ListedSession[] }>("/api/sessions"),
  session: (id: string) =>
    json<SessionSnapshot>(`/api/sessions/${encodeURIComponent(id)}?tree=summary&tail=50&deferThinking&deferMedia&force=1`),
  older: (id: string, leafId: string | null, before: string) =>
    json<{ context: SessionSnapshot["context"] }>(`/api/sessions/${encodeURIComponent(id)}/context?tail=50&deferThinking&deferMedia&before=${encodeURIComponent(before)}${leafId ? `&leafId=${encodeURIComponent(leafId)}` : ""}`),
  models: (cwd: string) => json<ModelsResponse>(`/api/models?cwd=${encodeURIComponent(cwd)}`),
  running: () => json<{ runningSessionIds: string[] }>("/api/agent/running"),
  newSession: (cwd: string) => json<{ sessionId: string; model: { provider: string; modelId: string } | null }>("/api/agent/new", post({ cwd, type: "ensure_session" })),
  command: <T = unknown>(id: string, body: Record<string, unknown>) => json<{ success?: boolean; data?: T }>(`/api/agent/${encodeURIComponent(id)}`, post(body)),
};

// ---- Files, Git, Terminal ----

export interface DirEntry { name: string; isDir: boolean; hidden?: string; linkTarget?: string }
export interface TextChunk { content: string; nextOffset: number; truncated: boolean; language?: string; size: number; mtime: string }
export interface FileMeta { size: number; mtime: string; language?: string; mime: string; previewKind?: string }
export interface UploadResult { uploaded: string[]; skipped: string[]; errors: { name: string; error: string }[] }

const fileUrl = (p: string, query: string) => `/api/files/${encodeFilePathForApi(p)}?${query}`;

export const files = {
  url: fileUrl,
  list: (dir: string, hidden = false) => json<{ entries: DirEntry[]; path: string }>(fileUrl(dir, `type=list${hidden ? "&hidden=1" : ""}`)),
  meta: (p: string) => json<FileMeta>(fileUrl(p, "type=meta")),
  /** Whole text file, chunk by chunk, up to `limit` bytes. */
  async readText(p: string, limit = 2 * 1024 * 1024): Promise<TextChunk> {
    let first = await json<TextChunk>(fileUrl(p, "type=read"));
    let content = first.content;
    while (first.truncated && first.nextOffset < limit) {
      const next = await json<TextChunk>(fileUrl(p, `type=read&offset=${first.nextOffset}`));
      content += next.content;
      first = { ...first, nextOffset: next.nextOffset, truncated: next.truncated };
    }
    return { ...first, content };
  },
  async upload(dir: string, list: File[], conflict: "error" | "overwrite" | "skip" = "error"): Promise<UploadResult & { conflicts?: string[] }> {
    const form = new FormData();
    for (const f of list) form.append("files", f, f.name);
    const res = await fetch(fileUrl(dir, `type=upload&conflict=${conflict}`), { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) return { uploaded: [], skipped: [], errors: [], conflicts: body.conflicts ?? [] };
    if (!res.ok) throw new ApiError(body.error || res.statusText, res.status);
    return body;
  },
  /** pi-web has no write endpoint; saving replaces the file through upload, unchanged backend. */
  save: (path: string, text: string) => {
    const slash = path.lastIndexOf("/");
    const dir = slash <= 0 ? "/" : path.slice(0, slash);
    const name = path.slice(slash + 1);
    return files.upload(dir, [new File([text], name, { type: "text/plain" })], "overwrite");
  },
};

export const git = {
  status: (cwd: string) => json<GitStatusResponse>(`/api/git/status?cwd=${encodeURIComponent(cwd)}`),
  diff: (cwd: string, path: string) => json<GitFileDiffResponse>(`/api/git/diff?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(path)}`),
};

export const terminal = {
  open: (cwd: string, cols: number, rows: number, id?: string) => json<{ id: string }>("/api/terminal", post({ cwd, cols, rows, ...(id ? { id } : {}) })),
  alive: (id: string) => json<{ id: string; cwd: string }>(`/api/terminal/${id}`),
  input: (id: string, data: string) => json(`/api/terminal/${id}`, post({ type: "input", data })),
  resize: (id: string, cols: number, rows: number) => json(`/api/terminal/${id}`, post({ type: "resize", cols, rows })),
  close: (id: string) => json(`/api/terminal/${id}`, { method: "DELETE" }),
};

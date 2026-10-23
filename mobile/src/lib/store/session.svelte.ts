/**
 * One open session: its transcript, the live stream, and the agent's state.
 * Streaming deltas go through pi-web's own reducer (@pi/streaming-message),
 * so the phone renders exactly what the web UI would.
 */
import { streamReducer, INITIAL_STREAMING_STATE, type StreamingState } from "@pi/streaming-message";
import { normalizeToolCalls } from "@pi/normalize";
import type { AgentMessage, ToolResultMessage } from "@pi/types";
import type { ClientAssistantMessageEvent } from "@pi/agent-event-wire";
import { api, type SessionSnapshot, type TreeNode } from "../api";
import { t } from "../i18n.svelte";

export type AgentStatus = "idle" | "streaming" | "waiting" | "disconnected" | "connecting";
export type ToolRun = { state: "running" | "done" | "error"; output?: string };

type Event = Record<string, unknown> & { type: string };

/** Plan mode: the prompt carries this line and the session keeps only read-only tools. */
export const PLAN_PREFIX = "[Plan mode] Research and propose a plan only. Do not edit files or run commands that change anything.\n\n";
const WRITES = /(write|edit|bash|exec|run|delete|remove|create|apply|patch|shell|move|rename|install|commit|push)/i;
const READS = /(^read$|^ls$|^grep$|^find$|read|list|get|search|fetch|view|glob)/i;
export function isReadOnlyTool(name: string): boolean {
  return READS.test(name) && !WRITES.test(name);
}
export type Mode = "build" | "plan";
/** A session's first line for titles, without the Plan instruction. */
export function cleanTitle(text: string | undefined): string {
  const raw = (text ?? "").startsWith(PLAN_PREFIX.trim()) ? (text ?? "").slice(PLAN_PREFIX.trim().length) : (text ?? "");
  return raw.trim().split("\n")[0] ?? "";
}

function userKey(m: AgentMessage): string {
  if (m.role !== "user") return "";
  const c = m.content;
  return typeof c === "string" ? c : c.map((b) => (b.type === "text" ? b.text : "[img]")).join("");
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return typeof content === "string" ? content : "";
  return content.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text ?? "" : "")).join("");
}

export class LiveSession {
  id = $state<string | null>(null);
  info = $state<SessionSnapshot["info"]>(null);
  leafId = $state<string | null>(null);
  model = $state<{ provider: string; modelId: string } | null>(null);
  thinkingLevel = $state<string>("off");
  /** Entry ids of the loaded messages, in order; live messages past the end have none yet. */
  entryIds = $state<string[]>([]);
  tree = $state<TreeNode[]>([]);
  /** Set while the composer rewrites an earlier user message (a new branch on send). */
  editing = $state<{ entryId: string; text: string } | null>(null);
  messages = $state<AgentMessage[]>([]);
  stream = $state<StreamingState>(INITIAL_STREAMING_STATE);
  running = $state(false);
  connected = $state(false);
  /** Has this session's stream ever opened? Before that we are connecting, not offline. */
  everConnected = $state(false);
  hasMore = $state(false);
  oldestEntryId = $state<string | undefined>(undefined);
  tools = $state<Record<string, ToolRun>>({});
  retry = $state<{ attempt: number; max: number } | null>(null);
  notice = $state<string | null>(null);
  pendingUi = $state<Event[]>([]);
  loading = $state(false);
  /** Build or Plan, kept across sessions like a composer setting. */
  mode = $state<Mode>((typeof localStorage !== "undefined" && localStorage.getItem("piapp.mode") === "plan") ? "plan" : "build");
  /** Model and thinking picked on the home screen, applied when its session starts. */
  pendingModel = $state<{ provider: string; modelId: string } | null>(null);
  pendingThinking = $state<string | null>(null);
  private savedTools = new Map<string, string[]>();
  /** Session totals from the snapshot, and the live context window fill from get_state. */
  stats = $state<SessionSnapshot["stats"] | null>(null);
  contextUsage = $state<{ percent: number | null; contextWindow: number; tokens: number | null } | null>(null);

  private es: EventSource | null = null;
  private backoff = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private optimisticKey: string | null = null;
  private generation = 0;

  status = $derived<AgentStatus>(
    !this.connected ? (!this.id ? "idle" : this.everConnected ? "disconnected" : "connecting")
      : this.pendingUi.length ? "waiting"
      : this.running ? "streaming" : "idle",
  );

  /** Tool results by call id, so a call's card can show its own output. */
  results = $derived.by(() => {
    const map: Record<string, ToolResultMessage> = {};
    for (const m of this.messages) if (m.role === "toolResult") map[m.toolCallId] = m;
    return map;
  });

  async open(id: string): Promise<void> {
    if (this.id === id && this.es) return;
    this.close();
    const gen = ++this.generation;
    this.id = id;
    this.loading = true;
    this.messages = [];
    this.entryIds = [];
    this.tree = [];
    this.editing = null;
    this.stream = INITIAL_STREAMING_STATE;
    this.tools = {};
    try {
      await this.reload(gen);
    } finally {
      if (gen === this.generation) this.loading = false;
    }
    if (gen === this.generation) this.subscribe(gen);
  }

  private async reload(gen = this.generation): Promise<void> {
    if (!this.id) return;
    const snap = await api.session(this.id);
    if (gen !== this.generation) return;
    this.info = snap.info;
    this.leafId = snap.leafId;
    this.model = snap.context.model ?? null;
    this.thinkingLevel = snap.context.thinkingLevel ?? "off";
    this.tree = snap.tree ?? [];
    this.entryIds = snap.context.entryIds;
    this.messages = snap.context.messages.map(normalizeToolCalls);
    this.hasMore = snap.context.hasMore;
    this.oldestEntryId = snap.context.oldestEntryId ?? snap.context.entryIds[0];
    this.stats = snap.stats ?? null;
    void this.refreshState();
  }

  /** Context usage only exists while the session is loaded on the server. */
  async refreshState(): Promise<void> {
    const id = this.id;
    if (!id) return;
    const r = await api.state(id).catch(() => null);
    if (id !== this.id || !r) return;
    if (r.state?.contextUsage !== undefined) this.contextUsage = r.state.contextUsage ?? null;
  }

  /** Start a session in a folder and send its first prompt. */
  async startIn(cwd: string, text: string): Promise<void> {
    const { sessionId } = await api.newSession(cwd);
    await this.open(sessionId);
    if (this.pendingModel) await this.setModel(this.pendingModel.provider, this.pendingModel.modelId).catch(() => {});
    if (this.pendingThinking) await this.setThinking(this.pendingThinking).catch(() => {});
    this.pendingModel = null;
    this.pendingThinking = null;
    await this.send(text);
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    localStorage.setItem("piapp.mode", mode);
  }

  /** Plan withdraws every tool that can change the project; Build gives them back. */
  private async applyMode(): Promise<void> {
    const id = this.id;
    if (!id) return;
    const res = await api.command<{ name: string; active: boolean }[]>(id, { type: "get_tools" }).catch(() => null);
    const tools = res?.data;
    if (!Array.isArray(tools)) return;
    const active = tools.filter((x) => x.active).map((x) => x.name);
    if (this.mode === "plan") {
      const writable = active.filter((n) => !isReadOnlyTool(n));
      if (!writable.length) return;
      this.savedTools.set(id, [...new Set([...(this.savedTools.get(id) ?? []), ...active])]);
      await api.command(id, { type: "set_tools", toolNames: active.filter(isReadOnlyTool) });
    } else {
      const saved = this.savedTools.get(id);
      if (!saved) return;
      this.savedTools.delete(id);
      await api.command(id, { type: "set_tools", toolNames: [...new Set([...active, ...saved])] });
    }
  }

  async loadOlder(): Promise<void> {
    if (!this.id || !this.oldestEntryId || !this.hasMore) return;
    const { context } = await api.older(this.id, this.leafId, this.oldestEntryId);
    this.messages = [...context.messages.map(normalizeToolCalls), ...this.messages];
    this.entryIds = [...context.entryIds, ...this.entryIds];
    this.hasMore = context.hasMore;
    this.oldestEntryId = context.oldestEntryId ?? context.entryIds[0];
  }

  private subscribe(gen: number): void {
    if (!this.id) return;
    const es = new EventSource(`/api/agent/${encodeURIComponent(this.id)}/events`);
    this.es = es;
    es.onmessage = (e) => {
      if (gen !== this.generation) return;
      try { this.handle(JSON.parse(e.data) as Event); } catch { /* malformed frame */ }
    };
    es.onerror = () => {
      if (gen !== this.generation || this.es !== es) return;
      es.close();
      this.es = null;
      this.connected = false;
      this.retryTimer = setTimeout(() => void this.resume(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 15000);
    };
  }

  /** Foreground / network back: re-read the transcript, then listen again. */
  async resume(): Promise<void> {
    if (!this.id || this.es) return;
    const gen = this.generation;
    try {
      await this.reload(gen);
      if (gen === this.generation && !this.es) this.subscribe(gen);
    } catch {
      this.retryTimer = setTimeout(() => void this.resume(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 15000);
    }
  }

  /** App went to background: drop the stream so Android doesn't kill it half-open. */
  suspend(): void {
    this.es?.close();
    this.es = null;
    this.connected = false;
  }

  close(): void {
    this.generation++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.es?.close();
    this.es = null;
    this.connected = false;
    this.everConnected = false;
    this.running = false;
    this.pendingUi = [];
    this.retry = null;
    this.id = null;
    this.info = null;
    this.messages = [];
    this.entryIds = [];
    this.tree = [];
    this.editing = null;
    this.stats = null;
    this.contextUsage = null;
  }

  handle(event: Event): void {
    switch (event.type) {
      case "connected":
        this.connected = true;
        this.everConnected = true;
        this.backoff = 1000;
        this.running = Boolean(event.isStreaming);
        if (!this.running) this.stream = INITIAL_STREAMING_STATE;
        break;
      case "agent_start":
        this.running = true;
        this.retry = null;
        break;
      case "message_start": {
        const msg = event.message as AgentMessage | undefined;
        if (msg?.role === "assistant") this.stream = streamReducer(this.stream, { type: "snapshot", message: msg });
        break;
      }
      case "message_update": {
        const delta = event.assistantMessageEvent as ClientAssistantMessageEvent | undefined;
        if (delta) this.stream = streamReducer(this.stream, { type: "delta", event: delta });
        break;
      }
      case "message_end": {
        const done = event.message as AgentMessage | undefined;
        if (!done) break;
        const normalized = normalizeToolCalls(done);
        if (done.role === "user") {
          const last = this.messages[this.messages.length - 1];
          const key = this.optimisticKey;
          this.optimisticKey = null;
          if (key && last?.role === "user" && userKey(last) === key) {
            this.messages = [...this.messages.slice(0, -1), normalized];
          } else this.messages = [...this.messages, normalized];
        } else {
          this.messages = [...this.messages, normalized];
        }
        this.stream = streamReducer(this.stream, { type: "end" });
        break;
      }
      case "tool_execution_start":
        this.tools = { ...this.tools, [event.toolCallId as string]: { state: "running" } };
        break;
      case "tool_execution_update": {
        const partial = event.partialResult as { content?: unknown } | undefined;
        const output = textOf(partial?.content);
        if (output) this.tools = { ...this.tools, [event.toolCallId as string]: { state: "running", output } };
        break;
      }
      case "tool_execution_end":
        this.tools = { ...this.tools, [event.toolCallId as string]: { state: event.isError ? "error" : "done" } };
        break;
      case "auto_retry_start":
        this.retry = { attempt: Number(event.attempt), max: Number(event.maxAttempts) };
        break;
      case "auto_retry_end":
        this.retry = null;
        if (!event.success && typeof event.finalError === "string") this.notice = event.finalError;
        break;
      case "extension_ui_request":
        this.pendingUi = [...this.pendingUi, event];
        break;
      case "extension_ui_closed":
      case "extension_ui_resolved":
        this.pendingUi = this.pendingUi.filter((e) => e.id !== event.id);
        break;
      case "agent_end":
        break;
      case "agent_settled":
      case "prompt_done":
        this.running = false;
        this.retry = null;
        this.stream = INITIAL_STREAMING_STATE;
        // Pick up entry ids and the tree for the turn that just ended.
        if (event.type === "agent_settled") void this.reload().catch(() => {});
        break;
      case "prompt_error":
      case "extension_error":
      case "startup_error":
        this.notice = String(event.errorMessage ?? event.error ?? "Error");
        this.running = false;
        break;
    }
  }

  /** Every branch tip of the tree, newest first, with the text that starts its branch. */
  leaves = $derived.by(() => {
    const out: { id: string; preview: string; timestamp: string; active: boolean }[] = [];
    const walk = (nodes: TreeNode[], preview: string) => {
      for (const n of nodes) {
        const p = n.branchPreview?.text ?? preview;
        if (n.children.length === 0) out.push({ id: n.entry.id, preview: p, timestamp: n.entry.timestamp, active: n.entry.id === this.leafId });
        else walk(n.children, p);
      }
    };
    walk(this.tree, "");
    return out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  });

  /** Move to another branch tip (or, for a user message, to just before it). */
  async navigate(targetId: string): Promise<boolean> {
    if (!this.id || this.running) return false;
    const res = await api.command<{ cancelled?: boolean }>(this.id, { type: "navigate_tree", targetId });
    if (res.data?.cancelled) return false;
    await this.reload();
    return true;
  }

  /** New session holding the history before this user message. */
  async fork(entryId: string): Promise<string | null> {
    if (!this.id) return null;
    const res = await api.command<{ cancelled?: boolean; newSessionId?: string }>(this.id, { type: "fork", entryId });
    return res.data?.cancelled ? null : res.data?.newSessionId ?? null;
  }

  async setModel(provider: string, modelId: string): Promise<void> {
    if (!this.id) return;
    await api.command(this.id, { type: "set_model", provider, modelId });
    this.model = { provider, modelId };
    const snap = await api.session(this.id).catch(() => null);
    if (snap) this.thinkingLevel = snap.context.thinkingLevel ?? this.thinkingLevel;
  }

  async setThinking(level: string): Promise<void> {
    if (!this.id) return;
    await api.command(this.id, { type: "set_thinking_level", level });
    this.thinkingLevel = level;
  }

  async send(text: string, mode: "auto" | "steer" | "followUp" = "auto"): Promise<void> {
    const raw = text.trim();
    if (!raw || !this.id) return;
    const message = (this.mode === "plan" && !raw.startsWith(PLAN_PREFIX.trim()) ? PLAN_PREFIX : "") + raw;
    this.notice = null;
    if (this.editing && !this.running) {
      // Navigate and prompt are two calls, as on the web: branch first, then send.
      const { entryId } = this.editing;
      this.editing = null;
      if (!(await this.navigate(entryId).catch(() => false))) {
        this.notice = t("branch.failed");
        return;
      }
    }
    if (!this.running) await this.applyMode().catch(() => {});
    if (this.running) {
      await api.command(this.id, { type: "prompt", message, streamingBehavior: mode === "followUp" ? "followUp" : "steer" });
      return;
    }
    this.optimisticKey = message;
    this.messages = [...this.messages, { role: "user", content: [{ type: "text", text: message }], timestamp: Date.now() }];
    this.running = true;
    try {
      await api.command(this.id, { type: "prompt", message });
    } catch (e) {
      this.running = false;
      this.notice = e instanceof Error ? e.message : String(e);
    }
  }

  async stop(): Promise<void> {
    if (this.id) await api.command(this.id, { type: "abort" }).catch(() => {});
  }
}

export const live = new LiveSession();

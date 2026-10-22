/**
 * EventSource over fetch, so the stream can carry `Authorization: Bearer`.
 * Speaks the subset pi-web's events route sends (`data:` lines, comments as
 * heartbeats) and satisfies upstream's AgentEventSourceLike, so
 * lib/agent-event-connection.ts runs unchanged.
 */
export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSED = 2;

/** Incremental SSE parser: feed text, get each event's data. */
export class SseParser {
  private buffer = "";
  private data: string[] = [];
  private lastId: string | null = null;

  private readonly onMessage: (data: string, lastEventId: string | null) => void;
  private readonly onComment?: () => void;

  constructor(onMessage: (data: string, lastEventId: string | null) => void, onComment?: () => void) {
    this.onMessage = onMessage;
    this.onComment = onComment;
  }

  feed(chunk: string): void {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.search(/\r\n|\r|\n/)) !== -1) {
      const line = this.buffer.slice(0, newline);
      const sepLength = this.buffer.startsWith("\r\n", newline) ? 2 : 1;
      this.buffer = this.buffer.slice(newline + sepLength);
      this.line(line);
    }
  }

  private line(line: string): void {
    if (line === "") {
      if (this.data.length) this.onMessage(this.data.join("\n"), this.lastId);
      this.data = [];
      return;
    }
    if (line.startsWith(":")) {
      this.onComment?.();
      return;
    }
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") this.data.push(value);
    else if (field === "id") this.lastId = value;
  }
}

export interface FetchEventSourceInit {
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class FetchEventSource {
  readonly CONNECTING = CONNECTING;
  readonly OPEN = OPEN;
  readonly CLOSED = CLOSED;
  readyState = CONNECTING;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  private readonly controller = new AbortController();

  readonly url: string;
  private readonly init: FetchEventSourceInit;

  constructor(url: string, init: FetchEventSourceInit = {}) {
    this.url = url;
    this.init = init;
    void this.run();
  }

  close(): void {
    this.readyState = CLOSED;
    this.controller.abort();
  }

  private fail(): void {
    if (this.readyState === CLOSED) return;
    // Like a dead EventSource that will not retry: upstream's connection owns reconnects.
    this.readyState = CLOSED;
    this.onerror?.(new Event("error"));
  }

  private async run(): Promise<void> {
    const fetchImpl = this.init.fetchImpl ?? fetch;
    let res: Response;
    try {
      res = await fetchImpl(this.url, {
        headers: { Accept: "text/event-stream", ...this.init.headers },
        signal: this.controller.signal,
        cache: "no-store",
      });
    } catch {
      this.fail();
      return;
    }
    if (!res.ok || !res.body) {
      this.fail();
      return;
    }
    if (this.readyState === CLOSED) return;
    this.readyState = OPEN;
    this.onopen?.(new Event("open"));
    const parser = new SseParser((data, lastEventId) => {
      if (this.readyState !== OPEN) return;
      this.onmessage?.(new MessageEvent("message", { data, lastEventId: lastEventId ?? "" }));
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
    } catch {
      /* aborted or dropped */
    }
    this.fail();
  }
}

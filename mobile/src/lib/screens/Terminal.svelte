<script lang="ts">
  import { untrack } from "svelte";
  import { Terminal } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import "@xterm/xterm/css/xterm.css";
  import TopBar from "../components/TopBar.svelte";
  import Rosette from "../components/Rosette.svelte";
  import Icon from "../components/Icon.svelte";
  import { iRefresh } from "../icons";
  import { t } from "../i18n.svelte";
  import { terminal as api } from "../api";
  import ProjectPicker from "../components/ProjectPicker.svelte";
  import { activeCwd } from "../store/project.svelte";
  import { theme } from "../theme.svelte";
  import { basename } from "../time";

  let host = $state<HTMLDivElement>();
  let exited = $state<number | null>(null);
  let status = $state<"connecting" | "idle" | "disconnected">("connecting");
  let ctrl = $state(false);
  let restartKey = $state(0);
  const cwd = $derived(activeCwd());

  function palette(dark: boolean) {
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(`--ctp-${n}`).trim();
    void dark;
    return {
      background: v("base"), foreground: v("text"), cursor: v("rosewater"), cursorAccent: v("base"),
      selectionBackground: `${v("overlay2")}55`,
      black: v("surface1"), red: v("red"), green: v("green"), yellow: v("yellow"), blue: v("blue"), magenta: v("pink"), cyan: v("teal"), white: v("subtext1"),
      brightBlack: v("surface2"), brightRed: v("red"), brightGreen: v("green"), brightYellow: v("yellow"), brightBlue: v("blue"), brightMagenta: v("pink"), brightCyan: v("teal"), brightWhite: v("subtext0"),
    };
  }

  let term: Terminal | null = null;
  let send: (data: string) => void = () => {};

  $effect(() => {
    if (term) term.options.theme = palette(theme.dark);
  });

  $effect(() => {
    void restartKey;
    if (!host || !cwd) return;
    const dir = cwd;
    const storeKey = `piapp.term:${dir}`;
    const xterm = new Terminal({
      fontFamily: '"Roboto Mono", monospace', fontSize: 13, lineHeight: 1.15, cursorBlink: true,
      theme: untrack(() => palette(theme.dark)), scrollback: 5000, allowProposedApi: false,
    });
    const fit = new FitAddon();
    xterm.loadAddon(fit);
    xterm.open(host);
    term = xterm;
    let id: string | null = null;
    let es: EventSource | null = null;
    let offset: number | undefined;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let queue = "";
    let flushing = false;
    exited = null;
    status = "connecting";

    async function flush() {
      if (flushing || !id || !queue) return;
      flushing = true;
      const data = queue; queue = "";
      await api.input(id, data).catch(() => {});
      flushing = false;
      if (queue) void flush();
    }
    send = (data) => { queue += data; void flush(); };

    function listen() {
      if (!id || disposed) return;
      es = new EventSource(`/api/terminal/${id}/events${offset !== undefined ? `?after=${offset}` : ""}`);
      es.onopen = () => (status = "idle");
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data) as { type: string; data?: string; offset?: number; reset?: boolean; exitCode?: number };
        if (ev.type === "output") {
          if (ev.reset) xterm.reset();
          xterm.write(ev.data ?? "");
          offset = ev.offset;
        } else if (ev.type === "exit") {
          exited = ev.exitCode ?? 0;
          localStorage.removeItem(storeKey);
        } else if (ev.type === "closed") {
          localStorage.removeItem(storeKey);
        }
      };
      es.onerror = () => {
        es?.close(); es = null;
        if (disposed || exited !== null) return;
        status = "disconnected";
        retry = setTimeout(listen, 2000);
      };
    }

    async function start() {
      fit.fit();
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        const ok = await api.alive(saved).then(() => true).catch(() => false);
        if (ok) id = saved;
      }
      if (!id) {
        try {
          id = (await api.open(dir, xterm.cols, xterm.rows)).id;
        } catch (e) {
          xterm.write(`\r\n${e instanceof Error ? e.message : String(e)}\r\n`);
          status = "disconnected";
          return;
        }
        localStorage.setItem(storeKey, id);
      } else void api.resize(id, xterm.cols, xterm.rows).catch(() => {});
      if (disposed) return;
      listen();
    }

    const data = xterm.onData((d) => {
      if (ctrl && d.length === 1) {
        const c = d.toUpperCase().charCodeAt(0);
        if (c >= 64 && c <= 95) { ctrl = false; send(String.fromCharCode(c - 64)); return; }
      }
      send(d);
    });
    const ro = new ResizeObserver(() => {
      fit.fit();
      if (id) void api.resize(id, xterm.cols, xterm.rows).catch(() => {});
    });
    ro.observe(host);
    void start();
    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      es?.close();
      ro.disconnect();
      data.dispose();
      xterm.dispose();
      term = null;
    };
  });

  const keys: { label: string; seq?: string; ctrl?: true }[] = [
    { label: "Esc", seq: "\x1b" }, { label: "Tab", seq: "\t" }, { label: "Ctrl", ctrl: true },
    { label: "↑", seq: "\x1b[A" }, { label: "↓", seq: "\x1b[B" }, { label: "←", seq: "\x1b[D" }, { label: "→", seq: "\x1b[C" },
    { label: "|", seq: "|" }, { label: "~", seq: "~" }, { label: "/", seq: "/" }, { label: "-", seq: "-" },
  ];

  function restart() {
    if (cwd) localStorage.removeItem(`piapp.term:${cwd}`);
    restartKey++;
  }
</script>

<div class="screen">
  <TopBar title={t("nav.terminal")} subtitle={cwd ?? undefined}>
    {#snippet actions()}
      {#if cwd}
        <Rosette state={status} size={20} />
        <button class="icon-btn" aria-label={t("term.restart")} onclick={restart}><Icon path={iRefresh} /></button>
      {/if}
    {/snippet}
  </TopBar>
  {#if !cwd}
    <ProjectPicker lead={t("term.noProject")} />
  {:else}
    <div class="term" bind:this={host} aria-label={`Terminal ${basename(cwd)}`}></div>
    {#if exited !== null}
      <div class="exit body-m"><span>{t("term.exited", { code: exited })}</span><button class="btn btn-text" onclick={restart}>{t("term.restart")}</button></div>
    {/if}
    <div class="keys" role="toolbar" aria-label={t("term.keys")}>
      {#each keys as k (k.label)}
        <button class="key label-l" class:on={k.ctrl && ctrl} aria-pressed={k.ctrl ? ctrl : undefined}
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => { if (k.ctrl) ctrl = !ctrl; else if (k.seq) send(k.seq); term?.focus(); }}>{k.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; }
  .term { flex: 1; min-height: 0; padding: 4px 0 0 8px; background: var(--ctp-base); }
  .term :global(.xterm-viewport) { background: transparent !important; }
  .exit { display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 16px; background: var(--md-surface-container-high); color: var(--md-on-surface-variant); flex: none; }
  .keys { display: flex; gap: 4px; padding: 6px 8px; overflow-x: auto; background: var(--md-surface-container); flex: none; scrollbar-width: none; }
  .key { min-width: 48px; height: 40px; padding: 0 10px; border: 0; border-radius: var(--radius-s); background: var(--md-surface-container-highest); color: var(--md-on-surface); cursor: pointer; font-family: var(--font-mono); flex: none; }
  .key.on { background: var(--md-primary); color: var(--md-on-primary); }
</style>

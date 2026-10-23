<script lang="ts">
  /**
   * Chat is home. A quiet top bar (menu · title ▾ · context ring · new), the reply as plain
   * prose, and one composer card. With no session it asks what to work on, in which project.
   */
  import { tick } from "svelte";
  import Message from "../components/Message.svelte";
  import Composer from "../components/Composer.svelte";
  import Rosette from "../components/Rosette.svelte";
  import Icon from "../components/Icon.svelte";
  import Sheet from "../components/Sheet.svelte";
  import ContextRing from "../components/ContextRing.svelte";
  import ContextSheet from "../components/ContextSheet.svelte";
  import ModelSheet from "../components/ModelSheet.svelte";
  import BranchSheet from "../components/BranchSheet.svelte";
  import MessageActions from "../components/MessageActions.svelte";
  import {
    iOffline, iClose, iModel, iBranch, iEdit, iMenu, iEditNew, iExpand, iFiles, iTerminal, iFolderPlus,
    iExplore, iPlan, iBug, iReview, iTest, iExplain, iThinking, iPlus, iBuild,
  } from "../icons";
  import { t, thinkLabel } from "../i18n.svelte";
  import { live, cleanTitle } from "../store/session.svelte";
  import { picked } from "../store/project.svelte";
  import { nav, toast, confirmDialog } from "../nav.svelte";
  import { api, files } from "../api";
  import { basename } from "../time";
  import { projectAccent } from "../theme.svelte";

  let scroller = $state<HTMLDivElement>();
  let nearBottom = true;
  let sheet = $state<null | "model" | "branch" | "context" | "menu" | "project">(null);
  let actions = $state<{ entryId: string | undefined; text: string } | null>(null);
  let draft = $state("");
  let composer = $state<{ focus: () => void; insert: (s: string) => void }>();
  let starting = $state(false);
  let recent = $state<string[]>([]);
  let customDir = $state("");
  let defaultModel = $state<{ provider: string; modelId: string } | null>(null);
  $effect(() => {
    const dir = picked.cwd;
    if (!live.id && dir) void api.models(dir).then((m) => (defaultModel = m.defaultModel)).catch(() => {});
  });
  const shownModel = $derived(live.id ? live.model : (live.pendingModel ?? defaultModel));
  const shownThinking = $derived(live.id ? live.thinkingLevel : (live.pendingThinking ?? "off"));

  $effect(() => {
    void api.sessions().then(({ sessions }) => {
      recent = [...new Set(sessions.map((s) => s.projectRoot ?? s.cwd))].slice(0, 8);
      if (!picked.cwd && recent[0]) picked.cwd = recent[0];
    }).catch(() => {});
  });

  const visible = $derived(
    live.messages.map((m, i) => ({ m, id: live.entryIds[i] as string | undefined })).filter((r) => r.m.role !== "toolResult"),
  );
  /** Footer for the reply that ended each turn: model, thinking, wall time since the prompt. */
  const footers = $derived.by(() => {
    const out: Record<number, { model?: string; thinking?: string; elapsedMs?: number }> = {};
    let userAt: number | undefined;
    visible.forEach(({ m }, i) => {
      if (m.role === "user") userAt = typeof m.timestamp === "number" ? m.timestamp : undefined;
      else if (m.role === "assistant" && m.stopReason === "stop") {
        const end = m.timestamp !== undefined && m.durationMs !== undefined ? m.timestamp + m.durationMs : undefined;
        const thought = m.content.some((b) => b.type === "thinking");
        out[i] = {
          model: m.model,
          thinking: thought && i === visible.length - 1 && live.thinkingLevel !== "off" ? thinkLabel(live.thinkingLevel) : undefined,
          elapsedMs: end !== undefined && userAt !== undefined ? end - userAt : m.durationMs,
        };
      }
    });
    return out;
  });

  const cwd = $derived(live.info?.cwd ?? picked.cwd ?? "");
  const project = $derived(live.info ? basename(live.info.projectRoot ?? live.info.cwd) : picked.cwd ? basename(picked.cwd) : "");
  const accent = $derived(projectAccent(live.info?.projectKey ?? live.info?.projectRoot ?? cwd));
  const title = $derived.by(() => {
    const i = live.info;
    const first = i?.firstMessage && i.firstMessage !== "(no messages)" ? cleanTitle(i.firstMessage) : "";
    return i?.name || first || t("new.title");
  });
  const hero = $derived(!live.id || (!live.loading && visible.length === 0 && !live.stream.streamingMessage && !live.running));

  const suggestions = $derived([
    { icon: iExplore, label: t("sug.explore"), prompt: t("sug.explore.p") },
    { icon: iPlan, label: t("sug.plan"), prompt: t("sug.plan.p") },
    { icon: iBug, label: t("sug.debug"), prompt: t("sug.debug.p") },
    { icon: iReview, label: t("sug.review"), prompt: t("sug.review.p") },
    { icon: iTest, label: t("sug.test"), prompt: t("sug.test.p") },
    { icon: iExplain, label: t("sug.explain"), prompt: t("sug.explain.p") },
  ]);

  function onScroll() {
    if (!scroller) return;
    nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
  }
  $effect(() => {
    void live.messages.length; void live.stream.streamingMessage;
    if (nearBottom) void tick().then(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
  });

  async function older() {
    const before = scroller?.scrollHeight ?? 0;
    await live.loadOlder();
    await tick();
    if (scroller) scroller.scrollTop += scroller.scrollHeight - before;
  }

  function startEdit() {
    if (!actions?.entryId) return;
    live.editing = { entryId: actions.entryId, text: actions.text };
    draft = actions.text;
    composer?.focus();
  }
  function cancelEdit() { live.editing = null; draft = ""; }
  async function forked(id: string) { actions = null; await live.open(id); }

  async function send(text: string) {
    nearBottom = true;
    if (live.id) return live.send(text);
    if (!cwd) { sheet = "project"; draft = text; return; }
    starting = true;
    try {
      await live.startIn(cwd, text);
    } catch (e) {
      draft = text;
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      starting = false;
    }
  }

  function newSession() {
    if (live.info) picked.cwd = live.info.projectRoot ?? live.info.cwd;
    live.close();
    sheet = null;
    draft = "";
  }
  function pickProject(dir: string) {
    if (!dir.trim()) return;
    picked.cwd = dir.trim();
    customDir = "";
    sheet = null;
  }

  /** Attach = upload into the project folder and mention the file, so the agent reads it. */
  async function attach(list: File[]) {
    if (!cwd) { sheet = "project"; return; }
    try {
      let r = await files.upload(cwd, list, "error");
      if (r.conflicts?.length) {
        const ok = await confirmDialog(t("files.conflict", { names: r.conflicts.join(", ") }), t("files.replace"), t("files.skip"));
        r = await files.upload(cwd, list, ok ? "overwrite" : "skip");
      }
      const names = [...r.uploaded, ...r.skipped];
      if (names.length) composer?.insert(names.map((n) => `@${basename(n)}`).join(" ") + " ");
      if (r.errors.length) toast(r.errors.map((e) => `${e.name}: ${e.error}`).join("\n"));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    }
  }
</script>

<div class="screen" style:--accent={accent}>
  <header class="bar">
    <button class="icon-btn menu-btn" onclick={() => (nav.drawer = true)} aria-label={t("nav.menu")}><Icon path={iMenu} /></button>
    {#if live.id}
      <button class="title" onclick={() => (sheet = "menu")} aria-haspopup="dialog">
        <span class="t title-m">{title}</span><Icon path={iExpand} size={18} />
      </button>
    {:else}
      <button class="title" onclick={() => (sheet = "project")} aria-haspopup="dialog">
        <span class="t title-m">{t("new.title")}</span><Icon path={iExpand} size={18} />
      </button>
    {/if}
    {#if live.running}<span class="run"><Rosette state="streaming" size={20} /></span>{/if}
    {#if live.id}
      <button class="icon-btn" onclick={() => (sheet = "context")} aria-label={t("ctx.title")}>
        <ContextRing percent={live.contextUsage?.percent ?? null} />
      </button>
    {/if}
    <button class="icon-btn" onclick={newSession} aria-label={t("sessions.new")}><Icon path={iEditNew} /></button>
  </header>

  {#if live.status === "disconnected"}
    <div class="banner offline body-m" role="status"><Icon path={iOffline} size={18} />{t("chat.reconnect")}</div>
  {/if}

  <div class="scroll" bind:this={scroller} onscroll={onScroll}>
    <div class="col" class:hero>
      {#if live.loading}
        <div class="center"><Rosette state="connecting" size={40} /></div>
      {:else if hero}
        <div class="welcome">
          <h2 class="ask">{t("hero.ask")}{#if project}{" "}<span class="pj">{t("hero.in")} <strong>{project}</strong></span>{/if}?</h2>
          <div class="sugs">
            {#each suggestions as s (s.label)}
              <button class="sug body-m" onclick={() => { draft = s.prompt; composer?.focus(); }}><Icon path={s.icon} size={16} />{s.label}</button>
            {/each}
          </div>
        </div>
      {:else}
        {#if live.hasMore}<button class="btn btn-text older" onclick={older}>{t("chat.olderLoad")}</button>{/if}
        {#each visible as r, i (r.id ?? `live-${i}`)}
          <Message message={r.m} results={live.results} tools={live.tools} footer={footers[i]} onactions={(text) => (actions = { entryId: r.id, text })} />
        {/each}
        {#if live.stream.streamingMessage}
          <Message message={live.stream.streamingMessage} results={live.results} tools={live.tools} streaming />
        {:else if live.running}
          <div class="pending"><Rosette state="streaming" size={24} /></div>
        {/if}
        {#if live.retry}<p class="note body-m">{t("chat.retrying", { a: live.retry.attempt, m: live.retry.max })}</p>{/if}
      {/if}
    </div>
  </div>

  {#if live.notice}
    <div class="banner error body-m" role="alert">
      <span>{live.notice}</span>
      <button class="icon-btn" aria-label="Dismiss" onclick={() => (live.notice = null)}><Icon path={iClose} size={18} /></button>
    </div>
  {/if}
  {#if live.editing}
    <div class="banner editing body-m" role="status">
      <Icon path={iEdit} size={18} /><span>{t("msg.editing")}</span>
      <button class="icon-btn" aria-label={t("file.cancel")} onclick={cancelEdit}><Icon path={iClose} size={18} /></button>
    </div>
  {/if}

  <Composer bind:this={composer} bind:text={draft} running={live.running} disabled={(!!live.id && !live.connected) || starting}
    placeholder={live.running ? t("chat.placeholderSteer") : t("chat.placeholderAsk")}
    onsend={send} onstop={() => void live.stop()} onattach={cwd ? attach : undefined}>
    {#snippet above()}
      {#if hero}
        <button type="button" class="ctx label-l" onclick={() => (sheet = "project")}><span class="sw"></span>{project || t("new.pick")}<Icon path={iExpand} size={16} /></button>
        {#if live.info?.branch}<span class="ctx label-l static"><Icon path={iBranch} size={16} />{live.info.branch}</span>{/if}
      {:else if live.leaves.length > 1}
        <button type="button" class="ctx label-l" onclick={() => (sheet = "branch")}><Icon path={iBranch} size={16} />{t("branch.title")} <span class="n">{live.leaves.length}</span></button>
      {/if}
    {/snippet}
    {#snippet left()}
      <button type="button" class="chip mode label-l" class:plan={live.mode === "plan"} aria-pressed={live.mode === "plan"}
        aria-label={t("mode.toggle", { mode: live.mode === "plan" ? t("mode.plan") : t("mode.build") })}
        onclick={() => live.setMode(live.mode === "plan" ? "build" : "plan")}>
        <Icon path={live.mode === "plan" ? iPlan : iBuild} size={16} />{live.mode === "plan" ? t("mode.plan") : t("mode.build")}
      </button>
      <button type="button" class="chip label-l" onclick={() => (sheet = "model")} aria-haspopup="dialog" disabled={!cwd}>
        <Icon path={iModel} size={16} /><span class="mname">{shownModel?.modelId ?? t("model.title")}</span>
      </button>
    {/snippet}
    {#snippet right()}
      {#if shownThinking !== "off"}
        <button type="button" class="chip think label-l" onclick={() => (sheet = "model")} aria-label={t("model.thinking")}><Icon path={iThinking} size={16} />{thinkLabel(shownThinking)}</button>
      {/if}
    {/snippet}
  </Composer>

  {#if sheet === "model"}<ModelSheet onclose={() => (sheet = null)} />{/if}
  {#if sheet === "branch"}<BranchSheet onclose={() => (sheet = null)} />{/if}
  {#if sheet === "context"}<ContextSheet onclose={() => (sheet = null)} />{/if}
  {#if sheet === "menu"}
    <Sheet title={title} onclose={() => (sheet = null)}>
      <p class="sub body-s">{live.info?.cwd}</p>
      <div class="menu">
        <button class="mi body-l" onclick={newSession}><Icon path={iPlus} />{t("sessions.newIn", { project })}</button>
        {#if live.leaves.length > 1}<button class="mi body-l" onclick={() => (sheet = "branch")}><Icon path={iBranch} />{t("branch.title")}<span class="n">{live.leaves.length}</span></button>{/if}
        <button class="mi body-l" onclick={() => { sheet = null; nav.tab = "files"; }}><Icon path={iFiles} />{t("nav.files")}</button>
        <button class="mi body-l" onclick={() => { sheet = null; nav.tab = "terminal"; }}><Icon path={iTerminal} />{t("nav.terminal")}</button>
      </div>
    </Sheet>
  {/if}
  {#if sheet === "project"}
    <Sheet title={t("new.recent")} onclose={() => (sheet = null)}>
      <div class="menu">
        {#each recent as dir (dir)}
          <button class="mi proj" class:on={dir === picked.cwd} style:--accent={projectAccent(dir)} onclick={() => pickProject(dir)}>
            <span class="psw"><Icon path={iFiles} size={18} /></span>
            <span class="ptxt"><span class="body-l">{basename(dir)}</span><span class="body-s path">{dir}</span></span>
          </button>
        {/each}
      </div>
      <form class="custom" onsubmit={(e) => { e.preventDefault(); pickProject(customDir); }}>
        <div class="field">
          <label class="body-s" for="cwd">{t("new.folder")}</label>
          <input id="cwd" bind:value={customDir} autocapitalize="off" spellcheck="false" placeholder="/home/you/project" />
        </div>
        <button class="btn btn-tonal" disabled={!customDir.trim()}><Icon path={iFolderPlus} size={18} />{t("new.use")}</button>
      </form>
    </Sheet>
  {/if}
  {#if actions}<MessageActions entryId={actions.entryId} text={actions.text} onclose={() => (actions = null)} onedit={startEdit} onforked={forked} />{/if}
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; min-height: 0; }
  .bar { display: flex; align-items: center; gap: 0; min-height: 56px; padding: calc(var(--safe-top) + 4px) 4px 4px; flex: none; }
  .title {
    flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; cursor: pointer;
    color: var(--md-on-surface); padding: 0 8px; min-height: 48px; text-align: left;
  }
  .title :global(svg) { color: var(--md-on-surface-variant); flex: none; }
  .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .run { display: grid; place-items: center; width: 32px; }
  .scroll { flex: 1; overflow-y: auto; min-height: 0; overscroll-behavior: contain; }
  .col { max-width: 760px; margin: 0 auto; padding: 8px 20px 24px; display: flex; flex-direction: column; gap: 22px; min-height: 100%; }
  .col.hero { justify-content: center; }
  .center { display: grid; place-items: center; padding: 64px 0; }
  .older { align-self: center; min-height: 48px; }
  .pending { padding: 4px 0; }
  .note { color: var(--md-on-surface-variant); margin: 0; }

  .welcome { display: grid; justify-items: center; gap: 24px; padding: 24px 0 8px; text-align: center; }
  .ask { margin: 0; font: 400 1.75rem/2.25rem var(--font-sans); letter-spacing: -0.015em; color: var(--md-on-surface); max-width: 18ch; text-wrap: balance; }
  .ask strong { font-weight: 500; color: var(--accent); }
  .sugs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 420px; }
  .sug {
    display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px 0 12px; border-radius: 20px; cursor: pointer;
    border: 0; background: var(--md-surface-container); color: var(--md-on-surface); box-shadow: inset 0 0 0 1px var(--md-outline-variant);
  }
  .sug :global(svg) { color: var(--md-on-surface-variant); }
  .sug:hover { background: var(--md-surface-container-high); }

  .banner { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 16px; min-height: 48px; margin: 0 12px; border-radius: var(--radius-m); flex: none; }
  .banner span { flex: 1; word-break: break-word; }
  .offline { background: var(--md-surface-container-high); color: var(--md-on-surface-variant); padding-right: 16px; margin-bottom: 4px; }
  .error { background: var(--md-error-container); color: var(--md-on-surface); margin-bottom: 4px; }
  .editing { background: var(--md-secondary-container); color: var(--md-on-secondary-container); margin-bottom: 4px; }

  .ctx {
    display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 8px; border: 0; background: none; cursor: pointer;
    color: var(--md-on-surface); border-radius: var(--radius-s); flex: none; white-space: nowrap;
  }
  .ctx :global(svg) { color: var(--md-on-surface-variant); }
  .ctx.static { cursor: default; color: var(--md-on-surface-variant); font-family: var(--font-mono); font-size: 0.75rem; }
  .sw { width: 8px; height: 8px; border-radius: 2px; background: var(--accent); }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 10px 0 8px; border: 0; background: none; cursor: pointer;
    border-radius: 22px; color: var(--md-on-surface); min-width: 0;
  }
  .chip:hover { background: color-mix(in oklab, var(--md-on-surface) 8%, transparent); }
  .chip :global(svg) { color: var(--md-on-surface-variant); flex: none; }
  .mname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .think { color: var(--md-on-surface-variant); padding: 0 8px; }
  .mode { flex: none; color: var(--ctp-green); font-weight: 500; }
  .mode :global(svg) { color: currentColor; }
  .mode.plan { color: var(--ctp-blue); }
  .chip:disabled { opacity: 0.38; cursor: default; }
  .n { font-size: 0.6875rem; padding: 0 6px; border-radius: 8px; background: var(--md-primary); color: var(--md-on-primary); line-height: 16px; margin-left: 4px; }

  .sub { margin: -6px 12px 8px; color: var(--md-on-surface-variant); font-family: var(--font-mono); word-break: break-all; }
  .menu { display: grid; }
  .mi { display: flex; align-items: center; gap: 16px; min-height: 52px; padding: 0 12px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; color: var(--md-on-surface); }
  .mi :global(svg) { color: var(--md-on-surface-variant); }
  .mi:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .mi .n { margin-left: auto; }
  .proj { min-height: 60px; } .proj.on { background: var(--md-secondary-container); }
  .psw { width: 36px; height: 36px; border-radius: var(--radius-m); display: grid; place-items: center; background: color-mix(in oklab, var(--accent) 20%, var(--md-surface)); flex: none; }
  .psw :global(svg) { color: var(--accent); }
  .ptxt { display: grid; min-width: 0; }
  .path { color: var(--md-on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 0.75rem; }
  .custom { display: grid; gap: 12px; padding: 12px; }
</style>

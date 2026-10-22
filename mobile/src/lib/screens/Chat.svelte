<script lang="ts">
  import { tick } from "svelte";
  import TopBar from "../components/TopBar.svelte";
  import StatusChip from "../components/StatusChip.svelte";
  import Message from "../components/Message.svelte";
  import Composer from "../components/Composer.svelte";
  import Rosette from "../components/Rosette.svelte";
  import Icon from "../components/Icon.svelte";
  import ModelSheet from "../components/ModelSheet.svelte";
  import BranchSheet from "../components/BranchSheet.svelte";
  import MessageActions from "../components/MessageActions.svelte";
  import { iOffline, iClose, iModel, iBranch, iEdit } from "../icons";
  import { t, thinkLabel } from "../i18n.svelte";
  import { live } from "../store/session.svelte";
  import { nav } from "../nav.svelte";
  import { basename } from "../time";
  import { projectAccent, serial } from "../theme.svelte";

  let scroller = $state<HTMLDivElement>();
  let nearBottom = true;

  const visible = $derived(
    live.messages.map((m, i) => ({ m, id: live.entryIds[i] as string | undefined })).filter((r) => r.m.role !== "toolResult"),
  );
  let sheet = $state<null | "model" | "branch">(null);
  let actions = $state<{ entryId: string | undefined; text: string } | null>(null);
  let draft = $state("");
  let composer = $state<{ focus: () => void }>();
  const modelName = $derived(live.model?.modelId ?? "");
  const project = $derived(live.info ? basename(live.info.projectRoot ?? live.info.cwd) : "");
  const title = $derived.by(() => {
    const i = live.info;
    const first = i?.firstMessage && i.firstMessage !== "(no messages)" ? i.firstMessage.split("\n")[0] : "";
    return i?.name || first || t("new.title");
  });
  const subtitle = $derived([project, live.model?.modelId, live.id ? serial(live.id) : ""].filter(Boolean).join(" · "));

  function onScroll() {
    if (!scroller) return;
    nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
  }

  // Follow the reply only while the reader is already at the bottom.
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
  function cancelEdit() {
    live.editing = null;
    draft = "";
  }
  async function forked(id: string) {
    actions = null;
    await live.open(id);
  }

  async function send(text: string) {
    nearBottom = true;
    await live.send(text);
  }
</script>

<div class="screen">
  {#if !live.id}
    <TopBar title={t("nav.chat")} />
    <div class="none">
      <Rosette faint size={160} />
      <h2 class="title-l">{t("chat.none")}</h2>
      <p class="body-m">{t("chat.noneLead")}</p>
      <button class="btn btn-filled" onclick={() => (nav.sheet = "new")}>{t("sessions.new")}</button>
    </div>
  {:else}
    <TopBar {title} {subtitle} onback={() => (nav.tab = "sessions")}>
      {#snippet actions()}<StatusChip status={live.status} />{/snippet}
    </TopBar>
    {#if live.info}<div class="rule" style:--accent={projectAccent(live.info.projectKey ?? live.info.projectRoot ?? live.info.cwd)}></div>{/if}

    {#if live.status === "disconnected"}
      <div class="banner offline body-m" role="status"><Icon path={iOffline} size={18} />{t("chat.reconnect")}</div>
    {/if}

    <div class="scroll" bind:this={scroller} onscroll={onScroll}>
      <div class="col">
        {#if live.loading}
          <div class="center"><Rosette state="connecting" size={40} /></div>
        {:else}
          {#if live.hasMore}<button class="btn btn-text older" onclick={older}>{t("chat.olderLoad")}</button>{/if}
          {#if visible.length === 0 && !live.stream.streamingMessage}
            <p class="empty body-l">{t("chat.empty", { project })}</p>
          {/if}
          {#each visible as r, i (r.id ?? `live-${i}`)}
            <Message message={r.m} results={live.results} tools={live.tools} onactions={(text) => (actions = { entryId: r.id, text })} />
          {/each}
          {#if live.stream.streamingMessage}
            <Message message={live.stream.streamingMessage} results={live.results} tools={live.tools} streaming />
          {:else if live.running}
            <div class="pending"><Rosette state="streaming" size={28} /></div>
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
    <Composer bind:this={composer} bind:text={draft} running={live.running} disabled={!live.connected} onsend={send} onstop={() => void live.stop()}>
      {#snippet chips()}
        <button type="button" class="chip label-l" onclick={() => (sheet = "model")} aria-haspopup="dialog">
          <Icon path={iModel} size={18} /><span class="mono">{modelName}</span>{#if live.thinkingLevel !== "off"}<span class="lvl">· {thinkLabel(live.thinkingLevel)}</span>{/if}
        </button>
        {#if live.leaves.length > 1}
          <button type="button" class="chip label-l" onclick={() => (sheet = "branch")} aria-haspopup="dialog">
            <Icon path={iBranch} size={18} />{t("branch.title")}<span class="n serial">{live.leaves.length}</span>
          </button>
        {/if}
      {/snippet}
    </Composer>
    {#if sheet === "model"}<ModelSheet onclose={() => (sheet = null)} />{/if}
    {#if sheet === "branch"}<BranchSheet onclose={() => (sheet = null)} />{/if}
    {#if actions}<MessageActions entryId={actions.entryId} text={actions.text} onclose={() => (actions = null)} onedit={startEdit} onforked={forked} />{/if}
  {/if}
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; min-height: 0; }
  .rule { height: 2px; margin: 0 16px; background: linear-gradient(90deg, var(--accent), transparent 70%); opacity: 0.7; flex: none; }
  .scroll { flex: 1; overflow-y: auto; min-height: 0; overscroll-behavior: contain; }
  .col { max-width: 840px; margin: 0 auto; padding: 16px 16px 24px; display: flex; flex-direction: column; gap: 20px; }
  .center { display: grid; place-items: center; padding: 64px 0; }
  .older { align-self: center; min-height: 48px; }
  .empty { color: var(--md-on-surface-variant); text-align: center; padding: 48px 16px; margin: 0; }
  .pending { padding: 4px 0; }
  .note { color: var(--md-on-surface-variant); margin: 0; }
  .none { flex: 1; display: grid; place-content: center; justify-items: center; gap: 8px; padding: 32px; text-align: center; }
  .none h2 { margin: 16px 0 0; } .none p { margin: 0 0 16px; color: var(--md-on-surface-variant); }
  .banner { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 16px; min-height: 48px; margin: 0 12px; border-radius: var(--radius-m); flex: none; }
  .banner span { flex: 1; word-break: break-word; }
  .offline { background: var(--md-surface-container-high); color: var(--md-on-surface-variant); padding-right: 16px; margin-top: 4px; }
  .error { background: var(--md-error-container); color: var(--md-on-surface); }
  .editing { background: var(--md-secondary-container); color: var(--md-on-secondary-container); margin-top: 4px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 8px; flex: none; cursor: pointer;
    border: 1px solid var(--md-outline-variant); border-radius: var(--radius-s); background: none; color: var(--md-on-surface-variant);
    position: relative;
  }
  .chip::before { content: ""; position: absolute; inset: -8px 0; }
  .chip .mono { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0; color: var(--md-on-surface); }
  .lvl { color: var(--md-primary); }
  .n { font-size: 0.6875rem; padding: 0 6px; border-radius: 8px; background: var(--md-primary); color: var(--md-on-primary); line-height: 16px; letter-spacing: 0; }
</style>

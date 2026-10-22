<script lang="ts">
  import { tick } from "svelte";
  import TopBar from "../components/TopBar.svelte";
  import StatusChip from "../components/StatusChip.svelte";
  import Message from "../components/Message.svelte";
  import Composer from "../components/Composer.svelte";
  import Rosette from "../components/Rosette.svelte";
  import Icon from "../components/Icon.svelte";
  import { iOffline, iClose } from "../icons";
  import { t } from "../i18n.svelte";
  import { live } from "../store/session.svelte";
  import { nav } from "../nav.svelte";
  import { basename } from "../time";
  import { projectAccent, serial } from "../theme.svelte";

  let scroller = $state<HTMLDivElement>();
  let nearBottom = true;

  const visible = $derived(live.messages.filter((m) => m.role !== "toolResult"));
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
          {#each visible as m, i (i)}
            <Message message={m} results={live.results} tools={live.tools} />
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
    <Composer running={live.running} disabled={!live.connected} onsend={send} onstop={() => void live.stop()} />
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
</style>

<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";
  import { iSend, iStop } from "../icons";
  import { t } from "../i18n.svelte";

  let { running, disabled = false, onsend, onstop, text = $bindable(""), chips }: {
    running: boolean; disabled?: boolean; onsend: (text: string) => void; onstop: () => void; text?: string; chips?: Snippet;
  } = $props();
  let el = $state<HTMLTextAreaElement>();

  export function focus() {
    el?.focus();
    queueMicrotask(grow);
  }

  function grow() {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }
  function submit() {
    if (!text.trim() || disabled) return;
    onsend(text);
    text = "";
    queueMicrotask(grow);
  }
</script>

<form class="composer" onsubmit={(e) => { e.preventDefault(); submit(); }}>
  {#if chips}<div class="chips">{@render chips()}</div>{/if}
  <div class="box">
    <textarea
      bind:this={el} bind:value={text} oninput={grow} rows="1" class="body-l"
      placeholder={running ? t("chat.placeholderSteer") : t("chat.placeholder")}
      enterkeyhint="send" autocapitalize="sentences"
      onkeydown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
    ></textarea>
    {#if running}
      <button type="button" class="icon-btn stop" onclick={onstop} aria-label={t("chat.stop")}><Icon path={iStop} /></button>
    {/if}
    <button class="send" disabled={!text.trim() || disabled} aria-label={running ? t("chat.steer") : t("chat.send")}>
      <Icon path={iSend} />
    </button>
  </div>
</form>

<style>
  .composer { padding: 4px 12px 12px; background: var(--md-surface); flex: none; }
  .chips { display: flex; gap: 8px; max-width: 840px; margin: 0 auto 6px; overflow-x: auto; scrollbar-width: none; }
  .box {
    display: flex; align-items: flex-end; gap: 4px; padding: 4px 4px 4px 20px; border-radius: var(--radius-xl);
    background: var(--md-surface-container-high); max-width: 840px; margin: 0 auto;
  }
  textarea {
    flex: 1; resize: none; border: 0; background: none; outline: none; color: var(--md-on-surface);
    padding: 12px 0; min-height: 48px; max-height: 200px; font-family: var(--font-sans);
  }
  textarea::placeholder { color: var(--md-on-surface-variant); }
  .stop { color: var(--md-error); }
  .send {
    width: 48px; height: 48px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer; flex: none;
    background: var(--md-primary); color: var(--md-on-primary); transition: opacity var(--dur-short), transform var(--dur-short) var(--ease-emph);
  }
  .send:disabled { background: transparent; color: var(--md-on-surface-variant); opacity: 0.6; cursor: default; }
  .send:not(:disabled):active { transform: scale(0.92); }
</style>

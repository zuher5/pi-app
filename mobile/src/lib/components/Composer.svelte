<script lang="ts">
  /** One card: the prompt on top, a quiet tool row under it (attach · model … thinking · send). */
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";
  import { iSend, iStop, iAttach } from "../icons";
  import { t } from "../i18n.svelte";

  let { running, disabled = false, onsend, onstop, onattach, text = $bindable(""), above, left, right, placeholder, shell = false }: {
    running: boolean; disabled?: boolean; onsend: (text: string) => void; onstop: () => void; onattach?: (files: File[]) => void;
    text?: string; above?: Snippet; left?: Snippet; right?: Snippet; placeholder?: string;
    /** Shell mode: a command line, monospace, Enter runs it. */
    shell?: boolean;
  } = $props();
  let el = $state<HTMLTextAreaElement>();
  let picker = $state<HTMLInputElement>();

  export function focus() {
    el?.focus();
    queueMicrotask(grow);
  }
  export function insert(s: string) {
    text = text && !text.endsWith(" ") && !text.endsWith("\n") ? `${text} ${s}` : `${text}${s}`;
    focus();
  }

  function grow() {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }
  $effect(() => { void text; queueMicrotask(grow); });
  function submit() {
    if (!text.trim() || disabled) return;
    onsend(text);
    text = "";
  }
</script>

<form class="composer" onsubmit={(e) => { e.preventDefault(); submit(); }}>
  {#if above}<div class="above">{@render above()}</div>{/if}
  <div class="card">
    {#if shell}<span class="prompt" aria-hidden="true">$</span>{/if}
    <textarea
      bind:this={el} bind:value={text} rows="1" class="body-l" class:shell spellcheck={!shell}
      placeholder={placeholder ?? (running ? t("chat.placeholderSteer") : t("chat.placeholder"))}
      enterkeyhint="send" autocapitalize={shell ? "off" : "sentences"}
      onkeydown={(e) => { if (e.key === "Enter" && (shell ? !e.shiftKey : e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
    ></textarea>
    <div class="row">
      {#if onattach}
        <button type="button" class="tool" aria-label={t("chat.attach")} onclick={() => picker?.click()} {disabled}><Icon path={iAttach} size={20} /></button>
        <input bind:this={picker} type="file" multiple hidden onchange={(e) => {
          const list = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (list.length) onattach?.(list);
        }} />
      {/if}
      <div class="left">{@render left?.()}</div>
      <div class="right">{@render right?.()}</div>
      {#if running}
        <button type="button" class="tool stop" onclick={onstop} aria-label={t("chat.stop")}><Icon path={iStop} size={20} /></button>
      {/if}
      <button class="send" disabled={!text.trim() || disabled || (shell && running)} aria-label={running ? t("chat.steer") : t("chat.send")}>
        <Icon path={iSend} size={20} />
      </button>
    </div>
  </div>
</form>

<style>
  .composer { padding: 4px 12px calc(var(--safe-bottom) + 12px); flex: none; }
  .above { display: flex; gap: 4px; max-width: 760px; margin: 0 auto 6px; overflow-x: auto; scrollbar-width: none; }
  .card {
    max-width: 760px; margin: 0 auto; border-radius: 22px; padding: 4px 6px 6px;
    background: var(--md-surface-container); box-shadow: inset 0 0 0 1px var(--md-outline-variant);
    transition: box-shadow var(--dur-short);
  }
  .card:focus-within { box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--md-primary) 45%, var(--md-outline-variant)); }
  textarea {
    display: block; width: 100%; resize: none; border: 0; background: none; outline: none; color: var(--md-on-surface);
    padding: 12px 12px 6px; min-height: 48px; max-height: 200px; font-family: var(--font-sans);
  }
  .card { position: relative; }
  .prompt { position: absolute; left: 14px; top: 12px; font: 500 0.9375rem/1.5rem var(--font-mono); color: var(--ctp-peach); }
  textarea.shell { font-family: var(--font-mono); font-size: 0.9375rem; padding-left: 30px; }
  textarea::placeholder { color: var(--md-on-surface-variant); opacity: 0.8; }
  .row { display: flex; align-items: center; gap: 2px; min-height: 44px; }
  .left { flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px; overflow: hidden; }
  .right { display: flex; align-items: center; gap: 2px; flex: none; }
  .tool {
    width: 44px; height: 44px; border-radius: 50%; border: 0; background: none; display: grid; place-items: center; flex: none;
    color: var(--md-on-surface-variant); cursor: pointer;
  }
  .tool:hover { background: color-mix(in oklab, var(--md-on-surface) 8%, transparent); }
  .tool:disabled { opacity: 0.38; }
  .stop { color: var(--md-error); }
  .send {
    width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer; flex: none; margin-left: 4px;
    background: var(--md-primary); color: var(--md-on-primary); transition: opacity var(--dur-short), transform var(--dur-short) var(--ease-emph);
  }
  .send:disabled { background: var(--md-surface-container-highest); color: var(--md-on-surface-variant); opacity: 0.7; cursor: default; }
  .send:not(:disabled):active { transform: scale(0.92); }
</style>

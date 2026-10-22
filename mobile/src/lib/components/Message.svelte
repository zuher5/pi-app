<script lang="ts">
  import ToolCard from "./ToolCard.svelte";
  import Icon from "./Icon.svelte";
  import { iThinking, iExpand, iError } from "../icons";
  import { renderMarkdown } from "../markdown";
  import { t } from "../i18n.svelte";
  import type { AgentMessage, ToolResultMessage } from "@pi/types";
  import type { ToolRun } from "../store/session.svelte";

  let { message, results, tools, streaming = false }: {
    message: AgentMessage; results: Record<string, ToolResultMessage>; tools: Record<string, ToolRun>; streaming?: boolean;
  } = $props();
  let thinkingOpen = $state<Record<number, boolean>>({});

  const userText = $derived(
    message.role === "user"
      ? typeof message.content === "string" ? message.content : message.content.map((b) => (b.type === "text" ? b.text : "")).join("")
      : "",
  );
</script>

{#if message.role === "user"}
  <div class="user"><div class="bubble body-l">{userText}</div></div>
{:else if message.role === "assistant"}
  <div class="assistant" class:streaming>
    {#each message.content as block, i (i)}
      {#if block.type === "text" && block.text}
        <div class="md body-l">{@html renderMarkdown(block.text)}</div>
      {:else if block.type === "thinking" && block.thinking}
        <div class="thinking">
          <button class="th-head label-l" onclick={() => (thinkingOpen[i] = !thinkingOpen[i])} aria-expanded={!!thinkingOpen[i]}>
            <Icon path={iThinking} size={18} />{t("chat.thinking")}<span class="chev" class:rot={thinkingOpen[i]}><Icon path={iExpand} size={18} /></span>
          </button>
          {#if thinkingOpen[i]}<div class="th-body body-m">{block.thinking}</div>{/if}
        </div>
      {:else if block.type === "toolCall"}
        <ToolCard call={block} result={results[block.toolCallId]} run={tools[block.toolCallId]} />
      {/if}
    {/each}
    {#if message.stopReason === "error" && message.errorMessage}
      <div class="error body-m" role="alert"><Icon path={iError} size={18} /><span><strong>{t("chat.error")}</strong><br />{message.errorMessage}</span></div>
    {/if}
  </div>
{/if}

<style>
  .user { display: flex; justify-content: flex-end; padding-left: 48px; }
  .bubble {
    background: var(--md-primary-container); color: var(--md-on-primary-container);
    padding: 10px 16px; border-radius: 20px 20px 6px 20px; white-space: pre-wrap; word-break: break-word;
  }
  .assistant { display: grid; gap: 10px; min-width: 0; }
  .md { word-break: break-word; overflow-wrap: anywhere; }
  .md :global(p) { margin: 0 0 0.75em; } .md :global(p:last-child) { margin-bottom: 0; }
  .md :global(ul), .md :global(ol) { margin: 0 0 0.75em; padding-left: 1.4em; }
  .md :global(li + li) { margin-top: 0.25em; }
  .md :global(h1), .md :global(h2), .md :global(h3) { font-size: 1.125rem; line-height: 1.5rem; margin: 1.1em 0 0.4em; font-weight: 500; }
  .md :global(code) { font-size: 0.875em; background: var(--md-code-bg); padding: 0.1em 0.35em; border-radius: 4px; }
  .md :global(pre) { background: var(--md-code-bg); padding: 12px 14px; border-radius: var(--radius-m); overflow-x: auto; margin: 0 0 0.75em; font-size: 0.8125rem; line-height: 1.25rem; }
  .md :global(pre code) { background: none; padding: 0; font-size: inherit; }
  .md :global(blockquote) { margin: 0 0 0.75em; padding-left: 12px; box-shadow: inset 1px 0 var(--md-outline); color: var(--md-on-surface-variant); }
  .md :global(table) { border-collapse: collapse; display: block; overflow-x: auto; font-size: 0.875rem; margin-bottom: 0.75em; }
  .md :global(th), .md :global(td) { border: 1px solid var(--md-outline-variant); padding: 6px 10px; }
  .streaming .md:last-of-type :global(> :last-child)::after {
    content: ""; display: inline-block; width: 0.5em; height: 1em; margin-left: 2px; vertical-align: -0.12em;
    background: var(--md-primary); border-radius: 1px; animation: blink 1s steps(2) infinite;
  }
  .thinking { color: var(--md-on-surface-variant); }
  .th-head { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; border: 0; background: none; cursor: pointer; color: inherit; padding: 0; }
  .chev { display: grid; transition: transform var(--dur-short); } .rot { transform: rotate(180deg); }
  .th-body { white-space: pre-wrap; padding: 4px 0 4px 12px; box-shadow: inset 1px 0 var(--md-outline-variant); }
  .error { display: flex; gap: 10px; padding: 12px; border-radius: var(--radius-m); background: var(--md-error-container); color: var(--md-on-surface); }
  .error :global(svg) { color: var(--md-error); }
  @keyframes blink { 50% { opacity: 0; } }
</style>

<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "./Icon.svelte";
  import Rosette from "./Rosette.svelte";
  import { iExpand, iCheck, iError, iTool, iShell } from "../icons";
  import { t } from "../i18n.svelte";
  import type { ToolCallContent, ToolResultMessage } from "@pi/types";
  import type { ToolRun } from "../store/session.svelte";

  let { call, result, run, initialOpen = false }: { call: ToolCallContent; result?: ToolResultMessage; run?: ToolRun; initialOpen?: boolean } = $props();
  let open = $state(untrack(() => initialOpen));
  const isShell = $derived(/^(bash|shell|powershell)/.test(call.toolName));
  // The summary already shows a lone command or path; repeat the arguments only when there are more.
  const showArgs = $derived(Object.keys(call.input ?? {}).length > 1);

  const phase = $derived(result ? (result.isError ? "error" : "done") : run?.state ?? (call.rawInput !== undefined ? "running" : "done"));
  const summary = $derived.by(() => {
    const i = call.input ?? {};
    const v = (i.command ?? i.path ?? i.file_path ?? i.pattern ?? i.query ?? i.url) as string | undefined;
    if (v) return String(v);
    if (call.rawInput) return call.rawInput;
    const s = JSON.stringify(i);
    return s === "{}" ? "" : s;
  });
  const output = $derived(
    result ? result.content.map((b) => (b.type === "text" ? b.text : "[image]")).join("") : run?.output ?? "",
  );
</script>

<div class="tool {phase}">
  <button class="head" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="ic">
      {#if phase === "running"}<Rosette state="streaming" size={18} />
      {:else if phase === "error"}<Icon path={iError} size={18} />
      {:else}<Icon path={isShell ? iShell : iTool} size={18} />{/if}
    </span>
    <span class="name label-l">{call.toolName}</span>
    <code class="sum">{summary}</code>
    <span class="st label-s">{phase === "running" ? t("chat.tool.running") : phase === "error" ? t("chat.tool.error") : ""}</span>
    {#if phase === "done"}<span class="ok"><Icon path={iCheck} size={16} /></span>{/if}
    <span class="chev" class:rot={open}><Icon path={iExpand} size={20} /></span>
  </button>
  {#if open}
    <div class="body">
      {#if showArgs}
        <pre class="args">{JSON.stringify(call.input, null, 2)}</pre>
      {/if}
      {#if output}<pre class="out">{output}</pre>{/if}
    </div>
  {:else if phase === "running" && output}
    <pre class="out tail">{output.split("\n").slice(-4).join("\n")}</pre>
  {/if}
</div>

<style>
  .tool { border-radius: var(--radius-m); background: var(--md-surface-container); overflow: hidden; }
  .head { width: 100%; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 8px 0 12px; border: 0; background: none; cursor: pointer; text-align: left; color: var(--md-on-surface); }
  .ic { color: var(--md-on-surface-variant); display: grid; }
  .error .ic, .error .st { color: var(--md-error); }
  .name { flex: none; }
  .sum { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8125rem; color: var(--md-on-surface-variant); }
  .st { color: var(--md-primary); flex: none; }
  .ok { color: var(--ctp-green); display: grid; }
  .chev { display: grid; color: var(--md-on-surface-variant); transition: transform var(--dur-short) var(--ease-emph); }
  .rot { transform: rotate(180deg); }
  .body { padding: 0 12px 12px; display: grid; gap: 8px; }
  pre { margin: 0; padding: 10px 12px; border-radius: var(--radius-s); background: var(--md-code-bg); font-size: 0.75rem; line-height: 1.125rem; overflow-x: auto; max-height: 320px; overflow-y: auto; white-space: pre; }
  .args { color: var(--md-on-surface-variant); }
  .tail { margin: 0 12px 12px; max-height: 5.5rem; color: var(--md-on-surface-variant); }
</style>

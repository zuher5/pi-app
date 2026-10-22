<script lang="ts">
  import Rosette from "./Rosette.svelte";
  import { t } from "../i18n.svelte";
  import type { AgentStatus } from "../store/session.svelte";
  let { status }: { status: AgentStatus } = $props();
</script>

<div class="chip {status}" role="status" aria-live="polite">
  <Rosette state={status} size={20} />
  <span class="label-l">{t(`status.${status}`)}</span>
</div>

<style>
  .chip {
    display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 8px;
    border-radius: var(--radius-s); background: var(--md-surface-container-high); color: var(--md-on-surface-variant);
    white-space: nowrap;
  }
  .streaming { background: var(--md-primary-container); color: var(--md-on-primary-container); }
  .waiting { background: color-mix(in oklab, var(--ctp-peach) 22%, var(--md-surface)); color: var(--md-on-surface); }
  .disconnected { color: var(--md-error); }
</style>

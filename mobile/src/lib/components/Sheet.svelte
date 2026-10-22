<script lang="ts">
  import type { Snippet } from "svelte";
  import { onBack } from "../nav.svelte";

  let { title, onclose, children }: { title?: string; onclose: () => void; children: Snippet } = $props();
  const id = `sheet-${Math.random().toString(36).slice(2, 8)}`;
  $effect(() => onBack(() => { onclose(); return true; }));
</script>

<div class="scrim" onclick={onclose} role="presentation"></div>
<div class="sheet" role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined}>
  <div class="handle" aria-hidden="true"></div>
  {#if title}<h2 {id} class="title-l">{title}</h2>{/if}
  {@render children()}
</div>

<style>
  .scrim { position: fixed; inset: 0; background: var(--md-scrim); z-index: 20; animation: fade var(--dur-med) var(--ease-emph); }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-height: 88%; overflow-y: auto;
    background: var(--md-surface-container-low); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding: 8px 12px calc(var(--safe-bottom) + 16px); max-width: 640px; margin: 0 auto;
    animation: rise var(--dur-med) var(--ease-decel);
  }
  .handle { width: 32px; height: 4px; border-radius: 2px; background: var(--md-outline); opacity: 0.4; margin: 14px auto 14px; }
  h2 { margin: 0 12px 12px; }
  @keyframes rise { from { transform: translateY(100%); } }
  @keyframes fade { from { opacity: 0; } }
</style>

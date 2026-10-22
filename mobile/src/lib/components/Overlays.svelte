<script lang="ts">
  import { snack, dialog, onBack } from "../nav.svelte";

  function close(ok: boolean) {
    const r = dialog.resolve;
    dialog.text = null;
    dialog.resolve = null;
    r?.(ok);
  }
  $effect(() => {
    if (!dialog.text) return;
    return onBack(() => { close(false); return true; });
  });
</script>

{#if dialog.text}
  <div class="scrim" role="presentation" onclick={() => close(false)}></div>
  <div class="dialog" role="alertdialog" aria-modal="true" aria-describedby="dlg-text">
    <p id="dlg-text" class="body-l">{dialog.text}</p>
    <div class="acts">
      <button class="btn btn-text" onclick={() => close(false)}>{dialog.cancel}</button>
      <button class="btn btn-text" class:danger={dialog.danger} onclick={() => close(true)}>{dialog.confirm}</button>
    </div>
  </div>
{/if}

{#if snack.text}
  {#key snack.seq}
    <div class="snack body-m" role="status">{snack.text}</div>
  {/key}
{/if}

<style>
  .scrim { position: fixed; inset: 0; background: var(--md-scrim); z-index: 40; }
  .dialog {
    position: fixed; z-index: 41; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(312px + 10vw, calc(100% - 48px)); max-width: 560px; padding: 24px 24px 16px;
    border-radius: var(--radius-xl); background: var(--md-surface-container-high); box-shadow: var(--md-shadow);
    animation: pop var(--dur-med) var(--ease-decel);
  }
  p { margin: 0 0 20px; color: var(--md-on-surface); }
  .acts { display: flex; justify-content: flex-end; gap: 8px; }
  .acts .btn { min-height: 48px; }
  .danger { color: var(--md-error); }
  .snack {
    position: fixed; z-index: 30; left: 16px; right: 16px; bottom: calc(96px + var(--safe-bottom));
    max-width: 560px; margin: 0 auto; padding: 14px 16px; border-radius: 4px;
    background: var(--ctp-text); color: var(--ctp-base); box-shadow: var(--md-shadow);
    animation: up var(--dur-med) var(--ease-decel);
  }
  @keyframes pop { from { opacity: 0; transform: translate(-50%, -46%); } }
  @keyframes up { from { opacity: 0; transform: translateY(12px); } }
</style>

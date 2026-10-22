<script lang="ts">
  import Sheet from "./Sheet.svelte";
  import Icon from "./Icon.svelte";
  import { iCopy, iEdit, iFork } from "../icons";
  import { t } from "../i18n.svelte";
  import { live } from "../store/session.svelte";
  import { toast } from "../nav.svelte";

  let { entryId, text, onclose, onedit, onforked }: {
    entryId: string | undefined; text: string; onclose: () => void; onedit: () => void; onforked: (id: string) => void;
  } = $props();
  let busy = $state(false);

  async function copy() {
    await navigator.clipboard?.writeText(text).catch(() => {});
    toast(t("msg.copied"));
    onclose();
  }
  async function fork() {
    if (!entryId) return;
    busy = true;
    try {
      const id = await live.fork(entryId);
      if (id) onforked(id);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }
</script>

<Sheet {onclose}>
  <blockquote class="body-m">{text}</blockquote>
  <ul>
    <li><button class="row" onclick={copy}><Icon path={iCopy} />{t("msg.copy")}</button></li>
    {#if entryId}
      <li><button class="row" disabled={live.running || busy} onclick={() => { onedit(); onclose(); }}><Icon path={iEdit} /><span class="txt"><span class="body-l">{t("msg.edit")}</span><span class="body-s sub">{t("msg.editSub")}</span></span></button></li>
      <li><button class="row" disabled={busy} onclick={fork}><Icon path={iFork} /><span class="txt"><span class="body-l">{t("msg.fork")}</span><span class="body-s sub">{t("msg.forkSub")}</span></span></button></li>
    {/if}
  </ul>
  {#if !entryId}<p class="body-s sub pad">{t("msg.notSaved")}</p>{/if}
</Sheet>

<style>
  blockquote { margin: 0 12px 12px; padding: 12px 16px; border-radius: var(--radius-l); background: var(--md-surface-container-high); max-height: 6.5em; overflow: hidden; white-space: pre-wrap; color: var(--md-on-surface-variant); }
  ul { list-style: none; margin: 0; padding: 0; }
  .row { width: 100%; display: flex; align-items: center; gap: 16px; min-height: 56px; padding: 6px 12px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; color: var(--md-on-surface); font: inherit; }
  .row:hover:not(:disabled) { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .row:disabled { opacity: 0.5; cursor: default; }
  .row :global(svg) { color: var(--md-on-surface-variant); flex: none; }
  .txt { display: grid; }
  .sub { color: var(--md-on-surface-variant); }
  .pad { margin: 4px 12px; }
</style>

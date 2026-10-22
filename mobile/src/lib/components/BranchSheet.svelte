<script lang="ts">
  import Sheet from "./Sheet.svelte";
  import Icon from "./Icon.svelte";
  import { iBranch, iCheck } from "../icons";
  import { t } from "../i18n.svelte";
  import { live } from "../store/session.svelte";
  import { toast } from "../nav.svelte";
  import { relTime } from "../time";

  let { onclose }: { onclose: () => void } = $props();
  let busy = $state(false);

  async function go(id: string) {
    busy = true;
    try {
      if (await live.navigate(id)) onclose();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title={t("branch.title")} {onclose}>
  <p class="lead body-m">{t("branch.lead", { n: live.leaves.length })}</p>
  <ul>
    {#each live.leaves as leaf, i (leaf.id)}
      <li>
        <button class="row" class:active={leaf.active} disabled={busy || live.running || leaf.active} onclick={() => go(leaf.id)} aria-current={leaf.active}>
          <span class="ic"><Icon path={leaf.active ? iCheck : iBranch} size={20} /></span>
          <span class="txt">
            <span class="body-l preview">{leaf.preview || t("branch.untitled", { n: live.leaves.length - i })}</span>
            <span class="body-s meta"><span class="serial">{leaf.id.slice(0, 8).toUpperCase()}</span> · {relTime(leaf.timestamp)}{leaf.active ? ` · ${t("branch.current")}` : ""}</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
  {#if live.running}<p class="lead body-s">{t("branch.busy")}</p>{/if}
</Sheet>

<style>
  .lead { margin: 0 12px 8px; color: var(--md-on-surface-variant); }
  ul { list-style: none; margin: 0; padding: 0; }
  .row { width: 100%; display: flex; align-items: center; gap: 16px; min-height: 64px; padding: 6px 12px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; }
  .row:hover:not(:disabled) { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .row:disabled:not(.active) { opacity: 0.6; }
  .row.active { background: var(--md-secondary-container); cursor: default; }
  .ic { color: var(--md-primary); display: grid; flex: none; }
  .txt { display: grid; min-width: 0; }
  .preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { color: var(--md-on-surface-variant); }
  .serial { font-family: var(--font-mono); font-size: 0.75rem; }
</style>

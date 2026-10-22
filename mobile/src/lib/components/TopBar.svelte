<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import { iBack, iMenu } from "../icons";
  import { nav } from "../nav.svelte";
  import { t } from "../i18n.svelte";
  let { title, subtitle, onback, actions, lead }: { title: string; subtitle?: string; onback?: () => void; actions?: Snippet; lead?: Snippet } = $props();
</script>

<header class="bar" class:has-back={!!onback}>
  {#if onback}
    <button class="icon-btn" onclick={onback} aria-label="Back"><Icon path={iBack} /></button>
  {:else if !lead}
    <button class="icon-btn" onclick={() => (nav.drawer = true)} aria-label={t("nav.menu")}><Icon path={iMenu} /></button>
  {/if}
  {@render lead?.()}
  <div class="titles">
    <h1 class="title-m">{title}</h1>
    {#if subtitle}<p class="body-s sub">{subtitle}</p>{/if}
  </div>
  <div class="actions">{@render actions?.()}</div>
</header>

<style>
  .bar {
    display: flex; align-items: center; gap: 4px; min-height: 56px;
    padding: calc(var(--safe-top) + 8px) 4px 8px 4px; background: var(--md-surface);
    position: sticky; top: 0; z-index: 5;
  }
  .titles { padding-left: 4px; }
  .titles { flex: 1; min-width: 0; }
  h1 { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { margin: 0; color: var(--md-on-surface-variant); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; align-items: center; gap: 4px; padding-right: 4px; }
</style>

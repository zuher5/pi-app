<script lang="ts">
  import Icon from "./Icon.svelte";
  import { iSessions, iChat, iFiles, iTerminal, iSettings } from "../icons";
  import { t } from "../i18n.svelte";
  import type { Tab } from "../nav.svelte";

  let { tab, onselect, busy = false }: { tab: Tab; onselect: (t: Tab) => void; busy?: boolean } = $props();
  const items: { id: Tab; icon: string }[] = [
    { id: "sessions", icon: iSessions }, { id: "chat", icon: iChat }, { id: "files", icon: iFiles },
    { id: "terminal", icon: iTerminal }, { id: "settings", icon: iSettings },
  ];
</script>

<nav class="nav" aria-label="Main">
  {#each items as item (item.id)}
    <button class="item" class:active={tab === item.id} aria-current={tab === item.id ? "page" : undefined} onclick={() => onselect(item.id)}>
      <span class="pill">
        <Icon path={item.icon} />
        {#if item.id === "chat" && busy}<span class="dot" aria-hidden="true"></span>{/if}
      </span>
      <span class="label-m">{t(`nav.${item.id}`)}</span>
    </button>
  {/each}
</nav>

<style>
  .nav {
    display: flex; background: var(--md-surface-container); padding-bottom: var(--safe-bottom);
    flex: none;
  }
  .item {
    flex: 1; min-height: 80px; border: 0; background: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    color: var(--md-on-surface-variant); padding: 12px 0 16px;
  }
  .pill {
    width: 64px; height: 32px; border-radius: 16px; display: grid; place-items: center; position: relative;
    transition: background var(--dur-med) var(--ease-emph);
  }
  .active { color: var(--md-on-surface); }
  .active .pill { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
  .active .label-m { font-weight: 700; }
  .dot { position: absolute; top: 4px; right: 18px; width: 8px; height: 8px; border-radius: 50%; background: var(--md-primary); }

  /* Expanded width: navigation rail */
  @media (min-width: 600px) {
    .nav { flex-direction: column; justify-content: flex-start; width: 80px; padding: calc(var(--safe-top) + 44px) 0 0; gap: 12px; }
    .item { flex: none; min-height: 56px; padding: 0; }
  }
</style>

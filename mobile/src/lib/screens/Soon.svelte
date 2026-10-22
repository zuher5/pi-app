<script lang="ts">
  import TopBar from "../components/TopBar.svelte";
  import Icon from "../components/Icon.svelte";
  import { t } from "../i18n.svelte";
  let { title, lead, icon }: { title: string; lead: string; icon: string } = $props();
</script>

<div class="screen">
  <TopBar {title} />
  <div class="body">
    <span class="ic"><Icon path={icon} size={32} /></span>
    <span class="badge label-m">{t("soon.badge")}</span>
    <p class="body-l">{lead}</p>
  </div>
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; }
  .body { flex: 1; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 32px; text-align: center; }
  .ic { width: 72px; height: 72px; border-radius: var(--radius-l); display: grid; place-items: center; background: var(--md-surface-container-high); color: var(--md-on-surface-variant); }
  .badge { padding: 4px 10px; border-radius: 8px; background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
  p { margin: 0; max-width: 32ch; color: var(--md-on-surface-variant); }
</style>

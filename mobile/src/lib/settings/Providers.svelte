<script lang="ts">
  /** Every provider pi knows: sign in with an account or a key, and custom ones from models.json. */
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import ProviderSheet from "./ProviderSheet.svelte";
  import { iChevron, iPlus, iServer, iSearch, iCheck } from "../icons";
  import { t } from "../i18n.svelte";
  import { providers, type ModelsConfig } from "../api";

  let { onedit }: { onedit: (name: string | null, cfg: ModelsConfig) => void } = $props();

  type Row = { id: string; name: string; configured: boolean; how: "key" | "oauth" | null; models: number; key: boolean; oauth: boolean };
  let rows = $state<Row[] | null>(null);
  let cfg = $state<ModelsConfig>({ providers: {} });
  let error = $state<string | null>(null);
  let query = $state("");
  let open = $state<Row | null>(null);

  async function load() {
    error = null;
    try {
      const [list, config] = await Promise.all([providers.list(), providers.config().catch(() => ({ providers: {} }))]);
      cfg = config;
      const map = new Map<string, Row>();
      for (const p of list.apiKeyProviders) map.set(p.id, { id: p.id, name: p.displayName, configured: p.configured, how: p.configured ? "key" : null, models: p.modelCount, key: true, oauth: p.supportsOAuth });
      for (const p of list.oauthProviders) {
        const r = map.get(p.id) ?? { id: p.id, name: p.name, configured: false, how: null, models: 0, key: p.supportsApiKey, oauth: true };
        if (p.loggedIn) { r.configured = true; r.how = "oauth"; }
        r.oauth = true;
        map.set(p.id, r);
      }
      rows = [...map.values()].sort((a, b) => Number(b.configured) - Number(a.configured) || a.name.localeCompare(b.name));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      rows = [];
    }
  }
  $effect(() => { void load(); });

  const custom = $derived(Object.entries(cfg.providers ?? {}).filter(([, p]) => p.baseUrl || (p.models?.length ?? 0) > 0));
  const filtered = $derived((rows ?? []).filter((r) => !query.trim() || `${r.name} ${r.id}`.toLowerCase().includes(query.trim().toLowerCase())));
  const connected = $derived(filtered.filter((r) => r.configured));
  const others = $derived(filtered.filter((r) => !r.configured));
</script>

{#if rows === null}
  <div class="center"><Rosette state="connecting" size={32} /></div>
{:else}
  {#if error}<p class="err body-m">{error}</p>{/if}

  <h2 class="group-title">{t("prov.custom")}</h2>
  <div class="group">
    {#each custom as [name, p] (name)}
      <button class="lrow" onclick={() => onedit(name, cfg)}>
        <Icon path={iServer} size={22} />
        <span class="ltxt"><span class="body-l">{name}</span><span class="lsub body-s">{p.baseUrl ?? p.api ?? ""}</span></span>
        <span class="lend body-s">{t("prov.models", { n: p.models?.length ?? 0 })}<Icon path={iChevron} size={20} /></span>
      </button>
    {/each}
    <button class="lrow add" onclick={() => onedit(null, cfg)}>
      <Icon path={iPlus} size={22} />
      <span class="ltxt"><span class="body-l">{t("prov.add")}</span><span class="lsub body-s">{t("prov.addSub")}</span></span>
    </button>
  </div>

  <label class="search">
    <Icon path={iSearch} size={18} />
    <input class="body-m" bind:value={query} placeholder={t("prov.search")} />
  </label>

  {#if connected.length}
    <h2 class="group-title">{t("prov.connected")}</h2>
    <div class="group">
      {#each connected as r (r.id)}
        <button class="lrow" onclick={() => (open = r)}>
          <span class="ltxt"><span class="body-l">{r.name}</span><span class="lsub body-s">{r.how === "oauth" ? t("prov.viaAccount") : t("prov.viaKey")} · {t("prov.models", { n: r.models })}</span></span>
          <span class="lend badge-ok"><Icon path={iCheck} size={20} /></span>
        </button>
      {/each}
    </div>
  {/if}

  <h2 class="group-title">{t("prov.available")}</h2>
  <div class="group">
    {#each others as r (r.id)}
      <button class="lrow" onclick={() => (open = r)}>
        <span class="ltxt"><span class="body-l">{r.name}</span><span class="lsub body-s">{[r.key ? t("prov.key") : "", r.oauth ? t("prov.account") : ""].filter(Boolean).join(" · ")}</span></span>
        <span class="lend"><Icon path={iChevron} size={20} /></span>
      </button>
    {:else}
      <p class="none body-m">{t("prov.noMatch")}</p>
    {/each}
  </div>
{/if}

{#if open}<ProviderSheet provider={open} onclose={() => (open = null)} onchanged={() => { open = null; void load(); }} />{/if}

<style>
  .center { display: grid; place-items: center; padding: 48px; }
  .err { color: var(--md-error); margin: 16px 4px 0; }
  .add > :global(svg:first-child) { color: var(--md-primary); }
  .add .body-l { color: var(--md-primary); }
  .search {
    display: flex; align-items: center; gap: 8px; margin: 24px 0 0; padding: 0 12px; height: 44px;
    border-radius: var(--radius-m); background: var(--md-surface-container-high); color: var(--md-on-surface-variant);
  }
  .search input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: var(--md-on-surface); height: 100%; }
  .none { margin: 0; padding: 16px; color: var(--md-on-surface-variant); }
</style>

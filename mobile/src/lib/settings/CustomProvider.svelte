<script lang="ts">
  import { untrack } from "svelte";
  /** Add or edit a provider in models.json: endpoint, API style, key, and its models (listed from the endpoint or typed). */
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import { iDiscover, iDelete, iPlus, iCheck } from "../icons";
  import { t } from "../i18n.svelte";
  import { providers, API_KINDS, type CustomModel, type ModelsConfig } from "../api";
  import { toast, confirmDialog } from "../nav.svelte";

  let { name: original, cfg, ondone }: { name: string | null; cfg: ModelsConfig; ondone: () => void } = $props();
  // The form edits a copy taken once when it opens.
  const start = untrack(() => (original ? (cfg.providers[original] ?? {}) : {}));
  let name = $state(untrack(() => original) ?? "");
  let baseUrl = $state(start.baseUrl ?? "");
  let apiKind = $state<string>(start.api ?? "openai-completions");
  let apiKey = $state(start.apiKey ?? "");
  let models = $state<CustomModel[]>(structuredClone($state.snapshot(start.models ?? []) as CustomModel[]));
  let newModel = $state("");
  let found = $state<CustomModel[] | null>(null);
  let chosen = $state<Set<string>>(new Set());
  let discovering = $state(false);
  let saving = $state(false);

  const nameOk = $derived(/^[a-z0-9][a-z0-9._-]*$/i.test(name.trim()));
  const taken = $derived(!!name.trim() && name.trim() !== original && !!cfg.providers[name.trim()]);
  const canSave = $derived(nameOk && !taken && !!baseUrl.trim() && models.length > 0 && !saving);

  function draft() {
    return { ...(original ? cfg.providers[original] : {}), baseUrl: baseUrl.trim(), api: apiKind, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), models: $state.snapshot(models) as CustomModel[] };
  }

  async function discover() {
    discovering = true;
    try {
      const r = await providers.discover(name.trim() || "custom", draft());
      const have = new Set(models.map((m) => m.id));
      found = r.models.filter((m) => !have.has(m.id));
      chosen = new Set();
      if (!found.length) toast(t("prov.allListed"));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      discovering = false;
    }
  }
  function addChosen() {
    models = [...models, ...(found ?? []).filter((m) => chosen.has(m.id))];
    found = null;
  }
  function addTyped() {
    const id = newModel.trim();
    if (!id || models.some((m) => m.id === id)) return;
    models = [...models, { id }];
    newModel = "";
  }

  async function save() {
    saving = true;
    try {
      const next: ModelsConfig = { ...cfg, providers: { ...cfg.providers } };
      if (original && original !== name.trim()) delete next.providers[original];
      next.providers[name.trim()] = draft();
      await providers.saveConfig(next);
      toast(t("prov.saved"));
      ondone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      saving = false;
    }
  }
  async function removeProvider() {
    if (!original || !(await confirmDialog(t("prov.deleteAsk", { name: original }), t("prov.delete"), t("file.cancel"), true))) return;
    const next: ModelsConfig = { ...cfg, providers: { ...cfg.providers } };
    delete next.providers[original];
    try { await providers.saveConfig(next); toast(t("prov.removed")); ondone(); }
    catch (e) { toast(e instanceof Error ? e.message : String(e)); }
  }
</script>

<form class="form" onsubmit={(e) => { e.preventDefault(); if (canSave) void save(); }}>
  <div class="field">
    <label class="body-s" for="pn">{t("prov.name")}</label>
    <input id="pn" bind:value={name} autocapitalize="off" spellcheck="false" placeholder="my-llm" />
    <span class="hint body-s" class:err={(!nameOk && !!name) || taken}>{taken ? t("prov.nameTaken") : t("prov.nameHint")}</span>
  </div>
  <div class="field">
    <label class="body-s" for="pu">{t("prov.baseUrl")}</label>
    <input id="pu" bind:value={baseUrl} inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://api.example.com/v1" />
  </div>
  <div class="field">
    <label class="body-s" for="pa">{t("prov.api")}</label>
    <select id="pa" bind:value={apiKind}>
      {#each API_KINDS as k (k)}<option value={k}>{k}</option>{/each}
    </select>
  </div>
  <div class="field">
    <label class="body-s" for="pk">{t("prov.apiKey")}</label>
    <input id="pk" type="password" bind:value={apiKey} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-… / MY_API_KEY" />
    <span class="hint body-s">{t("prov.customKeyHint")}</span>
  </div>

  <h2 class="group-title">{t("prov.modelsTitle")}</h2>
  <div class="group">
    {#each models as m, i (m.id)}
      <div class="lrow">
        <span class="ltxt"><span class="body-l mono">{m.id}</span>{#if m.contextWindow}<span class="lsub body-s">{t("prov.ctx", { n: Math.round(m.contextWindow / 1000) })}</span>{/if}</span>
        <button type="button" class="icon-btn" aria-label={t("prov.delete")} onclick={() => (models = models.filter((_, j) => j !== i))}><Icon path={iDelete} size={20} /></button>
      </div>
    {/each}
    <div class="lrow addrow">
      <input class="body-l" bind:value={newModel} placeholder={t("prov.modelId")} autocapitalize="off" spellcheck="false"
        onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }} />
      <button type="button" class="icon-btn" aria-label={t("prov.addModel")} disabled={!newModel.trim()} onclick={addTyped}><Icon path={iPlus} size={20} /></button>
    </div>
  </div>
  <button type="button" class="btn btn-tonal" disabled={discovering || !baseUrl.trim()} onclick={discover}>
    {#if discovering}<Rosette state="connecting" size={18} />{:else}<Icon path={iDiscover} size={18} />{/if}{t("prov.discover")}
  </button>

  {#if found?.length}
    <div class="group">
      {#each found as m (m.id)}
        <button type="button" class="lrow" aria-pressed={chosen.has(m.id)} onclick={() => { const s = new Set(chosen); s.has(m.id) ? s.delete(m.id) : s.add(m.id); chosen = s; }}>
          <span class="box" class:on={chosen.has(m.id)}>{#if chosen.has(m.id)}<Icon path={iCheck} size={16} />{/if}</span>
          <span class="ltxt"><span class="body-m mono">{m.id}</span></span>
        </button>
      {/each}
    </div>
    <button type="button" class="btn btn-tonal" disabled={!chosen.size} onclick={addChosen}>{t("prov.addN", { n: chosen.size })}</button>
  {/if}

  <div class="actions">
    {#if original}<button type="button" class="btn btn-text danger" onclick={removeProvider}>{t("prov.delete")}</button>{/if}
    <button class="btn btn-filled" disabled={!canSave}>{t("file.save")}</button>
  </div>
</form>

<style>
  .form { display: grid; gap: 16px; padding-top: 16px; }
  .field select { appearance: auto; }
  .err { color: var(--md-error) !important; }
  .group-title { margin-bottom: -8px; }
  .mono { font-family: var(--font-mono); font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .addrow input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: var(--md-on-surface); min-height: 40px; font-family: var(--font-mono); font-size: 0.875rem; }
  .box { width: 22px; height: 22px; border-radius: 6px; box-shadow: inset 0 0 0 2px var(--md-outline); display: grid; place-items: center; flex: none; }
  .box.on { background: var(--md-primary); color: var(--md-on-primary); box-shadow: none; }
  .btn { min-height: 48px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 0 24px; }
  .danger { color: var(--md-error); margin-right: auto; }
</style>

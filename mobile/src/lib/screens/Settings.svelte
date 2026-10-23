<script lang="ts">
  /** Settings: an index of groups, each opening its own page (providers, default model, server). */
  import TopBar from "../components/TopBar.svelte";
  import Icon from "../components/Icon.svelte";
  import Providers from "../settings/Providers.svelte";
  import CustomProvider from "../settings/CustomProvider.svelte";
  import DefaultModel from "../settings/DefaultModel.svelte";
  import { iChevron, iKey, iModel, iServer, iPalette, iLanguage } from "../icons";
  import { t, i18n, setLocale, type Locale } from "../i18n.svelte";
  import { theme, setTheme, type ThemePref } from "../theme.svelte";
  import { conn, forget } from "../store/connection.svelte";
  import { live } from "../store/session.svelte";
  import { picked } from "../store/project.svelte";
  import { onBack, confirmDialog } from "../nav.svelte";
  import type { ModelsConfig } from "../api";

  type Page = { id: "main" } | { id: "providers" } | { id: "custom"; name: string | null; cfg: ModelsConfig } | { id: "default" } | { id: "server" };
  let page = $state<Page>({ id: "main" });
  const themes: ThemePref[] = ["system", "light", "dark"];
  const locales: { id: Locale; label: string }[] = [{ id: "id", label: "Bahasa Indonesia" }, { id: "en", label: "English" }];
  const cwd = $derived(live.info?.cwd ?? picked.cwd ?? "");

  function back(): boolean {
    if (page.id === "custom") page = { id: "providers" };
    else if (page.id !== "main") page = { id: "main" };
    else return false;
    return true;
  }
  $effect(() => onBack(back));

  const titles = $derived({
    main: t("settings.title"), providers: t("prov.title"), default: t("def.title"), server: t("settings.server"),
    custom: page.id === "custom" && page.name ? page.name : t("prov.add"),
  } as Record<Page["id"], string>);

  async function unpair() {
    if (!(await confirmDialog(t("settings.unpairAsk"), t("settings.unpair"), t("file.cancel"), true))) return;
    live.close();
    void forget();
  }
</script>

<div class="screen">
  <TopBar title={titles[page.id]} onback={page.id === "main" ? undefined : () => back()} />
  <div class="body">
    {#if page.id === "main"}
      <h2 class="group-title">{t("settings.ai")}</h2>
      <div class="group">
        <button class="lrow" onclick={() => (page = { id: "providers" })}>
          <Icon path={iKey} size={22} />
          <span class="ltxt"><span class="body-l">{t("prov.title")}</span><span class="lsub body-s">{t("prov.sub")}</span></span>
          <span class="lend"><Icon path={iChevron} size={20} /></span>
        </button>
        <button class="lrow" onclick={() => (page = { id: "default" })} disabled={!cwd}>
          <Icon path={iModel} size={22} />
          <span class="ltxt"><span class="body-l">{t("def.title")}</span><span class="lsub body-s">{cwd ? t("def.sub") : t("def.needProject")}</span></span>
          <span class="lend"><Icon path={iChevron} size={20} /></span>
        </button>
      </div>

      <h2 class="group-title">{t("settings.connection")}</h2>
      <div class="group">
        <button class="lrow" onclick={() => (page = { id: "server" })}>
          <Icon path={iServer} size={22} />
          <span class="ltxt"><span class="body-l">{conn.current?.name}</span><span class="lsub body-s">{conn.current?.url}</span></span>
          <span class="lend"><Icon path={iChevron} size={20} /></span>
        </button>
      </div>

      <h2 class="group-title">{t("settings.appearance")}</h2>
      <div class="group pad">
        <p class="label body-m"><Icon path={iPalette} size={20} />{t("settings.theme")}</p>
        <div class="seg" role="radiogroup" aria-label={t("settings.theme")}>
          {#each themes as th (th)}
            <button role="radio" aria-checked={theme.pref === th} class:on={theme.pref === th} onclick={() => setTheme(th)} class="label-l">{t(`settings.theme.${th}`)}</button>
          {/each}
        </div>
        <p class="label body-m"><Icon path={iLanguage} size={20} />{t("settings.language")}</p>
        <div class="seg" role="radiogroup" aria-label={t("settings.language")}>
          {#each locales as l (l.id)}
            <button role="radio" aria-checked={i18n.locale === l.id} class:on={i18n.locale === l.id} onclick={() => setLocale(l.id)} class="label-l">{l.label}</button>
          {/each}
        </div>
      </div>
    {:else if page.id === "providers"}
      <Providers onedit={(name, cfg) => (page = { id: "custom", name, cfg })} />
    {:else if page.id === "custom"}
      <CustomProvider name={page.name} cfg={page.cfg} ondone={() => (page = { id: "providers" })} />
    {:else if page.id === "default"}
      <DefaultModel {cwd} />
    {:else if page.id === "server"}
      <div class="group pad">
        <p class="body-l">{t("settings.connectedTo", { name: conn.current?.name ?? "" })}</p>
        <p class="body-s mono">{conn.current?.url}</p>
      </div>
      <button class="btn btn-outlined danger" onclick={unpair}>{t("settings.unpair")}</button>
    {/if}
  </div>
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; }
  .body { flex: 1; overflow-y: auto; padding: 0 16px calc(var(--safe-bottom) + 32px); max-width: 640px; width: 100%; margin: 0 auto; }
  .group-title:first-child { margin-top: 8px; }
  .lrow:disabled { opacity: 0.5; cursor: default; }
  .pad { padding: 4px 16px 16px; display: grid; gap: 8px; }
  .pad p { margin: 0; }
  .label { display: flex; align-items: center; gap: 10px; padding-top: 12px; color: var(--md-on-surface); }
  .label :global(svg) { color: var(--md-on-surface-variant); }
  .mono { font-family: var(--font-mono); color: var(--md-on-surface-variant); word-break: break-all; }
  .danger { color: var(--md-error); min-height: 48px; width: 100%; margin-top: 16px; }
  .seg { display: flex; flex-wrap: wrap; border-radius: 22px; box-shadow: inset 0 0 0 1px var(--md-outline-variant); overflow: hidden; }
  .seg button { flex: 1 1 auto; min-height: 44px; padding: 0 12px; border: 0; background: none; cursor: pointer; color: var(--md-on-surface); }
  .seg button + button { box-shadow: -1px 0 0 var(--md-outline-variant); }
  .seg .on { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
</style>

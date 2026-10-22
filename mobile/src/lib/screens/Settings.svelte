<script lang="ts">
  import TopBar from "../components/TopBar.svelte";
  import { t, i18n, setLocale, type Locale } from "../i18n.svelte";
  import { theme, setTheme, type ThemePref } from "../theme.svelte";
  import { conn, forget } from "../store/connection.svelte";
  import { live } from "../store/session.svelte";

  const themes: ThemePref[] = ["system", "light", "dark"];
  const locales: { id: Locale; label: string }[] = [{ id: "id", label: "Bahasa Indonesia" }, { id: "en", label: "English" }];
</script>

<div class="screen">
  <TopBar title={t("settings.title")} />
  <div class="body">
    <section>
      <h2 class="title-s">{t("settings.server")}</h2>
      <div class="card">
        <p class="body-l">{t("settings.connectedTo", { name: conn.current?.name ?? "" })}</p>
        <p class="body-s mono">{conn.current?.url}</p>
        <button class="btn btn-outlined danger" onclick={() => { live.close(); void forget(); }}>{t("settings.unpair")}</button>
      </div>
    </section>
    <section>
      <h2 class="title-s">{t("settings.language")}</h2>
      <div class="seg" role="radiogroup" aria-label={t("settings.language")}>
        {#each locales as l (l.id)}
          <button role="radio" aria-checked={i18n.locale === l.id} class:on={i18n.locale === l.id} onclick={() => setLocale(l.id)} class="label-l">{l.label}</button>
        {/each}
      </div>
    </section>
    <section>
      <h2 class="title-s">{t("settings.theme")}</h2>
      <div class="seg" role="radiogroup" aria-label={t("settings.theme")}>
        {#each themes as th (th)}
          <button role="radio" aria-checked={theme.pref === th} class:on={theme.pref === th} onclick={() => setTheme(th)} class="label-l">{t(`settings.theme.${th}`)}</button>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; }
  .body { flex: 1; overflow-y: auto; padding: 0 16px 32px; max-width: 640px; width: 100%; margin: 0 auto; }
  section { margin-top: 24px; }
  h2 { margin: 0 0 12px; color: var(--md-primary); }
  .card { background: var(--md-surface-container); border-radius: var(--radius-l); padding: 16px; display: grid; gap: 4px; justify-items: start; }
  .card p { margin: 0; }
  .mono { font-family: var(--font-mono); color: var(--md-on-surface-variant); margin-bottom: 12px !important; word-break: break-all; }
  .danger { color: var(--md-error); box-shadow: inset 0 0 0 1px var(--md-outline); min-height: 48px; }
  .seg { display: flex; flex-wrap: wrap; border-radius: 20px; box-shadow: inset 0 0 0 1px var(--md-outline); overflow: hidden; }
  .seg button { flex: 1 1 auto; min-height: 48px; padding: 0 16px; border: 0; background: none; cursor: pointer; color: var(--md-on-surface); }
  .seg button + button { box-shadow: -1px 0 0 var(--md-outline); }
  .seg .on { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
</style>

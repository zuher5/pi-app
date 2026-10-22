<script lang="ts">
  /** Side drawer: sessions by project (the app's index), then the tools. Chat stays home. */
  import Icon from "./Icon.svelte";
  import Rosette from "./Rosette.svelte";
  import { iSearch, iClose, iBranch, iEditNew, iFiles, iTerminal, iSettings } from "../icons";
  import { t } from "../i18n.svelte";
  import { api, ApiError, type ListedSession } from "../api";
  import { projectAccent } from "../theme.svelte";
  import { relTime, basename, parseTime } from "../time";
  import { live } from "../store/session.svelte";
  import { picked } from "../store/project.svelte";
  import { conn } from "../store/connection.svelte";
  import { nav, onBack, type Tab } from "../nav.svelte";

  let sessions = $state<ListedSession[]>([]);
  let running = $state<Set<string>>(new Set());
  let loading = $state(true);
  let error = $state<string | null>(null);
  let query = $state("");

  async function load() {
    error = null;
    try {
      const [list, run] = await Promise.all([api.sessions(), api.running().catch(() => ({ runningSessionIds: [] }))]);
      sessions = list.sessions.filter((s) => !s.relation || s.relation.kind !== "subagent");
      running = new Set(run.runningSessionIds);
    } catch (e) {
      error = e instanceof ApiError && e.status === 0 ? t("err.network") : t("sessions.loadError");
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void api.running().then((r) => (running = new Set(r.runningSessionIds))).catch(() => {});
    }, 5000);
    const off = onBack(() => { nav.drawer = false; return true; });
    return () => { clearInterval(timer); off(); };
  });

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? sessions.filter((s) => `${s.name ?? ""} ${s.firstMessage} ${s.cwd}`.toLowerCase().includes(q)) : sessions;
    const map = new Map<string, { key: string; root: string; branch?: string; items: ListedSession[]; latest: number }>();
    for (const s of filtered) {
      const key = s.projectKey ?? s.projectRoot ?? s.cwd;
      const g = map.get(key) ?? { key, root: s.projectRoot ?? s.cwd, branch: s.branch, items: [], latest: 0 };
      g.items.push(s);
      g.latest = Math.max(g.latest, parseTime(s.modified) || 0);
      map.set(key, g);
    }
    for (const g of map.values()) g.items.sort((a, b) => (parseTime(b.modified) || 0) - (parseTime(a.modified) || 0));
    return [...map.values()].sort((a, b) => b.latest - a.latest);
  });

  function title(s: ListedSession): string {
    const raw = s.name || (s.firstMessage === "(no messages)" ? "" : s.firstMessage);
    return raw?.split("\n")[0] || t("new.title");
  }
  function open(s: ListedSession) {
    nav.drawer = false;
    nav.tab = "chat";
    void live.open(s.id);
  }
  function fresh(root?: string) {
    nav.drawer = false;
    nav.tab = "chat";
    if (root) picked.cwd = root;
    live.close();
  }
  function go(tab: Tab) {
    nav.drawer = false;
    nav.tab = tab;
  }
</script>

<div class="scrim" onclick={() => (nav.drawer = false)} role="presentation"></div>
<aside class="drawer" aria-label={t("nav.sessions")}>
  <header>
    <span class="brand title-m">Pi-App</span>
    <button class="icon-btn" aria-label={t("sessions.new")} onclick={() => fresh()}><Icon path={iEditNew} /></button>
  </header>
  <label class="search">
    <Icon path={iSearch} size={18} />
    <input class="body-m" bind:value={query} placeholder={t("sessions.search")} />
    {#if query}<button class="clear" aria-label="Clear" onclick={() => (query = "")}><Icon path={iClose} size={16} /></button>{/if}
  </label>

  <div class="list">
    {#if loading && sessions.length === 0}
      <div class="center"><Rosette state="connecting" size={32} /></div>
    {:else if error}
      <div class="center body-m">{error}<button class="btn btn-tonal" onclick={() => { loading = true; void load(); }}>{t("sessions.retry")}</button></div>
    {:else if groups.length === 0}
      <p class="empty body-m">{query ? t("sessions.noMatch") : t("sessions.emptyLead")}</p>
    {:else}
      {#each groups as g (g.key)}
        <section style:--accent={projectAccent(g.key)}>
          <h2 class="proj label-l">
            <span class="sw" aria-hidden="true"></span>
            <span class="pname">{basename(g.root)}</span>
            {#if g.branch}<span class="branch body-s"><Icon path={iBranch} size={13} />{g.branch}</span>{/if}
            <button class="add" aria-label={t("sessions.newIn", { project: basename(g.root) })} onclick={() => fresh(g.root)}><Icon path={iEditNew} size={16} /></button>
          </h2>
          <ul>
            {#each g.items as s (s.id)}
              <li>
                <button class="row" class:current={live.id === s.id} onclick={() => open(s)}>
                  <span class="rt body-m">{title(s)}</span>
                  {#if running.has(s.id)}<Rosette state="streaming" size={14} />{:else}<span class="when body-s">{relTime(s.modified)}</span>{/if}
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
  </div>

  <nav class="tools">
    <button class="tool body-m" class:on={nav.tab === "files"} onclick={() => go("files")}><Icon path={iFiles} size={20} />{t("nav.files")}</button>
    <button class="tool body-m" class:on={nav.tab === "terminal"} onclick={() => go("terminal")}><Icon path={iTerminal} size={20} />{t("nav.terminal")}</button>
    <button class="tool body-m" class:on={nav.tab === "settings"} onclick={() => go("settings")}><Icon path={iSettings} size={20} />{t("nav.settings")}</button>
    {#if conn.current}<p class="server body-s"><span class="dot"></span>{conn.current.name || conn.current.url}</p>{/if}
  </nav>
</aside>

<style>
  .scrim { position: fixed; inset: 0; background: var(--md-scrim); z-index: 30; animation: fade var(--dur-med) var(--ease-emph); }
  .drawer {
    position: fixed; top: 0; bottom: 0; left: 0; z-index: 31; width: min(86vw, 340px);
    background: var(--md-surface-container-low); display: flex; flex-direction: column;
    padding: calc(var(--safe-top) + 8px) 0 calc(var(--safe-bottom) + 8px);
    border-radius: 0 var(--radius-l) var(--radius-l) 0; animation: slide var(--dur-med) var(--ease-decel);
  }
  header { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 0 20px; min-height: 56px; }
  .brand { letter-spacing: -0.01em; }
  .search {
    display: flex; align-items: center; gap: 8px; margin: 4px 12px 8px; padding: 0 8px 0 12px; height: 40px;
    border-radius: var(--radius-m); background: var(--md-surface-container-high); color: var(--md-on-surface-variant);
  }
  .search input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: var(--md-on-surface); height: 100%; }
  .clear { border: 0; background: none; color: inherit; display: grid; place-items: center; width: 28px; height: 28px; cursor: pointer; }
  .list { flex: 1; overflow-y: auto; padding: 0 8px 12px; overscroll-behavior: contain; }
  .center { display: grid; justify-items: center; gap: 12px; padding: 40px 16px; text-align: center; color: var(--md-on-surface-variant); }
  .empty { margin: 0; padding: 32px 16px; color: var(--md-on-surface-variant); text-align: center; }
  .proj { display: flex; align-items: center; gap: 8px; margin: 0; padding: 16px 4px 4px 12px; color: var(--md-on-surface); }
  .sw { width: 8px; height: 8px; border-radius: 2px; background: var(--accent); flex: none; }
  .pname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .branch { display: inline-flex; align-items: center; gap: 2px; color: var(--md-on-surface-variant); font-family: var(--font-mono); font-size: 0.6875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .add { margin-left: auto; width: 36px; height: 36px; border: 0; background: none; border-radius: 50%; display: grid; place-items: center; color: var(--md-on-surface-variant); cursor: pointer; flex: none; }
  ul { list-style: none; margin: 0; padding: 0; }
  .row {
    width: 100%; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; border: 0; background: none;
    border-radius: var(--radius-m); cursor: pointer; text-align: left; color: var(--md-on-surface-variant);
  }
  .row:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .row.current { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
  .rt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row.current .rt { color: var(--md-on-surface); }
  .when { flex: none; color: var(--md-on-surface-variant); opacity: 0.8; }
  .tools { border-top: 1px solid var(--md-outline-variant); padding: 8px 8px 0; display: grid; }
  .tool { display: flex; align-items: center; gap: 14px; min-height: 44px; padding: 0 12px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; color: var(--md-on-surface); text-align: left; }
  .tool :global(svg) { color: var(--md-on-surface-variant); }
  .tool:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .tool.on { background: var(--md-secondary-container); }
  .server { display: flex; align-items: center; gap: 8px; margin: 6px 12px 0; color: var(--md-on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--md-success); flex: none; }
  @keyframes slide { from { transform: translateX(-100%); } }
  @keyframes fade { from { opacity: 0; } }
</style>

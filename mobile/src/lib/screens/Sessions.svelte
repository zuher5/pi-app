<script lang="ts">
  import TopBar from "../components/TopBar.svelte";
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import { iPlus, iSearch, iRefresh, iClose, iBranch } from "../icons";
  import { t } from "../i18n.svelte";
  import { api, ApiError, type ListedSession } from "../api";
  import { projectAccent, serial } from "../theme.svelte";
  import { relTime, basename, parseTime } from "../time";
  import { live } from "../store/session.svelte";
  import { nav } from "../nav.svelte";

  let sessions = $state<ListedSession[]>([]);
  let running = $state<Set<string>>(new Set());
  let loading = $state(true);
  let error = $state<string | null>(null);
  let query = $state("");
  let searching = $state(false);

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
    return () => clearInterval(timer);
  });

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter((s) => `${s.name ?? ""} ${s.firstMessage} ${s.cwd}`.toLowerCase().includes(q))
      : sessions;
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

  function open(s: ListedSession) {
    void live.open(s.id);
    nav.tab = "chat";
  }

  function title(s: ListedSession): string {
    const raw = s.name || (s.firstMessage === "(no messages)" ? "" : s.firstMessage);
    return raw?.split("\n")[0] || t("new.title");
  }
</script>

<div class="screen">
  {#if searching}
    <header class="search">
      <Icon path={iSearch} />
      <!-- svelte-ignore a11y_autofocus -->
      <input class="body-l" bind:value={query} placeholder={t("sessions.search")} autofocus />
      <button class="icon-btn" aria-label="Close search" onclick={() => { searching = false; query = ""; }}><Icon path={iClose} /></button>
    </header>
  {:else}
    <TopBar title={t("sessions.title")}>
      {#snippet actions()}
        <button class="icon-btn" aria-label={t("sessions.search")} onclick={() => (searching = true)}><Icon path={iSearch} /></button>
        <button class="icon-btn" aria-label="Refresh" onclick={() => { loading = true; void load(); }}><Icon path={iRefresh} /></button>
      {/snippet}
    </TopBar>
  {/if}

  <div class="list">
    {#if loading && sessions.length === 0}
      <div class="center"><Rosette state="connecting" size={40} /></div>
    {:else if error}
      <div class="center">
        <p class="body-l">{error}</p>
        <button class="btn btn-tonal" onclick={() => { loading = true; void load(); }}>{t("sessions.retry")}</button>
      </div>
    {:else if groups.length === 0}
      <div class="empty">
        <Rosette faint size={160} />
        <h2 class="title-l">{t("sessions.empty")}</h2>
        <p class="body-m">{t("sessions.emptyLead")}</p>
      </div>
    {:else}
      {#each groups as g (g.key)}
        <section>
          <h2 class="project title-s" style:--accent={projectAccent(g.key)}>
            <span class="swatch" aria-hidden="true"></span>
            <span class="pname">{basename(g.root)}</span>
            {#if g.branch}<span class="branch label-m"><Icon path={iBranch} size={14} />{g.branch}</span>{/if}
          </h2>
          <ul>
            {#each g.items as s (s.id)}
              <li>
                <button class="row" class:current={live.id === s.id} onclick={() => open(s)}>
                  <span class="body-l rtitle">{title(s)}</span>
                  <span class="meta body-s">
                    {#if running.has(s.id)}<span class="live"><Rosette state="streaming" size={14} />{t("sessions.running")}</span>{/if}
                    <span>{relTime(s.modified)}</span>
                    <span aria-hidden="true">·</span>
                    <span class="tabular">{t("sessions.messages", { n: s.messageCount })}</span>
                    <span class="serial sid">{serial(s.id)}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
  </div>

  <button class="fab" onclick={() => (nav.sheet = "new")}><Icon path={iPlus} /><span class="label-l">{t("sessions.new")}</span></button>
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; position: relative; }
  .search { display: flex; align-items: center; gap: 8px; padding: calc(var(--safe-top) + 8px) 4px 8px 16px; min-height: 64px; color: var(--md-on-surface-variant); }
  .search input { flex: 1; border: 0; background: none; color: var(--md-on-surface); outline: none; min-height: 48px; }
  .list { flex: 1; overflow-y: auto; padding-bottom: 104px; }
  .center { display: grid; place-items: center; gap: 16px; padding: 64px 24px; text-align: center; }
  .empty { display: grid; justify-items: center; gap: 8px; padding: 48px 32px; text-align: center; }
  .empty h2 { margin: 16px 0 0; } .empty p { margin: 0; color: var(--md-on-surface-variant); max-width: 34ch; }
  section + section { margin-top: 8px; }
  .project { display: flex; align-items: center; gap: 10px; margin: 0; padding: 20px 16px 8px; color: var(--md-on-surface); }
  .swatch { width: 10px; height: 10px; border-radius: 3px; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent); }
  .pname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .branch { display: inline-flex; align-items: center; gap: 2px; color: var(--md-on-surface-variant); margin-left: auto; }
  ul { list-style: none; margin: 0; padding: 0; }
  .row {
    width: 100%; text-align: left; border: 0; background: none; cursor: pointer; padding: 12px 16px; min-height: 72px;
    display: grid; gap: 4px; position: relative;
  }
  .row::before { content: ""; position: absolute; inset: 0; background: var(--md-on-surface); opacity: 0; transition: opacity var(--dur-short); }
  .row:hover::before { opacity: 0.06; } .row:active::before { opacity: 0.1; }
  .row.current { background: var(--md-secondary-container); }
  .rtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { display: flex; align-items: center; gap: 6px; color: var(--md-on-surface-variant); }
  .sid { margin-left: auto; font-size: 0.6875rem; opacity: 0.8; }
  .live { display: inline-flex; align-items: center; gap: 4px; color: var(--md-primary); font-weight: 500; }
  .fab {
    position: absolute; right: 16px; bottom: 16px; height: 56px; padding: 0 20px 0 16px; border: 0; cursor: pointer;
    border-radius: var(--radius-l); background: var(--md-primary-container); color: var(--md-on-primary-container);
    display: inline-flex; align-items: center; gap: 12px; box-shadow: var(--md-shadow);
  }
</style>

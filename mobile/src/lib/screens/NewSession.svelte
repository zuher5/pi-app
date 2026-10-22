<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { iFolderPlus, iFiles } from "../icons";
  import { t } from "../i18n.svelte";
  import { api } from "../api";
  import { live } from "../store/session.svelte";
  import { nav } from "../nav.svelte";
  import { projectAccent } from "../theme.svelte";
  import { basename } from "../time";

  let cwd = $state("");
  let recent = $state<string[]>([]);
  let busy = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    void api.sessions().then(({ sessions }) => {
      const seen = new Set<string>();
      for (const s of sessions) seen.add(s.projectRoot ?? s.cwd);
      recent = [...seen].slice(0, 8);
      if (!cwd && recent[0]) cwd = recent[0];
    }).catch(() => {});
  });

  async function start(dir = cwd) {
    if (!dir.trim()) return;
    busy = true; error = null;
    try {
      const { sessionId } = await api.newSession(dir.trim());
      nav.sheet = null;
      nav.tab = "chat";
      await live.open(sessionId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="scrim" onclick={() => (nav.sheet = null)} role="presentation"></div>
<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="new-title">
  <div class="handle" aria-hidden="true"></div>
  <h2 id="new-title" class="headline-s">{t("new.title")}</h2>
  {#if recent.length}
    <h3 class="title-s">{t("new.recent")}</h3>
    <ul>
      {#each recent as dir (dir)}
        <li>
          <button class="proj" onclick={() => void start(dir)} disabled={busy} style:--accent={projectAccent(dir)}>
            <span class="swatch"><Icon path={iFiles} size={20} /></span>
            <span class="txt"><span class="body-l">{basename(dir)}</span><span class="body-s path">{dir}</span></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <form onsubmit={(e) => { e.preventDefault(); void start(); }}>
    <div class="field">
      <label class="body-s" for="cwd">{t("new.folder")}</label>
      <input id="cwd" bind:value={cwd} autocapitalize="off" spellcheck="false" placeholder="/home/you/project" />
      <span class="hint body-s">{t("new.folderHint")}</span>
    </div>
    {#if error}<p class="err body-m" role="alert">{error}</p>{/if}
    <button class="btn btn-filled go" disabled={busy || !cwd.trim()}><Icon path={iFolderPlus} size={18} />{t("new.start")}</button>
  </form>
</div>

<style>
  .scrim { position: fixed; inset: 0; background: var(--md-scrim); z-index: 20; animation: fade var(--dur-med) var(--ease-emph); }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; max-height: 88%; overflow-y: auto;
    background: var(--md-surface-container-low); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    padding: 8px 24px calc(var(--safe-bottom) + 24px); max-width: 640px; margin: 0 auto;
    animation: rise var(--dur-med) var(--ease-decel);
  }
  .handle { width: 32px; height: 4px; border-radius: 2px; background: var(--md-outline); opacity: 0.4; margin: 14px auto 18px; }
  h2 { margin: 0 0 16px; }
  h3 { margin: 8px 0; color: var(--md-on-surface-variant); }
  ul { list-style: none; margin: 0 -12px 16px; padding: 0; }
  .proj { width: 100%; display: flex; align-items: center; gap: 16px; padding: 8px 12px; min-height: 64px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; }
  .proj:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .swatch { width: 40px; height: 40px; border-radius: var(--radius-m); display: grid; place-items: center; background: color-mix(in oklab, var(--accent) 20%, var(--md-surface)); color: var(--accent); flex: none; }
  .txt { display: grid; min-width: 0; }
  .path { color: var(--md-on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 0.75rem; }
  form { display: grid; gap: 16px; }
  .go { min-height: 48px; }
  .err { margin: 0; color: var(--md-error); word-break: break-word; }
  @keyframes rise { from { transform: translateY(100%); } }
  @keyframes fade { from { opacity: 0; } }
</style>

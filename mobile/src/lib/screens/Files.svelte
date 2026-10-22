<script lang="ts">
  import TopBar from "../components/TopBar.svelte";
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import GitBadge from "../components/GitBadge.svelte";
  import FileView from "./FileView.svelte";
  import ProjectPicker from "../components/ProjectPicker.svelte";
  import { activeCwd } from "../store/project.svelte";
  import { iFolder, iFile, iUpload, iEye, iEyeOff, iRefresh, iImage } from "../icons";
  import { t } from "../i18n.svelte";
  import { files, ApiError } from "../api";
  import { fileState, setRoot, refreshGit, gitFor, dirChanged, join, parent } from "../store/files.svelte";
  import { onBack, toast, confirmDialog } from "../nav.svelte";
  import { basename } from "../time";

  let loading = $state(false);
  let error = $state<string | null>(null);
  let picker = $state<HTMLInputElement>();

  $effect(() => {
    const root = activeCwd();
    if (root) setRoot(root);
  });

  async function load() {
    if (!fileState.dir) return;
    loading = true; error = null;
    try {
      const res = await files.list(fileState.dir, fileState.hidden);
      fileState.entries = res.entries;
    } catch (e) {
      error = e instanceof ApiError && e.status === 0 ? t("err.network") : t("err.generic", { msg: e instanceof Error ? e.message : String(e) });
    } finally {
      loading = false;
    }
  }

  $effect(() => { void fileState.dir; void fileState.hidden; void load(); });
  $effect(() => { void fileState.root; void refreshGit(); });

  // Back walks up the tree before leaving the tab.
  $effect(() => onBack(() => {
    if (fileState.openPath || !fileState.dir || !fileState.root || fileState.dir === fileState.root || fileState.mode !== "browse") return false;
    fileState.dir = parent(fileState.dir);
    return true;
  }));

  const crumbs = $derived.by(() => {
    if (!fileState.root || !fileState.dir) return [];
    const rel = fileState.dir.slice(fileState.root.length).split("/").filter(Boolean);
    const out = [{ name: basename(fileState.root), path: fileState.root }];
    let acc = fileState.root;
    for (const part of rel) { acc = join(acc, part); out.push({ name: part, path: acc }); }
    return out;
  });

  const isImage = (n: string) => /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(n);

  async function upload(list: FileList | null) {
    if (!list?.length || !fileState.dir) return;
    const arr = [...list];
    try {
      let res = await files.upload(fileState.dir, arr, "error");
      if (res.conflicts?.length) {
        const replace = await confirmDialog(t("files.conflict", { names: res.conflicts.join(", ") }), t("files.replace"), t("files.skip"));
        res = await files.upload(fileState.dir, arr, replace ? "overwrite" : "skip");
      }
      toast(t("files.uploaded", { n: res.uploaded.length }));
      if (res.errors.length) toast(res.errors.map((e) => `${e.name}: ${e.error}`).join("; "));
      void load(); void refreshGit();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      if (picker) picker.value = "";
    }
  }
</script>

{#if fileState.openPath}
  <FileView path={fileState.openPath} onclose={() => { fileState.openPath = null; void refreshGit(); }} />
{:else}
<div class="screen">
  <TopBar title={t("nav.files")} subtitle={fileState.root ?? undefined}>
    {#snippet actions()}
      {#if fileState.root}
        <button class="icon-btn" aria-label={t("files.hidden")} aria-pressed={fileState.hidden} onclick={() => (fileState.hidden = !fileState.hidden)}>
          <Icon path={fileState.hidden ? iEye : iEyeOff} />
        </button>
        <button class="icon-btn" aria-label="Refresh" onclick={() => { void load(); void refreshGit(); }}><Icon path={iRefresh} /></button>
      {/if}
    {/snippet}
  </TopBar>

  {#if !fileState.root}
    <ProjectPicker lead={t("files.noProject")} />
  {:else}
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={fileState.mode === "browse"} class:on={fileState.mode === "browse"} class="label-l" onclick={() => (fileState.mode = "browse")}>{t("files.browse")}</button>
      <button role="tab" aria-selected={fileState.mode === "changes"} class:on={fileState.mode === "changes"} class="label-l" onclick={() => { fileState.mode = "changes"; void refreshGit(); }}>
        {t("files.changes")}
        {#if fileState.git?.files.length}<span class="count serial">{fileState.git.files.length}</span>{/if}
      </button>
    </div>

    {#if fileState.mode === "browse"}
      <nav class="crumbs label-l" aria-label="Path">
        {#each crumbs as c, i (c.path)}
          {#if i > 0}<span class="sep" aria-hidden="true">/</span>{/if}
          <button class:cur={i === crumbs.length - 1} onclick={() => (fileState.dir = c.path)}>{c.name}</button>
        {/each}
      </nav>
      <div class="list">
        {#if loading && fileState.entries.length === 0}
          <div class="center"><Rosette state="connecting" size={36} /></div>
        {:else if error}
          <div class="center"><p class="body-m">{error}</p><button class="btn btn-tonal" onclick={load}>{t("sessions.retry")}</button></div>
        {:else if fileState.entries.length === 0}
          <p class="center body-m muted">{t("files.empty")}</p>
        {:else}
          <ul>
            {#each fileState.entries as e (e.name)}
              {@const full = join(fileState.dir!, e.name)}
              {@const g = e.isDir ? undefined : gitFor(full)}
              <li>
                <button class="row" class:dim={!!e.hidden} onclick={() => (e.isDir ? (fileState.dir = full) : (fileState.openPath = full))}>
                  <span class="ic" class:dir={e.isDir}><Icon path={e.isDir ? iFolder : isImage(e.name) ? iImage : iFile} size={22} /></span>
                  <span class="name body-l">{e.name}</span>
                  {#if g}<GitBadge code={g.code} />{:else if e.isDir && dirChanged(full)}<span class="dot" aria-label="changed"></span>{/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else}
      <div class="list">
        {#if !fileState.git}
          <div class="center"><Rosette state="connecting" size={36} /></div>
        {:else if !fileState.git.isGitRepository}
          <p class="center body-m muted">{t("files.notGit")}</p>
        {:else if fileState.git.files.length === 0}
          <p class="center body-m muted">{t("files.clean")}</p>
        {:else}
          <p class="totals body-m tabular"><span class="add">+{fileState.git.additions}</span> <span class="del">−{fileState.git.deletions}</span></p>
          <ul>
            {#each fileState.git.files as f (f.filePath)}
              <li>
                <button class="row" onclick={() => (fileState.openPath = f.filePath)}>
                  <GitBadge code={f.code} />
                  <span class="cname"><span class="body-l">{basename(f.filePath)}</span><span class="body-s muted path">{f.filePath.slice((fileState.git.repositoryRoot ?? "").length + 1)}</span></span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    {#if fileState.mode === "browse"}
      <input bind:this={picker} type="file" multiple hidden onchange={(e) => upload((e.currentTarget as HTMLInputElement).files)} />
      <button class="fab" onclick={() => picker?.click()}><Icon path={iUpload} /><span class="label-l">{t("files.upload")}</span></button>
    {/if}
  {/if}
</div>
{/if}

<style>
  .screen { height: 100%; display: flex; flex-direction: column; position: relative; }
  .center { display: grid; place-items: center; gap: 12px; padding: 56px 24px; text-align: center; margin: 0; }
  .muted { color: var(--md-on-surface-variant); }
  .tabs { display: flex; box-shadow: inset 0 -1px var(--md-outline-variant); flex: none; }
  .tabs button { flex: 1; min-height: 48px; border: 0; background: none; cursor: pointer; color: var(--md-on-surface-variant); display: inline-flex; align-items: center; justify-content: center; gap: 8px; position: relative; }
  .tabs .on { color: var(--md-primary); }
  .tabs .on::after { content: ""; position: absolute; left: 16px; right: 16px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--md-primary); }
  .count { font-size: 0.6875rem; padding: 0 6px; border-radius: 8px; background: var(--md-primary); color: var(--md-on-primary); letter-spacing: 0; line-height: 16px; }
  .crumbs { display: flex; align-items: center; gap: 2px; padding: 4px 8px; overflow-x: auto; white-space: nowrap; flex: none; scrollbar-width: none; }
  .crumbs button { border: 0; background: none; min-height: 40px; padding: 0 8px; border-radius: 8px; cursor: pointer; color: var(--md-on-surface-variant); }
  .crumbs .cur { color: var(--md-on-surface); }
  .sep { color: var(--md-outline); }
  .list { flex: 1; overflow-y: auto; padding-bottom: 104px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .row { width: 100%; display: flex; align-items: center; gap: 16px; min-height: 56px; padding: 4px 16px; border: 0; background: none; cursor: pointer; text-align: left; }
  .row:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .dim { opacity: 0.55; }
  .ic { color: var(--md-on-surface-variant); display: grid; } .ic.dir { color: var(--md-primary); }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ctp-yellow); }
  .cname { display: grid; min-width: 0; }
  .path { font-family: var(--font-mono); font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .totals { margin: 0; padding: 12px 16px 4px; font-family: var(--font-mono); }
  .add { color: var(--ctp-green); } .del { color: var(--ctp-red); }
  .fab {
    position: absolute; right: 16px; bottom: 16px; height: 56px; padding: 0 20px 0 16px; border: 0; cursor: pointer;
    border-radius: var(--radius-l); background: var(--md-primary-container); color: var(--md-on-primary-container);
    display: inline-flex; align-items: center; gap: 12px; box-shadow: var(--md-shadow);
  }
</style>

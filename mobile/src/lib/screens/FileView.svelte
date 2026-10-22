<script lang="ts">
  import TopBar from "../components/TopBar.svelte";
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import GitBadge from "../components/GitBadge.svelte";
  import { iEdit, iDownload, iSave, iClose } from "../icons";
  import { t } from "../i18n.svelte";
  import { files, git, type FileMeta } from "../api";
  import { authedApiUrl } from "../bridge/transport";
  import { fileState, gitFor, refreshGit } from "../store/files.svelte";
  import { onBack, toast, confirmDialog } from "../nav.svelte";
  import { basename } from "../time";

  let { path, onclose }: { path: string; onclose: () => void } = $props();

  let meta = $state<FileMeta | null>(null);
  let text = $state<string | null>(null);
  let truncated = $state(false);
  let loadedMtime = $state("");
  let error = $state<string | null>(null);
  let tab = $state<"view" | "diff">("view");
  let patch = $state<string | null>(null);
  let editing = $state(false);
  let draft = $state("");
  let saving = $state(false);

  const status = $derived(gitFor(path));
  const kind = $derived(!meta ? "loading" : meta.mime.startsWith("image/") ? "image" : meta.mime === "text/plain" ? "text" : "binary");
  const dirty = $derived(editing && draft !== text);

  async function load() {
    error = null;
    try {
      meta = await files.meta(path);
      loadedMtime = meta.mtime;
      if (meta.mime === "text/plain") {
        const chunk = await files.readText(path);
        text = chunk.content;
        truncated = chunk.truncated;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  $effect(() => { void path; tab = status ? "diff" : "view"; void load(); });
  $effect(() => {
    if (tab !== "diff" || !fileState.root) return;
    patch = null;
    void git.diff(fileState.root, path).then((d) => (patch = d.patch ?? "")).catch(() => (patch = ""));
  });

  async function leave() {
    if (dirty && !(await confirmDialog(t("file.unsaved"), t("file.discard"), t("file.cancel"), true))) return;
    if (editing) { editing = false; return; }
    onclose();
  }
  $effect(() => onBack(() => { void leave(); return true; }));

  async function save() {
    saving = true;
    try {
      const now = await files.meta(path);
      if (now.mtime !== loadedMtime && !(await confirmDialog(t("file.changedOnServer"), t("file.saveAnyway"), t("file.cancel"), true))) return;
      const res = await files.save(path, draft);
      if (res.errors.length) throw new Error(res.errors[0].error);
      text = draft;
      editing = false;
      loadedMtime = (await files.meta(path)).mtime;
      toast(t("file.saved"));
      void refreshGit();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      saving = false;
    }
  }

  const lines = $derived((text ?? "").replace(/\n$/, "").split("\n"));
  const diffLines = $derived((patch ?? "").split("\n").filter((l, i, a) => !(i === a.length - 1 && l === "")).map((l) => ({
    l, k: l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff ") || l.startsWith("index ") ? "meta" : l.startsWith("@@") ? "hunk" : l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : "",
  })));
</script>

<div class="screen">
  <TopBar title={basename(path)} subtitle={path.slice((fileState.root ?? "").length + 1) || path} onback={() => void leave()}>
    {#snippet actions()}
      {#if editing}
        <button class="icon-btn" aria-label={t("file.cancel")} onclick={() => void leave()}><Icon path={iClose} /></button>
        <button class="btn btn-filled" disabled={!dirty || saving} onclick={save}><Icon path={iSave} size={18} />{t("file.save")}</button>
      {:else}
        <a class="icon-btn" href={authedApiUrl(files.url(path, "type=download"))} download={basename(path)} aria-label={t("file.download")}><Icon path={iDownload} /></a>
        {#if kind === "text" && !truncated}
          <button class="icon-btn" aria-label={t("file.edit")} onclick={() => { draft = text ?? ""; editing = true; tab = "view"; }}><Icon path={iEdit} /></button>
        {/if}
      {/if}
    {/snippet}
  </TopBar>

  {#if status && !editing}
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={tab === "view"} class:on={tab === "view"} class="label-l" onclick={() => (tab = "view")}>{t("file.view")}</button>
      <button role="tab" aria-selected={tab === "diff"} class:on={tab === "diff"} class="label-l" onclick={() => (tab = "diff")}><GitBadge code={status.code} />{t("file.diff")}</button>
    </div>
  {/if}

  <div class="body">
    {#if error}
      <p class="center body-m">{error}</p>
    {:else if editing}
      <textarea class="editor" bind:value={draft} spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea>
    {:else if tab === "diff"}
      {#if patch === null}<div class="center"><Rosette state="connecting" size={36} /></div>
      {:else if !patch}<p class="center body-m muted">{t("file.noDiff")}</p>
      {:else}
        <pre class="code diff">{#each diffLines as d, i (i)}<span class="dl {d.k}">{d.l || " "}</span>{/each}</pre>
      {/if}
    {:else if kind === "loading"}
      <div class="center"><Rosette state="connecting" size={36} /></div>
    {:else if kind === "image"}
      <div class="img"><img src={authedApiUrl(files.url(path, "type=read"))} alt={basename(path)} /></div>
    {:else if kind === "binary"}
      <p class="center body-m muted">{t("file.binary")}</p>
    {:else}
      {#if truncated}<p class="warn body-s">{t("file.tooBig")}</p>{/if}
      <pre class="code" style:--gutter={`${String(lines.length).length + 1}ch`}>{#each lines as l, i (i)}<span class="ln"><span class="no" aria-hidden="true">{i + 1}</span>{l || " "}</span>{/each}</pre>
    {/if}
  </div>
</div>

<style>
  .screen { height: 100%; display: flex; flex-direction: column; }
  .tabs { display: flex; box-shadow: inset 0 -1px var(--md-outline-variant); flex: none; }
  .tabs button { flex: 1; min-height: 48px; border: 0; background: none; cursor: pointer; color: var(--md-on-surface-variant); display: inline-flex; align-items: center; justify-content: center; gap: 8px; position: relative; }
  .tabs .on { color: var(--md-primary); }
  .tabs .on::after { content: ""; position: absolute; left: 16px; right: 16px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: var(--md-primary); }
  .body { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
  .center { display: grid; place-items: center; padding: 56px 24px; text-align: center; margin: 0; }
  .muted { color: var(--md-on-surface-variant); }
  .warn { margin: 8px 16px 0; color: var(--md-on-surface-variant); }
  .code { margin: 0; padding: 12px 0 32px; font-size: 0.8125rem; line-height: 1.25rem; white-space: pre; min-width: max-content; counter-reset: ln; }
  .ln { display: block; padding-right: 16px; }
  .no { display: inline-block; width: var(--gutter); margin-right: 12px; padding-left: 8px; text-align: right; color: var(--md-outline); user-select: none; }
  .dl { display: block; padding: 0 16px; }
  .dl.add { background: color-mix(in oklab, var(--ctp-green) 16%, transparent); }
  .dl.del { background: color-mix(in oklab, var(--ctp-red) 16%, transparent); }
  .dl.hunk { color: var(--ctp-sapphire); background: color-mix(in oklab, var(--ctp-sapphire) 8%, transparent); }
  .dl.meta { color: var(--md-on-surface-variant); }
  .editor {
    flex: 1; width: 100%; border: 0; outline: none; resize: none; padding: 12px 16px; background: var(--md-code-bg); color: var(--md-on-surface);
    font: 400 0.8125rem/1.25rem var(--font-mono); tab-size: 2;
  }
  .img { padding: 16px; display: grid; place-items: center; }
  .img img { max-width: 100%; border-radius: var(--radius-m); background: repeating-conic-gradient(var(--md-surface-container) 0 25%, var(--md-surface) 0 50%) 0 0 / 16px 16px; }
  a.icon-btn { color: var(--md-on-surface-variant); }
  .btn-filled { min-height: 40px; padding: 0 16px; margin-left: 4px; }
</style>

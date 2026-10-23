<script lang="ts">
  /** One provider: paste an API key, or sign in with the account (OAuth runs on the server, answered here). */
  import Sheet from "../components/Sheet.svelte";
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import { iKey, iLogin, iOpen, iCopy } from "../icons";
  import { t } from "../i18n.svelte";
  import { providers } from "../api";
  import { toast, confirmDialog } from "../nav.svelte";

  let { provider, onclose, onchanged }: {
    provider: { id: string; name: string; configured: boolean; how: "key" | "oauth" | null; key: boolean; oauth: boolean; models: number };
    onclose: () => void; onchanged: () => void;
  } = $props();
  let key = $state("");
  let busy = $state(false);
  let es: EventSource | null = null;
  type Step =
    | { kind: "idle" } | { kind: "waiting"; note?: string }
    | { kind: "auth"; url: string; instructions: string | null; token: string }
    | { kind: "device"; code: string; uri: string }
    | { kind: "prompt"; message: string; placeholder: string | null; token: string }
    | { kind: "select"; message: string; options: { id: string; label?: string; name?: string }[]; token: string };
  let step = $state<Step>({ kind: "idle" });
  let answer = $state("");

  async function act(fn: () => Promise<unknown>, done: string) {
    busy = true;
    try { await fn(); toast(done); onchanged(); }
    catch (e) { toast(e instanceof Error ? e.message : String(e)); }
    finally { busy = false; }
  }

  function login() {
    es?.close();
    step = { kind: "waiting" };
    const src = new EventSource(providers.loginUrl(provider.id));
    es = src;
    src.onmessage = (ev) => {
      let m: Record<string, unknown>;
      try { m = JSON.parse(ev.data); } catch { return; }
      switch (m.type) {
        case "auth": step = { kind: "auth", url: String(m.url), instructions: (m.instructions as string) ?? null, token: String(m.token) }; break;
        case "device_code": step = { kind: "device", code: String(m.userCode), uri: String(m.verificationUri) }; break;
        case "prompt_request": answer = ""; step = { kind: "prompt", message: String(m.message), placeholder: (m.placeholder as string) ?? null, token: String(m.token) }; break;
        case "select_request": step = { kind: "select", message: String(m.message), options: (m.options as never[]) ?? [], token: String(m.token) }; break;
        case "progress": if (step.kind === "waiting" || step.kind === "idle") step = { kind: "waiting", note: String(m.message ?? "") }; break;
        case "success": src.close(); toast(t("prov.signedIn", { name: provider.name })); onchanged(); break;
        case "error": src.close(); step = { kind: "idle" }; toast(String(m.message)); break;
        case "cancelled": src.close(); step = { kind: "idle" }; break;
      }
    };
    src.onerror = () => { if (step.kind === "waiting") { src.close(); step = { kind: "idle" }; toast(t("err.network")); } };
  }

  async function reply(token: string, code: string) {
    if (!code.trim()) return;
    busy = true;
    try { await providers.answer(provider.id, token, code.trim()); step = { kind: "waiting" }; }
    catch (e) { toast(e instanceof Error ? e.message : String(e)); }
    finally { busy = false; }
  }

  async function remove() {
    if (!(await confirmDialog(t("prov.removeAsk", { name: provider.name }), t("prov.remove"), t("file.cancel"), true))) return;
    await act(() => (provider.how === "oauth" ? providers.logout(provider.id) : providers.removeKey(provider.id)), t("prov.removed"));
  }

  $effect(() => () => es?.close());
</script>

<Sheet title={provider.name} {onclose}>
  <div class="body">
    {#if provider.configured}
      <p class="status body-m"><span class="ok">{provider.how === "oauth" ? t("prov.viaAccount") : t("prov.viaKey")}</span> · {t("prov.models", { n: provider.models })}</p>
      <button class="btn btn-outlined danger" disabled={busy} onclick={remove}>{provider.how === "oauth" ? t("prov.signOut") : t("prov.remove")}</button>
    {/if}

    {#if provider.oauth && step.kind === "idle" && provider.how !== "oauth"}
      <button class="btn btn-filled" disabled={busy} onclick={login}><Icon path={iLogin} size={18} />{t("prov.signIn")}</button>
    {/if}

    {#if step.kind === "waiting"}
      <div class="wait"><Rosette state="connecting" size={24} /><span class="body-m">{step.note || t("prov.waiting")}</span></div>
    {:else if step.kind === "auth"}
      {@const s = step}
      <p class="body-m">{s.instructions ?? t("prov.authLead")}</p>
      <a class="btn btn-filled" href={s.url} target="_blank" rel="noopener"><Icon path={iOpen} size={18} />{t("prov.openLogin")}</a>
      <div class="field">
        <label class="body-s" for="code">{t("prov.pasteLabel")}</label>
        <input id="code" bind:value={answer} autocapitalize="off" spellcheck="false" placeholder="http://localhost:…/callback?code=…" />
        <span class="hint body-s">{t("prov.pasteHint")}</span>
      </div>
      <button class="btn btn-tonal" disabled={busy || !answer.trim()} onclick={() => reply(s.token, answer)}>{t("prov.continue")}</button>
    {:else if step.kind === "device"}
      {@const s = step}
      <p class="body-m">{t("prov.deviceLead")}</p>
      <button class="code serial" onclick={() => void navigator.clipboard?.writeText(s.code).then(() => toast(t("msg.copied")))}>{s.code}<Icon path={iCopy} size={18} /></button>
      <a class="btn btn-filled" href={s.uri} target="_blank" rel="noopener"><Icon path={iOpen} size={18} />{t("prov.openLogin")}</a>
    {:else if step.kind === "prompt"}
      {@const s = step}
      <div class="field">
        <label class="body-s" for="pr">{s.message}</label>
        <input id="pr" bind:value={answer} autocapitalize="off" spellcheck="false" placeholder={s.placeholder ?? ""} />
      </div>
      <button class="btn btn-tonal" disabled={busy || !answer.trim()} onclick={() => reply(s.token, answer)}>{t("prov.continue")}</button>
    {:else if step.kind === "select"}
      {@const s = step}
      <p class="body-m">{s.message}</p>
      {#each s.options as o (o.id)}
        <button class="btn btn-tonal" disabled={busy} onclick={() => reply(s.token, o.id)}>{o.label ?? o.name ?? o.id}</button>
      {/each}
    {/if}

    {#if provider.key && step.kind === "idle"}
      <form class="keyform" onsubmit={(e) => { e.preventDefault(); void act(() => providers.setKey(provider.id, key), t("prov.saved")); }}>
        <div class="field">
          <label class="body-s" for="key">{provider.how === "key" ? t("prov.replaceKey") : t("prov.apiKey")}</label>
          <input id="key" type="password" bind:value={key} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-…" />
          <span class="hint body-s">{t("prov.keyHint")}</span>
        </div>
        <button class="btn {provider.oauth ? 'btn-tonal' : 'btn-filled'}" disabled={busy || !key.trim()}><Icon path={iKey} size={18} />{t("prov.saveKey")}</button>
      </form>
    {/if}
  </div>
</Sheet>

<style>
  .body { display: grid; gap: 12px; padding: 0 12px 8px; }
  .body p { margin: 0; }
  .status { color: var(--md-on-surface-variant); }
  .ok { color: var(--md-success); font-weight: 500; }
  .btn { min-height: 48px; text-decoration: none; }
  .danger { color: var(--md-error); }
  .wait { display: flex; align-items: center; gap: 12px; min-height: 48px; color: var(--md-on-surface-variant); }
  .keyform { display: grid; gap: 12px; margin-top: 8px; }
  .code {
    display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; border: 0; cursor: pointer;
    border-radius: var(--radius-m); background: var(--md-surface-container-high); color: var(--md-on-surface); font-size: 1.25rem;
  }
</style>

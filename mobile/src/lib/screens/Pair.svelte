<script lang="ts">
  import { Capacitor } from "@capacitor/core";
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import Scanner from "../components/Scanner.svelte";
  import { iQr, iPhone } from "../icons";
  import { t } from "../i18n.svelte";
  import { manualPairing, parsePairingLink, PairingError } from "../bridge/pairing";
  import { pairWith } from "../store/connection.svelte";

  let { initialLink = "", onpaired }: { initialLink?: string; onpaired?: () => void } = $props();
  let server = $state("");
  let token = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);
  const native = Capacitor.isNativePlatform();

  async function run(fn: () => ReturnType<typeof parsePairingLink>) {
    error = null;
    busy = true;
    try {
      await pairWith(fn());
      onpaired?.();
    } catch (e) {
      error = e instanceof PairingError ? e.message : t("err.generic", { msg: String(e) });
    } finally {
      busy = false;
    }
  }

  let scanning = $state(false);
  function scanned(raw: string) {
    scanning = false;
    void run(() => parsePairingLink(raw));
  }

  $effect(() => {
    if (initialLink) void run(() => parsePairingLink(initialLink));
  });
</script>

{#if scanning}
  <Scanner onresult={scanned} oncancel={() => (scanning = false)} onerror={(m) => { scanning = false; error = m; }} />
{:else}
<main class="pair">
  <div class="mark"><Rosette size={112} state={busy ? "streaming" : "idle"} /></div>
  <h1 class="headline-s">{t("pair.title")}</h1>
  <p class="body-l lead">{t("pair.lead")}</p>

  {#if native}
    <button class="btn btn-filled wide" onclick={() => { error = null; scanning = true; }} disabled={busy}><Icon path={iQr} size={18} />{t("pair.scan")}</button>
    <div class="or label-m"><span>{t("pair.manual")}</span></div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); void run(() => manualPairing(server, token)); }}>
    <div class="field">
      <label class="body-s" for="srv">{t("pair.server")}</label>
      <input id="srv" bind:value={server} inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="192.168.1.5:30141" />
      <span class="hint body-s">{t("pair.serverHint")}</span>
    </div>
    <button type="button" class="btn btn-text termux" onclick={() => (server = "127.0.0.1:30141")}><Icon path={iPhone} size={18} />{t("pair.termux")}</button>
    <div class="field">
      <label class="body-s" for="tok">{t("pair.token")}</label>
      <input id="tok" bind:value={token} autocapitalize="off" autocomplete="off" spellcheck="false" class="serial-input" />
      <span class="hint body-s">{t("pair.tokenHint")}</span>
    </div>
    {#if error}<p class="err body-m" role="alert">{error}</p>{/if}
    <button class="btn {native ? 'btn-tonal' : 'btn-filled'} wide" disabled={busy || !server || !token}>
      {busy ? t("pair.connecting") : t("pair.connect")}
    </button>
  </form>
</main>
{/if}

<style>
  .pair {
    max-width: 440px; margin: 0 auto; padding: calc(var(--safe-top) + 48px) 24px calc(var(--safe-bottom) + 32px);
    display: flex; flex-direction: column; gap: 16px; min-height: 100%; overflow-y: auto;
  }
  .mark { align-self: flex-start; margin-bottom: 8px; }
  h1 { margin: 0; }
  .lead { margin: 0 0 8px; color: var(--md-on-surface-variant); }
  form { display: flex; flex-direction: column; gap: 16px; }
  .wide { width: 100%; min-height: 48px; }
  .termux { align-self: flex-start; margin-top: -8px; min-height: 48px; }
  .serial-input { font-family: var(--font-mono) !important; letter-spacing: 0.04em; }
  .err { margin: 0; color: var(--md-error); }
  .or { display: flex; align-items: center; gap: 12px; color: var(--md-on-surface-variant); margin: 8px 0; }
  .or::before, .or::after { content: ""; flex: 1; height: 1px; background: var(--md-outline-variant); }
</style>

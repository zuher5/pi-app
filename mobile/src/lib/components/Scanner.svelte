<script lang="ts">
  /**
   * In-app QR scanner on the bundled ML Kit model (startScan), so it works without
   * Google Play's downloadable code-scanner module. The camera draws behind the
   * WebView; while it runs the page background goes transparent (body.scanner-active).
   */
  import { onDestroy } from "svelte";
  import Icon from "./Icon.svelte";
  import { iClose } from "../icons";
  import { t } from "../i18n.svelte";
  import { onBack } from "../nav.svelte";

  let { onresult, oncancel, onerror }: { onresult: (raw: string) => void; oncancel: () => void; onerror: (msg: string) => void } = $props();
  let stopped = false;
  type Plugin = typeof import("@capacitor-mlkit/barcode-scanning").BarcodeScanner;
  let plugin: Plugin | null = null;

  async function stop() {
    if (stopped) return;
    stopped = true;
    document.body.classList.remove("scanner-active");
    if (plugin) {
      await plugin.removeAllListeners().catch(() => {});
      await plugin.stopScan().catch(() => {});
    }
  }

  async function start() {
    try {
      const mod = await import("@capacitor-mlkit/barcode-scanning");
      plugin = mod.BarcodeScanner;
      const { camera } = await plugin.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        await stop();
        onerror(t("scan.denied"));
        return;
      }
      await plugin.addListener("barcodesScanned", (e) => {
        const raw = e.barcodes.find((b) => b.rawValue)?.rawValue;
        if (!raw || stopped) return;
        void stop().then(() => onresult(raw));
      });
      await plugin.addListener("scanError", (e) => {
        void stop().then(() => onerror(e.message));
      });
      document.body.classList.add("scanner-active");
      await plugin.startScan({ formats: [mod.BarcodeFormat.QrCode] });
    } catch (e) {
      await stop();
      onerror(e instanceof Error ? e.message : String(e));
    }
  }

  function cancel() {
    void stop().then(oncancel);
  }

  void start();
  const off = onBack(() => { cancel(); return true; });
  onDestroy(() => { off(); void stop(); });
</script>

<div class="scanner" role="dialog" aria-modal="true" aria-label={t("pair.scan")}>
  <div class="top">
    <button class="close" onclick={cancel} aria-label={t("file.cancel")}><Icon path={iClose} /></button>
  </div>
  <div class="frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
  <p class="hint body-l">{t("scan.hint")}</p>
</div>

<style>
  .scanner {
    position: fixed; inset: 0; z-index: 50; display: grid; grid-template-rows: auto 1fr auto; justify-items: center;
    padding: calc(var(--safe-top) + 8px) 16px calc(var(--safe-bottom) + 40px);
    /* Dim everything outside the viewfinder; the camera shows through the transparent page. */
    background: radial-gradient(closest-side, transparent 0 62%, rgb(0 0 0 / 0.55) 63%);
    background-size: 100% 100%; color: #fff;
  }
  .top { justify-self: stretch; display: flex; justify-content: flex-end; }
  .close { width: 48px; height: 48px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgb(0 0 0 / 0.45); color: #fff; cursor: pointer; }
  .frame { align-self: center; width: min(68vw, 300px); aspect-ratio: 1; position: relative; }
  .frame span { position: absolute; width: 36px; height: 36px; border: 3px solid #fff; border-radius: 4px; }
  .frame span:nth-child(1) { top: 0; left: 0; border-right: 0; border-bottom: 0; }
  .frame span:nth-child(2) { top: 0; right: 0; border-left: 0; border-bottom: 0; }
  .frame span:nth-child(3) { bottom: 0; left: 0; border-right: 0; border-top: 0; }
  .frame span:nth-child(4) { bottom: 0; right: 0; border-left: 0; border-top: 0; }
  .hint { margin: 0; padding: 10px 16px; border-radius: 20px; background: rgb(0 0 0 / 0.5); text-align: center; max-width: 32ch; }
  :global(html:has(body.scanner-active)), :global(body.scanner-active), :global(body.scanner-active #app) { background: transparent !important; }
</style>

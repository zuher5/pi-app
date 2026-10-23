<script lang="ts">
  import { App as CapApp } from "@capacitor/app";
  import { Capacitor } from "@capacitor/core";
  import Drawer from "$lib/components/Drawer.svelte";
  import Pair from "$lib/screens/Pair.svelte";
  import Chat from "$lib/screens/Chat.svelte";
  import Settings from "$lib/screens/Settings.svelte";
  import Files from "$lib/screens/Files.svelte";
  import Overlays from "$lib/components/Overlays.svelte";
  import Rosette from "$lib/components/Rosette.svelte";
  import { conn, restoreConnection } from "$lib/store/connection.svelte";
  import { live } from "$lib/store/session.svelte";
  import { nav, runBack } from "$lib/nav.svelte";

  let pairLink = $state("");
  // Wide screens (tablet, desktop) keep the session list docked beside the content.
  const wideQuery = typeof matchMedia !== "undefined" ? matchMedia("(min-width: 900px)") : null;
  let wide = $state(wideQuery?.matches ?? false);
  $effect(() => {
    const on = (e: MediaQueryListEvent) => { wide = e.matches; if (e.matches) nav.drawer = false; };
    wideQuery?.addEventListener("change", on);
    return () => wideQuery?.removeEventListener("change", on);
  });

  $effect(() => {
    void restoreConnection();
    const subs: Promise<{ remove: () => void }>[] = [];
    if (Capacitor.isNativePlatform()) {
      subs.push(CapApp.addListener("appUrlOpen", ({ url }) => { if (url.startsWith("piapp://")) pairLink = url; }));
      // System Back: close whatever is open (sheet, drawer, editor), then return to Chat, then leave.
      subs.push(CapApp.addListener("backButton", () => {
        if (runBack()) return;
        if (conn.current && nav.tab !== "chat") nav.tab = "chat";
        else void CapApp.exitApp();
      }));
      subs.push(CapApp.addListener("pause", () => live.suspend()));
      subs.push(CapApp.addListener("resume", () => void live.resume()));
      void CapApp.getLaunchUrl().then((r) => { if (r?.url?.startsWith("piapp://")) pairLink = r.url; });
    }
    const onVis = () => (document.visibilityState === "visible" ? void live.resume() : undefined);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      for (const s of subs) void s.then((h) => h.remove());
    };
  });
</script>

{#if !conn.ready}
  <div class="splash"><Rosette state="connecting" size={56} /></div>
{:else if !conn.current || pairLink}
  {#key pairLink}
    <Pair initialLink={pairLink} onpaired={() => (pairLink = "")} />
  {/key}
{:else}
  <div class="shell" class:wide>
    {#if wide}<Drawer docked />{/if}
    <div class="content">
      {#if nav.tab === "chat"}<Chat />
      {:else if nav.tab === "files"}<Files />
      {:else if nav.tab === "terminal"}{#await import("$lib/screens/Terminal.svelte") then m}<m.default />{/await}
      {:else}<Settings />{/if}
    </div>
  </div>
  {#if nav.drawer && !wide}<Drawer />{/if}
  <Overlays />
{/if}

<style>
  .splash { height: 100%; display: grid; place-items: center; }
  .shell { height: 100%; display: flex; flex-direction: column; }
  .content { flex: 1; min-height: 0; min-width: 0; }
  .shell.wide { flex-direction: row; }
  .shell.wide :global(.menu-btn) { display: none; }
</style>

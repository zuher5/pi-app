<script lang="ts">
  import { App as CapApp } from "@capacitor/app";
  import { Capacitor } from "@capacitor/core";
  import NavBar from "$lib/components/NavBar.svelte";
  import Pair from "$lib/screens/Pair.svelte";
  import Sessions from "$lib/screens/Sessions.svelte";
  import Chat from "$lib/screens/Chat.svelte";
  import Settings from "$lib/screens/Settings.svelte";
  import Files from "$lib/screens/Files.svelte";
  import Overlays from "$lib/components/Overlays.svelte";
  import NewSession from "$lib/screens/NewSession.svelte";
  import Rosette from "$lib/components/Rosette.svelte";
  import { conn, restoreConnection } from "$lib/store/connection.svelte";
  import { live } from "$lib/store/session.svelte";
  import { nav, runBack } from "$lib/nav.svelte";

  let pairLink = $state("");

  $effect(() => {
    void restoreConnection();
    const subs: Promise<{ remove: () => void }>[] = [];
    if (Capacitor.isNativePlatform()) {
      subs.push(CapApp.addListener("appUrlOpen", ({ url }) => { if (url.startsWith("piapp://")) pairLink = url; }));
      // System Back: close the sheet, then return to Sessions, then leave the app.
      subs.push(CapApp.addListener("backButton", () => {
        if (nav.sheet) nav.sheet = null;
        else if (runBack()) return;
        else if (conn.current && nav.tab !== "sessions") nav.tab = "sessions";
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
  <div class="shell">
    <NavBar tab={nav.tab} onselect={(tab) => (nav.tab = tab)} busy={live.running} />
    <div class="content">
      {#if nav.tab === "sessions"}<Sessions />
      {:else if nav.tab === "chat"}<Chat />
      {:else if nav.tab === "files"}<Files />
      {:else if nav.tab === "terminal"}{#await import("$lib/screens/Terminal.svelte") then m}<m.default />{/await}
      {:else}<Settings />{/if}
    </div>
  </div>
  {#if nav.sheet === "new"}<NewSession />{/if}
  <Overlays />
{/if}

<style>
  .splash { height: 100%; display: grid; place-items: center; }
  .shell { height: 100%; display: flex; flex-direction: column-reverse; }
  .content { flex: 1; min-height: 0; }
  @media (min-width: 600px) {
    .shell { flex-direction: row; }
  }
</style>

<script lang="ts">
  /** The model new sessions start with (pi's global default). */
  import Icon from "../components/Icon.svelte";
  import Rosette from "../components/Rosette.svelte";
  import { iRadioOn, iRadioOff } from "../icons";
  import { t } from "../i18n.svelte";
  import { api, providers, type ModelsResponse } from "../api";
  import { toast } from "../nav.svelte";

  let { cwd }: { cwd: string } = $props();
  let data = $state<ModelsResponse | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  $effect(() => { void api.models(cwd).then((d) => (data = d)).catch((e) => (error = String(e?.message ?? e))); });

  const groups = $derived.by(() => {
    const g = new Map<string, ModelsResponse["modelList"]>();
    for (const m of data?.modelList ?? []) g.set(m.provider, [...(g.get(m.provider) ?? []), m]);
    return [...g];
  });
  async function pick(provider: string, modelId: string) {
    busy = true;
    try {
      await providers.setDefault(cwd, provider, modelId);
      if (data) data.defaultModel = { provider, modelId };
      toast(t("def.saved"));
    } catch (e) { toast(e instanceof Error ? e.message : String(e)); }
    finally { busy = false; }
  }
</script>

{#if error}
  <p class="err body-m">{error}</p>
{:else if !data}
  <div class="center"><Rosette state="connecting" size={32} /></div>
{:else if !groups.length}
  <p class="none body-m">{t("def.none")}</p>
{:else}
  <p class="lead body-m">{t("def.lead")}</p>
  {#each groups as [provider, models] (provider)}
    <h2 class="group-title">{provider}</h2>
    <div class="group">
      {#each models as m (m.id)}
        {@const on = data.defaultModel?.provider === m.provider && data.defaultModel?.modelId === m.id}
        <button class="lrow" aria-pressed={on} disabled={busy} onclick={() => pick(m.provider, m.id)}>
          <span class="radio" class:on><Icon path={on ? iRadioOn : iRadioOff} size={22} /></span>
          <span class="ltxt"><span class="body-l">{m.name}</span><span class="lsub body-s mono">{m.id}</span></span>
        </button>
      {/each}
    </div>
  {/each}
{/if}

<style>
  .center { display: grid; place-items: center; padding: 48px; }
  .err { color: var(--md-error); }
  .lead, .none { color: var(--md-on-surface-variant); margin: 16px 4px 0; }
  .radio { color: var(--md-on-surface-variant); display: grid; flex: none; } .radio.on { color: var(--md-primary); }
  .mono { font-family: var(--font-mono); }
</style>

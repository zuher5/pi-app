<script lang="ts">
  import Sheet from "./Sheet.svelte";
  import Icon from "./Icon.svelte";
  import Rosette from "./Rosette.svelte";
  import { iRadioOn, iRadioOff } from "../icons";
  import { t, thinkLabel } from "../i18n.svelte";
  import { api, type ModelsResponse } from "../api";
  import { live } from "../store/session.svelte";
  import { toast, nav } from "../nav.svelte";
  import { picked } from "../store/project.svelte";

  let { onclose }: { onclose: () => void } = $props();
  let data = $state<ModelsResponse | null>(null);
  let busy = $state(false);

  $effect(() => {
    const cwd = live.info?.cwd ?? picked.cwd;
    if (cwd) void api.models(cwd).then((d) => (data = d)).catch((e) => toast(String(e?.message ?? e)));
  });

  /** With no session yet, the pick waits and applies when the first prompt starts one. */
  const current = $derived(live.id ? live.model : (live.pendingModel ?? data?.defaultModel ?? null));
  const level = $derived(live.id ? live.thinkingLevel : (live.pendingThinking ?? "off"));
  const key = $derived(current ? `${current.provider}:${current.modelId}` : "");
  const pickModel = (provider: string, modelId: string) =>
    live.id ? live.setModel(provider, modelId) : Promise.resolve(void (live.pendingModel = { provider, modelId }, live.pendingThinking = null));
  const pickLevel = (lv: string) => (live.id ? live.setThinking(lv) : Promise.resolve(void (live.pendingThinking = lv)));
  const levels = $derived(data?.thinkingLevels[key] ?? ["off"]);
  const groups = $derived.by(() => {
    const g = new Map<string, ModelsResponse["modelList"]>();
    for (const m of data?.modelList ?? []) g.set(m.provider, [...(g.get(m.provider) ?? []), m]);
    return [...g];
  });

  async function act(fn: () => Promise<void>) {
    busy = true;
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : String(e)); } finally { busy = false; }
  }
</script>

<Sheet title={t("model.title")} {onclose}>
  {#if !data}
    <div class="center"><Rosette state="connecting" size={32} /></div>
  {:else}
    <h3 class="label-l">{t("model.thinking")}</h3>
    {#if levels.length > 1}
      <div class="seg" role="radiogroup" aria-label={t("model.thinking")}>
        {#each levels as lv (lv)}
          <button role="radio" aria-checked={level === lv} class:on={level === lv} class="label-l"
            disabled={busy || live.running} onclick={() => act(() => pickLevel(lv))}>{thinkLabel(lv)}</button>
        {/each}
      </div>
    {:else}
      <p class="body-m muted">{t("model.noThinking")}</p>
    {/if}
    {#each groups as [provider, models] (provider)}
      <h3 class="label-l">{provider}</h3>
      <ul>
        {#each models as m (m.id)}
          {@const on = current?.provider === m.provider && current?.modelId === m.id}
          <li>
            <button class="row" aria-pressed={on} disabled={busy || live.running} onclick={() => act(() => pickModel(m.provider, m.id))}>
              <span class="radio" class:on><Icon path={on ? iRadioOn : iRadioOff} /></span>
              <span class="txt"><span class="body-l">{m.name}</span><span class="body-s mono">{m.id}</span></span>
            </button>
          </li>
        {/each}
      </ul>
    {/each}
    {#if live.running}<p class="body-s muted">{t("model.busy")}</p>{/if}
    <button class="btn btn-text manage" onclick={() => { onclose(); nav.tab = "settings"; }}>{t("model.manage")}</button>
  {/if}
</Sheet>

<style>
  .manage { min-height: 48px; margin: 8px 0 0; }
  .center { display: grid; place-items: center; padding: 32px; }
  h3 { margin: 12px 12px 8px; color: var(--md-on-surface-variant); }
  .muted { color: var(--md-on-surface-variant); margin: 0 12px 8px; }
  .seg { display: flex; margin: 0 12px 8px; border: 1px solid var(--md-outline); border-radius: 20px; overflow: hidden; }
  .seg button { flex: 1; min-height: 40px; border: 0; background: none; cursor: pointer; color: var(--md-on-surface); padding: 0 4px; }
  .seg button + button { border-left: 1px solid var(--md-outline); }
  .seg .on { background: var(--md-secondary-container); color: var(--md-on-secondary-container); }
  .seg button:disabled { opacity: 0.5; cursor: default; }
  ul { list-style: none; margin: 0; padding: 0; }
  .row { width: 100%; display: flex; align-items: center; gap: 16px; min-height: 56px; padding: 4px 12px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; }
  .row:hover:not(:disabled) { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .row:disabled { opacity: 0.6; cursor: default; }
  .radio { color: var(--md-on-surface-variant); display: grid; } .radio.on { color: var(--md-primary); }
  .txt { display: grid; min-width: 0; }
  .mono { font-family: var(--font-mono); font-size: 0.75rem; color: var(--md-on-surface-variant); }
</style>

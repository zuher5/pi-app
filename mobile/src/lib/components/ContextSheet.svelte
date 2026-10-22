<script lang="ts">
  /** Context window, this session's totals, and the provider's remaining quota when pi can read it. */
  import Sheet from "./Sheet.svelte";
  import ContextRing from "./ContextRing.svelte";
  import Rosette from "./Rosette.svelte";
  import { t } from "../i18n.svelte";
  import { api, USAGE_PROVIDERS, type ProviderUsageResult, type UsageBucket } from "../api";
  import { live } from "../store/session.svelte";
  import { compact } from "../time";

  let { onclose }: { onclose: () => void } = $props();
  const provider = $derived(live.model?.provider ?? "");
  let usage = $state<ProviderUsageResult | null | "loading">(null);

  $effect(() => {
    void live.refreshState();
    if (USAGE_PROVIDERS.includes(provider)) {
      usage = "loading";
      void api.providerUsage(provider).then((r) => (usage = r)).catch(() => (usage = null));
    }
  });

  const ctx = $derived(live.contextUsage);
  const st = $derived(live.stats);

  function money(n: number, cur = "USD") {
    return new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  }
  function bucketValue(b: UsageBucket): string {
    const fmt = (n: number) => (b.unit === "percent" ? `${Math.round(n)}%` : b.unit === "currency" ? money(n, b.currency) : compact(n));
    if (b.remaining !== undefined && b.limit !== undefined && b.unit !== "percent") return `${fmt(b.remaining)} / ${fmt(b.limit)}`;
    if (b.remaining !== undefined) return fmt(b.remaining);
    if (b.used !== undefined && b.limit !== undefined) return `${fmt(b.used)} / ${fmt(b.limit)}`;
    return b.used !== undefined ? fmt(b.used) : "—";
  }
  function resets(b: UsageBucket): string {
    if (!b.resetsAt) return b.period ?? "";
    return new Date(b.resetsAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
</script>

<Sheet {onclose}>
  <div class="cards">
    <section class="card">
      <div class="line head">
        <ContextRing percent={ctx?.percent ?? null} size={20} />
        <span class="label body-l">{t("ctx.context")}</span>
        {#if ctx}
          <span class="body-l"><span class="pct tabular">{ctx.percent === null ? "—" : `${ctx.percent.toFixed(1)}%`}</span>
            <span class="dim tabular">{ctx.tokens === null ? "?" : compact(ctx.tokens)}/{compact(ctx.contextWindow)}</span></span>
        {:else}
          <span class="dim body-m">{t("ctx.notLoaded")}</span>
        {/if}
      </div>
    </section>

    {#if st}
      <section class="card">
        <div class="line"><span class="label title-s">{t("ctx.session")}</span></div>
        <div class="line body-m"><span class="dim">{t("ctx.input")}</span><strong class="tabular">{compact(st.tokens.input)}</strong></div>
        <div class="line body-m"><span class="dim">{t("ctx.output")}</span><strong class="tabular">{compact(st.tokens.output)}</strong></div>
        {#if st.tokens.cacheRead}<div class="line body-m"><span class="dim">{t("ctx.cache")}</span><strong class="tabular">{compact(st.tokens.cacheRead)}</strong></div>{/if}
        <div class="line body-m"><span class="dim">{t("ctx.cost")}</span><strong class="tabular">{money(st.cost)}</strong></div>
      </section>
    {/if}

    {#if usage === "loading"}
      <section class="card center"><Rosette state="connecting" size={24} /></section>
    {:else if usage && usage.status === "ready"}
      <section class="card">
        <div class="line"><span class="label title-s">{usage.report.providerName}</span><span class="dim body-s">{t("ctx.remaining")}</span></div>
        {#each usage.report.buckets as b (b.id)}
          <div class="line body-m"><span class="dim ell">{b.groupLabel ? `${b.groupLabel} · ` : ""}{b.label} <span class="when">{resets(b)}</span></span><strong class="tabular">{bucketValue(b)}</strong></div>
        {/each}
        {#each usage.report.metrics as m (m.id)}
          <div class="line body-m"><span class="dim ell">{m.label}</span><strong class="tabular">{typeof m.value === "number" ? (m.unit === "currency" ? money(m.value, m.currency) : compact(m.value)) : m.value}</strong></div>
        {/each}
      </section>
    {:else if usage}
      <section class="card"><div class="line body-m"><span class="label">{provider}</span><span class="dim">{t("ctx.usageUnavailable")}</span></div></section>
    {/if}
  </div>
</Sheet>

<style>
  .cards { display: grid; gap: 8px; padding: 0 4px; }
  .card { background: var(--md-surface-container); border-radius: var(--radius-l); padding: 6px 16px; }
  .center { display: grid; place-items: center; padding: 16px; }
  .line { display: flex; align-items: baseline; gap: 10px; min-height: 36px; padding: 6px 0; }
  .head { align-items: center; }
  .line > :last-child { margin-left: auto; text-align: right; }
  .line > .label { margin-left: 0; }
  .head .label { flex: 1; }
  .dim { color: var(--md-on-surface-variant); }
  .ell { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .when { opacity: 0.75; }
  .pct { color: var(--md-success); font-weight: 500; margin-right: 6px; }
  strong { font-weight: 500; white-space: nowrap; }
</style>

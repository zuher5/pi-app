<script lang="ts">
  /** A small ring that fills with the context window; tap for the usage sheet. */
  let { percent, size = 22 }: { percent: number | null; size?: number } = $props();
  const r = 9;
  const c = 2 * Math.PI * r;
  const p = $derived(Math.max(0, Math.min(100, percent ?? 0)));
  const tone = $derived(p >= 85 ? "var(--md-error)" : p >= 65 ? "var(--md-warning)" : "var(--md-success)");
</script>

<svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
  <circle cx="11" cy="11" {r} fill="none" stroke="var(--md-outline-variant)" stroke-width="2.5" />
  {#if percent !== null}
    <circle cx="11" cy="11" {r} fill="none" stroke={tone} stroke-width="2.5" stroke-linecap="round"
      stroke-dasharray="{(c * p) / 100} {c}" transform="rotate(-90 11 11)" />
  {/if}
</svg>

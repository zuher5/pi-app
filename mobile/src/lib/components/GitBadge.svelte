<script lang="ts">
  let { code }: { code: string } = $props();
  const colour: Record<string, string> = { M: "var(--ctp-yellow)", A: "var(--ctp-green)", U: "var(--ctp-green)", D: "var(--ctp-red)", R: "var(--ctp-blue)", C: "var(--ctp-peach)" };
</script>

<span class="badge serial" style:--c={colour[code] ?? "var(--md-outline)"} aria-label={`git ${code}`}>{code}</span>

<style>
  .badge {
    flex: none; min-width: 20px; height: 20px; padding: 0 4px; border-radius: 4px; display: inline-grid; place-items: center;
    font-size: 0.6875rem; letter-spacing: 0; font-weight: 500; color: var(--c);
    background: color-mix(in oklab, var(--c) 16%, transparent);
  }
</style>

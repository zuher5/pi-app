<script lang="ts">
  let { path, size = 24, label }: { path: string; size?: number; label?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined} aria-label={label}>
  <path d={path} fill="currentColor" />
</svg>

<style>
  svg { display: block; flex: none; }
</style>

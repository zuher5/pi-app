<script lang="ts" generics="T extends string">
  /** A dropdown that opens from a chip: above it when the chip sits low on screen (the composer), below otherwise. */
  import Icon from "./Icon.svelte";
  import { iCheck } from "../icons";
  import { onBack } from "../nav.svelte";

  type Item = { id: T; label: string; sub?: string; icon?: string; color?: string; disabled?: boolean };
  let { anchor, items, value, label, onpick, onclose }: {
    anchor: HTMLElement; items: Item[]; value: T | null; label: string; onpick: (id: T) => void; onclose: () => void;
  } = $props();

  let menu = $state<HTMLElement | null>(null);
  const pos = $derived.by(() => {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const width = Math.min(300, vw - 16);
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    return r.top > vh / 2
      ? `left:${left}px;width:${width}px;bottom:${vh - r.top + 6}px;max-height:${r.top - 16}px`
      : `left:${left}px;width:${width}px;top:${r.bottom + 6}px;max-height:${vh - r.bottom - 16}px`;
  });
  $effect(() => onBack(() => { onclose(); return true; }));
  $effect(() => { (menu?.querySelector('[aria-checked="true"]') as HTMLElement | null ?? menu?.querySelector("button"))?.focus(); });
  function key(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); onclose(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(menu?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    all[(i + (e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length]?.focus();
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="menu" role="menu" aria-label={label} tabindex="-1" style={pos} bind:this={menu} onkeydown={key}>
  {#each items as it (it.id)}
    <button role="menuitemradio" aria-checked={value === it.id} disabled={it.disabled} onclick={() => { onpick(it.id); onclose(); }}>
      {#if it.icon}<span class="ic" style={it.color ? `color:${it.color}` : ""}><Icon path={it.icon} size={20} /></span>{/if}
      <span class="txt"><span class="body-l">{it.label}</span>{#if it.sub}<span class="body-s sub">{it.sub}</span>{/if}</span>
      {#if value === it.id}<span class="on"><Icon path={iCheck} size={20} /></span>{/if}
    </button>
  {/each}
</div>

<style>
  .scrim { position: fixed; inset: 0; z-index: 40; }
  .menu {
    position: fixed; z-index: 41; overflow-y: auto; padding: 6px; border-radius: var(--radius-l);
    background: var(--md-surface-container-high); box-shadow: 0 6px 24px -6px rgb(0 0 0 / 0.35), 0 2px 6px -2px rgb(0 0 0 / 0.2);
    animation: pop var(--dur-short) var(--ease-out, ease-out);
  }
  button {
    width: 100%; display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 10px; border: 0; background: none;
    border-radius: var(--radius-m); color: var(--md-on-surface); text-align: left; cursor: pointer;
  }
  button:hover:not(:disabled), button:focus-visible { background: color-mix(in oklab, var(--md-on-surface) 8%, transparent); outline: none; }
  button:disabled { opacity: 0.38; cursor: default; }
  .ic { display: grid; color: var(--md-on-surface-variant); flex: none; }
  .txt { flex: 1; min-width: 0; display: grid; }
  .sub { color: var(--md-on-surface-variant); }
  .on { display: grid; color: var(--md-primary); flex: none; }
  @keyframes pop { from { opacity: 0; transform: translateY(4px) scale(0.98); } }
  @media (prefers-reduced-motion: reduce) { .menu { animation: none; } }
</style>

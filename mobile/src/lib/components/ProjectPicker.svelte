<script lang="ts">
  import Icon from "./Icon.svelte";
  import Rosette from "./Rosette.svelte";
  import { iFiles } from "../icons";
  import { api } from "../api";
  import { picked } from "../store/project.svelte";
  import { projectAccent } from "../theme.svelte";
  import { basename } from "../time";

  let { lead }: { lead: string } = $props();
  let roots = $state<string[] | null>(null);
  $effect(() => {
    void api.sessions().then(({ sessions }) => {
      roots = [...new Set(sessions.map((s) => s.cwd))].slice(0, 8);
    }).catch(() => (roots = []));
  });
</script>

<div class="pick">
  <Rosette faint size={120} />
  <p class="body-m lead">{lead}</p>
  {#if roots === null}
    <Rosette state="connecting" size={28} />
  {:else}
    <ul>
      {#each roots as dir (dir)}
        <li>
          <button class="proj" style:--accent={projectAccent(dir)} onclick={() => (picked.cwd = dir)}>
            <span class="sw"><Icon path={iFiles} size={20} /></span>
            <span class="txt"><span class="body-l">{basename(dir)}</span><span class="body-s path">{dir}</span></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .pick { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 16px; }
  .lead { margin: 0; color: var(--md-on-surface-variant); text-align: center; max-width: 34ch; }
  ul { list-style: none; margin: 8px 0 0; padding: 0; width: 100%; max-width: 480px; }
  .proj { width: 100%; display: flex; align-items: center; gap: 16px; padding: 8px 12px; min-height: 64px; border: 0; background: none; border-radius: var(--radius-m); cursor: pointer; text-align: left; }
  .proj:hover { background: color-mix(in oklab, var(--md-on-surface) 6%, transparent); }
  .sw { width: 40px; height: 40px; border-radius: var(--radius-m); display: grid; place-items: center; background: color-mix(in oklab, var(--accent) 20%, var(--md-surface)); color: var(--accent); flex: none; }
  .txt { display: grid; min-width: 0; }
  .path { color: var(--md-on-surface-variant); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 0.75rem; }
</style>

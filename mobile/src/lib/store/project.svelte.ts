import { live } from "./session.svelte";

/** The folder Files and Terminal work in: the open session's, or one picked without a session. */
export const picked = $state<{ cwd: string | null }>({ cwd: null });
export function activeCwd(): string | null {
  return live.info?.cwd ?? picked.cwd;
}

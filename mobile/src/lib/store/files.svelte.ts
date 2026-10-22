import { git, type DirEntry } from "../api";
import type { GitFileStatus, GitStatusResponse } from "@pi/git-types";

export const fileState = $state<{
  root: string | null; dir: string | null; mode: "browse" | "changes"; openPath: string | null; hidden: boolean;
  git: GitStatusResponse | null; entries: DirEntry[];
}>({ root: null, dir: null, mode: "browse", openPath: null, hidden: false, git: null, entries: [] });

export function setRoot(root: string): void {
  if (fileState.root === root) return;
  fileState.root = root;
  fileState.dir = root;
  fileState.openPath = null;
  fileState.git = null;
}

export async function refreshGit(): Promise<void> {
  if (!fileState.root) return;
  fileState.git = await git.status(fileState.root).catch(() => null);
}

export function gitFor(path: string): GitFileStatus | undefined {
  return fileState.git?.files.find((f) => f.filePath === path);
}

/** Does anything under this directory have changes? */
export function dirChanged(path: string): boolean {
  const prefix = path.endsWith("/") ? path : `${path}/`;
  return !!fileState.git?.files.some((f) => f.filePath.startsWith(prefix));
}

export function join(dir: string, name: string): string {
  return dir.endsWith("/") ? `${dir}${name}` : `${dir}/${name}`;
}
export function parent(path: string): string {
  const i = path.replace(/\/+$/, "").lastIndexOf("/");
  return i <= 0 ? "/" : path.slice(0, i);
}

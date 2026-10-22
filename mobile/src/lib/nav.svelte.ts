export type Tab = "sessions" | "chat" | "files" | "terminal" | "settings";
export const nav = $state<{ tab: Tab; sheet: "new" | null }>({ tab: "sessions", sheet: null });

/** System Back: screens push a handler while they have something to close; the newest runs first. */
const backHandlers: (() => boolean)[] = [];
export function onBack(handler: () => boolean): () => void {
  backHandlers.push(handler);
  return () => {
    const i = backHandlers.lastIndexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}
export function runBack(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]()) return true;
  return false;
}

/** Snackbar: one transient message at a time. */
export const snack = $state<{ text: string | null; seq: number }>({ text: null, seq: 0 });
export function toast(text: string): void {
  snack.text = text;
  const seq = ++snack.seq;
  setTimeout(() => { if (snack.seq === seq) snack.text = null; }, 3200);
}

/** One confirm dialog at a time; resolves with the chosen action. */
export const dialog = $state<{ text: string | null; confirm: string; cancel: string; resolve: ((ok: boolean) => void) | null; danger: boolean }>({
  text: null, confirm: "", cancel: "", resolve: null, danger: false,
});
export function confirmDialog(text: string, confirm: string, cancel: string, danger = false): Promise<boolean> {
  return new Promise((resolve) => Object.assign(dialog, { text, confirm, cancel, danger, resolve }));
}

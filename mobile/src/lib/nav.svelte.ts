export type Tab = "sessions" | "chat" | "files" | "terminal" | "settings";
export const nav = $state<{ tab: Tab; sheet: "new" | null }>({ tab: "sessions", sheet: null });

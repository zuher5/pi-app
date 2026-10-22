export type ThemePref = "system" | "light" | "dark";
const media = window.matchMedia("(prefers-color-scheme: dark)");
export const theme = $state({ pref: (localStorage.getItem("piapp.theme") as ThemePref) || "system", dark: false });

function apply(): void {
  theme.dark = theme.pref === "dark" || (theme.pref === "system" && media.matches);
  document.documentElement.dataset.theme = theme.dark ? "dark" : "light";
  void import("@capacitor/status-bar").then(({ StatusBar, Style }) =>
    StatusBar.setStyle({ style: theme.dark ? Style.Dark : Style.Light }).catch(() => {}));
}
media.addEventListener("change", apply);
apply();

export function setTheme(pref: ThemePref): void {
  theme.pref = pref;
  localStorage.setItem("piapp.theme", pref);
  apply();
}

/** Catppuccin accents as "denominations": one stable colour per project. */
const ACCENTS = ["mauve", "blue", "green", "peach", "red", "teal", "pink", "yellow", "sapphire", "maroon"];
export function projectAccent(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return `var(--ctp-${ACCENTS[(h >>> 0) % ACCENTS.length]})`;
}

/** "01a1657a-91ef-…" → "01A1·657A", printed like a banknote serial. */
export function serial(id: string): string {
  const s = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${s.slice(0, 4)}·${s.slice(4, 8)}`;
}

// Settings shows these as 4 simple, aesthetic swatches in a 2x2 grid:
// Row 1: System (auto dark/light), Light
// Row 2: Catppuccin Mocha (default), Lime
export const THEME_OPTIONS = [
  { id: "auto", label: "settings.themeSystem", scheme: null },
  { id: "light", label: "settings.themeLight", scheme: "light" },
  { id: "mocha", label: "settings.themeMocha", scheme: "dark" },
  { id: "lime", label: "settings.themeLime", scheme: "dark" },
] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number]["id"];
export type ResolvedTheme = "light" | "dark" | "mocha" | "lime";

export const LIGHT_THEMES: readonly ResolvedTheme[] = ["light"];
export const DARK_THEMES: readonly ResolvedTheme[] = ["dark", "mocha", "lime"];

/** Default theme preference: Catppuccin Mocha */
export const DEFAULT_THEME_PREFERENCE = "mocha" as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export function isDarkTheme(theme: ResolvedTheme): boolean {
  return DARK_THEMES.includes(theme);
}

// Apply the saved palette before first paint, including when storage is blocked.
export const THEME_INIT_SCRIPT = `(function(){var t=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};try{var s=localStorage.getItem("pi-theme");if(${JSON.stringify(THEME_OPTIONS.map((option) => option.id))}.includes(s))t=s}catch(e){}if(t==="auto")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var r=document.documentElement;r.dataset.theme=t;r.classList.toggle("dark",${JSON.stringify(DARK_THEMES)}.includes(t))})();`;


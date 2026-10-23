// Pi-App: dark palettes only, listed in Settings in this order. pi-web's light,
// high-contrast and Pine palettes are left out (their CSS stays, unused).
export const THEME_OPTIONS = [
  { id: "dark", label: "settings.themeDark", scheme: "dark" },
  { id: "mocha", label: "settings.themeMocha", scheme: "dark" },
  { id: "lime", label: "settings.themeLime", scheme: "dark" },
  { id: "dusk", label: "settings.themeDusk", scheme: "dark" },
  { id: "ember", label: "settings.themeEmber", scheme: "dark" },
  { id: "slate", label: "settings.themeSlate", scheme: "dark" },
  { id: "zenburn", label: "settings.themeZenburn", scheme: "dark" },
] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number]["id"];
export type ResolvedTheme = ThemePreference;

export const DARK_THEMES: readonly ResolvedTheme[] = THEME_OPTIONS.flatMap((option) => (option.scheme === "dark" ? [option.id] : []));

/** Pi-App: a browser with no saved choice opens in Catppuccin Mocha. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "mocha";

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export function isDarkTheme(theme: ResolvedTheme): boolean {
  return DARK_THEMES.includes(theme);
}

// Apply the saved palette before first paint, including when storage is blocked.
export const THEME_INIT_SCRIPT = `(function(){var t=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};try{var s=localStorage.getItem("pi-theme");if(${JSON.stringify(THEME_OPTIONS.map((option) => option.id))}.includes(s))t=s}catch(e){}var r=document.documentElement;r.dataset.theme=t;r.classList.toggle("dark",${JSON.stringify(DARK_THEMES)}.includes(t))})();`;

import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { DARK_THEMES, DEFAULT_THEME_PREFERENCE, THEME_INIT_SCRIPT, THEME_OPTIONS, isDarkTheme, isThemePreference } from "./theme.ts";

test("first paint restores every palette and falls back to Catppuccin Mocha for missing, removed or blocked storage", () => {
  for (const stored of [...THEME_OPTIONS.map(({ id }) => id), null, "", "auto", "light", "pine", "contrast-dark", new Error("Blocked")]) {
    const root = { dataset: {}, classList: { toggle: (name, value) => { root[name] = value; } } };
    runInNewContext(THEME_INIT_SCRIPT, {
      localStorage: { getItem: () => { if (stored instanceof Error) throw stored; return stored; } },
      window: { matchMedia: () => ({ matches: false }) },
      document: { documentElement: root },
    });
    const expected = isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
    assert.equal(root.dataset.theme, expected);
    assert.equal(root.dark, true);
  }
});

test("Pi-App offers dark palettes only, Mocha and Lime right after Dark", () => {
  assert.deepEqual(THEME_OPTIONS.map(({ id }) => id), ["dark", "mocha", "lime", "dusk", "ember", "slate", "zenburn"]);
  assert.deepEqual([...DARK_THEMES], THEME_OPTIONS.map(({ id }) => id));
  assert.ok(THEME_OPTIONS.every(({ id }) => isDarkTheme(id)));
  assert.equal(DEFAULT_THEME_PREFERENCE, "mocha");
});

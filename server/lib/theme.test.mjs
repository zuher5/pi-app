import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { DARK_THEMES, DEFAULT_THEME_PREFERENCE, LIGHT_THEMES, THEME_INIT_SCRIPT, THEME_OPTIONS, isDarkTheme, isThemePreference } from "./theme.ts";

test("first paint restores every palette, falls back to Catppuccin Mocha for missing or blocked storage, and resolves system for auto", () => {
  for (const systemDark of [false, true]) {
    for (const stored of [...THEME_OPTIONS.map(({ id }) => id), null, "", "unknown", new Error("Blocked")]) {
      const root = { dataset: {}, classList: { toggle: (name, value) => { root[name] = value; } } };
      runInNewContext(THEME_INIT_SCRIPT, {
        localStorage: { getItem: () => { if (stored instanceof Error) throw stored; return stored; } },
        window: { matchMedia: () => ({ matches: systemDark }) },
        document: { documentElement: root },
      });
      const expected = stored === "auto"
        ? (systemDark ? "dark" : "light")
        : isThemePreference(stored)
          ? stored
          : DEFAULT_THEME_PREFERENCE;
      assert.equal(root.dataset.theme, expected);
      assert.equal(root.dark, isDarkTheme(expected));
    }
  }
});

test("every palette belongs to exactly one of the light and dark sets, with Mocha as default", () => {
  assert.deepEqual([...LIGHT_THEMES], ["light"]);
  assert.deepEqual([...DARK_THEMES], ["dark", "mocha", "lime"]);
  assert.equal(LIGHT_THEMES.some((id) => DARK_THEMES.includes(id)), false);
  assert.equal(DEFAULT_THEME_PREFERENCE, "mocha");
  assert.deepEqual(THEME_OPTIONS.map(({ id }) => id), ["auto", "light", "mocha", "lime"]);
});

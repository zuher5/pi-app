import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// LF-normalized: a CRLF checkout would break the \n-anchored regexes below.
const readSource = (url) => readFile(url, "utf8").then((text) => text.replaceAll("\r\n", "\n"));

const configSources = await Promise.all(
  ["SkillsConfig", "AgentsConfig", "PluginsConfig", "McpConfig"].map(async (name) => [
    name,
    await readSource(new URL(`./${name}.tsx`, import.meta.url)),
  ]),
);

test("every add pane chooses its scope in one place: the save target under its title", async () => {
  const sources = Object.fromEntries(configSources);
  const panes = {
    SkillsConfig: sources.SkillsConfig.match(/function AddSkillPanel[\s\S]*?\n\}\n/)?.[0] ?? "",
    PluginsConfig: sources.PluginsConfig.match(/function AddPluginPanel[\s\S]*?\n\}\n/)?.[0] ?? "",
    AgentsConfig: sources.AgentsConfig,
    McpAddServer: await readSource(new URL("./McpAddServer.tsx", import.meta.url)),
  };
  for (const [name, source] of Object.entries(panes)) {
    assert.ok(source, name);
    assert.match(source, /<ConfigSaveTarget[\s\S]*?label=\{t\("config\.saveTo"\)\}[\s\S]*?path=\{/, name);
    assert.doesNotMatch(source, /<ConfigScopeSwitch/, `${name} uses the shared row, not a switch of its own`);
  }
});

test("the MCP panel's reasons are visible text, never only a tooltip", () => {
  const mcp = Object.fromEntries(configSources).McpConfig;
  // The panel's own title is the only one: no reason hides in a tooltip.
  assert.deepEqual(mcp.match(/\btitle=\{[^}]*\}/g), ['title={t("settings.mcp")}']);
});

// Files + Terminal screenshots (browser approximation). usage: node dev/screens2.mjs <outDir>
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/workspace/work/shots";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
async function shot(name, { dark = false, steps, open = true }) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "id-ID" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", name, e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console", name, m.text()); });
  await page.addInitScript((c) => localStorage.setItem("CapacitorStorage.piapp.connection", JSON.stringify(c)), conn);
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForSelector(".row", { timeout: 60000 });
  if (open) {
    await page.locator(".row").first().click();
    await page.waitForSelector(".composer");
    await page.waitForTimeout(800);
  }
  await steps(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}
const tab = (p, i) => p.locator(".nav .item").nth(i).click();
await shot("10-files", { steps: async (p) => { await tab(p, 2); await p.waitForTimeout(1500); } });
await shot("11-changes-dark", { dark: true, steps: async (p) => { await tab(p, 2); await p.waitForTimeout(800); await p.locator(".tabs button").nth(1).click(); await p.waitForTimeout(1200); } });
await shot("12-diff-dark", { dark: true, steps: async (p) => { await tab(p, 2); await p.waitForTimeout(1200); await p.getByText("README.md").first().click(); await p.waitForTimeout(1500); } });
await shot("13-edit", { steps: async (p) => { await tab(p, 2); await p.waitForTimeout(1200); await p.getByText("src").first().click(); await p.waitForTimeout(800); await p.getByText("index.ts").first().click(); await p.waitForTimeout(1200); await p.locator('button[aria-label="Edit"]').click(); await p.waitForTimeout(300); await p.locator(".editor").fill("export const x = 2; // from phone\n"); await p.getByText("Simpan").click(); await p.waitForTimeout(1500); } });
await shot("16-picker", { open: false, steps: async (p) => { await tab(p, 2); await p.waitForTimeout(1500); } });
await shot("14-terminal-dark", { dark: true, steps: async (p) => { await tab(p, 3); await p.waitForTimeout(2500); await p.locator(".term").click(); await p.keyboard.type("git status --short && ls\n"); await p.waitForTimeout(1500); } });
await shot("15-terminal-light", { steps: async (p) => { await tab(p, 3); await p.waitForTimeout(2500); } });
await browser.close();

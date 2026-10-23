// Plan/Build mode, model chip on home, Settings > Providers / custom provider / default model, tablet dock.
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/shots5";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
async function shot(name, { dark = false, w = 412, h = 892, steps = async () => {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "id-ID" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", name, e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console", name, m.text()); });
  await page.addInitScript((c) => localStorage.setItem("CapacitorStorage.piapp.connection", JSON.stringify(c)), conn);
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForTimeout(1500);
  await steps(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}
const settings = async (p) => { await p.click('button[aria-label="Menu"]'); await p.waitForTimeout(600); await p.locator(".drawer").getByText("Setelan").click(); await p.waitForTimeout(800); };
const homeWithProject = async (p) => { await p.click('button[aria-label="Menu"]'); await p.waitForTimeout(600); await p.locator(".drawer .row").first().click(); await p.waitForTimeout(2000); await p.click('button[aria-label="Sesi baru"]'); await p.waitForTimeout(1500); };
await shot("01-home-build-dark", { dark: true, steps: homeWithProject });
await shot("02-plan-send-dark", { dark: true, steps: async (p) => {
  await homeWithProject(p); await p.click(".mode"); await p.fill("textarea", "rencanakan fitur login"); await p.click(".send"); await p.waitForTimeout(7000);
} });
await shot("03-settings", { steps: settings });
await shot("04-providers", { steps: async (p) => { await settings(p); await p.getByText("Provider", { exact: true }).click(); await p.waitForTimeout(2500); } });
await shot("05-provider-sheet", { steps: async (p) => { await settings(p); await p.getByText("Provider", { exact: true }).click(); await p.waitForTimeout(2500); await p.locator(".group").nth(1).locator(".lrow").nth(2).click(); await p.waitForTimeout(800); } });
await shot("06-custom-new", { dark: true, steps: async (p) => { await settings(p); await p.getByText("Provider", { exact: true }).click(); await p.waitForTimeout(2500); await p.getByText("Tambah provider").click(); await p.waitForTimeout(500);
  await p.fill("#pn", "lokal"); await p.fill("#pu", "http://127.0.0.1:4010/v1"); await p.click(".lrow.addrow input"); await p.keyboard.type("llama-x"); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  await p.getByText("Ambil daftar model").click(); await p.waitForTimeout(2000); } });
await shot("07-default-model", { steps: async (p) => { await settings(p); await p.getByText("Model default").click(); await p.waitForTimeout(2500); } });
await shot("08-tablet", { w: 1100, h: 760, dark: true });
await browser.close();

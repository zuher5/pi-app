// OpenChamber-style redesign: home hero, drawer, chat, context sheet (browser approximation, not adb).
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/shots4";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
async function shot(name, { dark = false, steps = async () => {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "id-ID" });
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
const openDrawer = async (p) => { await p.click('button[aria-label="Menu"]'); await p.waitForTimeout(800); };
const openChat = async (p) => { await openDrawer(p); await p.locator(".drawer .row").first().click(); await p.waitForTimeout(2500); };
await shot("01-home-dark", { dark: true });
await shot("02-drawer-dark", { dark: true, steps: openDrawer });
await shot("03-chat-dark", { dark: true, steps: async (p) => { await openChat(p); await p.fill("textarea", "ls sekali lagi"); await p.click(".send"); await p.waitForTimeout(6000); } });
await shot("04-context-dark", { dark: true, steps: async (p) => { await openChat(p); await p.click('button[aria-label="Konteks dan pemakaian"]'); await p.waitForTimeout(1200); } });
await shot("05-home-light", { steps: async (p) => { await p.click(".sug >> nth=1"); await p.waitForTimeout(300); } });
await shot("06-chat-light", { steps: openChat });
await shot("07-start-new", { steps: async (p) => { await p.fill("textarea", "tolong ls"); await p.click(".send"); await p.waitForTimeout(6000); } });
await browser.close();

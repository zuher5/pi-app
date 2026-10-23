// Composer dropdowns: mode (Build/Plan/Shell), reasoning level; Shell mode run.
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/shots6";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
async function shot(name, { dark = true, steps = async () => {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "id-ID" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", name, e.message));
  await page.addInitScript((c) => localStorage.setItem("CapacitorStorage.piapp.connection", JSON.stringify(c)), conn);
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForTimeout(1500);
  await steps(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}
const openChat = async (p) => { await p.click('button[aria-label="Menu"]'); await p.waitForTimeout(600); await p.locator(".drawer .row").first().click(); await p.waitForTimeout(2500); };
const thinker = async (p) => { await p.locator(".chip", { hasText: "mock" }).click(); await p.waitForTimeout(1200); await p.getByText("Mock Thinker").click(); await p.waitForTimeout(800); await p.keyboard.press("Escape"); await p.mouse.click(200, 120); await p.waitForTimeout(600); };
await shot("01-mode-menu", { steps: async (p) => { await openChat(p); await p.click(".mode"); await p.waitForTimeout(500); } });
await shot("02-reason-menu", { steps: async (p) => { await openChat(p); await thinker(p); await p.click(".think"); await p.waitForTimeout(500); } });
await shot("03-shell-run", { steps: async (p) => { await openChat(p); await p.click(".mode"); await p.waitForTimeout(300); await p.getByRole("menuitemradio", { name: /Shell/ }).click();
  await p.fill("textarea", "echo halo && ls"); await p.keyboard.press("Enter"); await p.waitForTimeout(4000); await p.locator(".tool .head").last().click(); await p.waitForTimeout(500); } });
await shot("04-reason-thinking", { steps: async (p) => { await openChat(p); await thinker(p); await p.click(".think"); await p.waitForTimeout(400); await p.getByRole("menuitemradio").nth(2).click(); await p.waitForTimeout(800);
  await p.fill("textarea", "jelaskan proyek"); await p.click(".send"); await p.waitForTimeout(6000); } });
await browser.close();

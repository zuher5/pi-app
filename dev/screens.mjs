// Phone-viewport screenshots of the built app against the dev server (browser approximation, not adb).
// usage: node dev/screens.mjs <outDir>   (needs: vite preview on :4173, dev-server.sh on :30141, chromium)
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/shots";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
async function shot(name, { dark = false, scale = 1, paired = true, steps = async () => {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", locale: "id-ID" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", name, e.message));
  await page.addInitScript(([c, paired, scale]) => {
    if (paired) localStorage.setItem("CapacitorStorage.piapp.connection", JSON.stringify(c));
    if (scale !== 1) document.addEventListener("DOMContentLoaded", () => (document.documentElement.style.fontSize = `${16 * scale}px`));
  }, [conn, paired, scale]);
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForTimeout(1200);
  await steps(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}
const openChat = async (p) => { await p.locator(".row").first().click(); await p.waitForSelector(".composer"); await p.waitForTimeout(2500); };
await shot("01-pair", { paired: false });
await shot("02-sessions");
await shot("03-chat", { steps: openChat });
await shot("04-chat-dark", { dark: true, steps: openChat });
await shot("05-streaming-dark", { dark: true, steps: async (p) => { await openChat(p); await p.fill("textarea", "tolong ls lagi dong"); await p.click(".send"); await p.waitForTimeout(700); } });
await shot("05b-done", { steps: async (p) => { await openChat(p); await p.fill("textarea", "ls sekali lagi"); await p.click(".send"); await p.waitForTimeout(5000); } });
await shot("06-new-sheet", { steps: async (p) => { await p.click(".fab"); await p.waitForTimeout(500); } });
await shot("07-chat-scale13", { scale: 1.3, steps: openChat });
await shot("08-settings-dark", { dark: true, steps: async (p) => { await p.locator(".nav .item").nth(4).click(); await p.waitForTimeout(300); } });
await browser.close();

// Model picker + branching flow (browser approximation). usage: node dev/screens3.mjs <outDir>
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/workspace/work/shots";
const conn = { url: "http://127.0.0.1:30141", token: "dev-token-change-me-0123456789", name: "dev-pc" };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, colorScheme: process.env.DARK ? "dark" : "light", locale: "id-ID" });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.addInitScript((c) => localStorage.setItem("CapacitorStorage.piapp.connection", JSON.stringify(c)), conn);
await p.goto("http://127.0.0.1:4173/");
await p.waitForSelector(".row", { timeout: 60000 });
await p.locator(".row").first().click();
await p.waitForSelector(".composer .chip");
await p.waitForTimeout(1200);
const snap = (n) => p.screenshot({ path: `${out}/${n}.png` });
const settle = async () => { await p.waitForTimeout(1000); await p.waitForFunction(() => !document.querySelector(".composer .stop"), null, { timeout: 30000 }); await p.waitForTimeout(1500); };

await p.locator(".composer .chip").first().click();
await p.waitForSelector(".sheet .row");
await p.getByText("Mock Thinker").click();
await p.waitForTimeout(1200);
await p.locator(".seg button").nth(3).click();
await p.waitForTimeout(800);
await snap("20-model-sheet");
await p.locator(".scrim").click();
await p.waitForTimeout(400);
console.log("chip:", await p.locator(".composer .chip").first().innerText());

await p.locator(".user .bubble").first().click();
await p.waitForSelector(".sheet blockquote");
await snap("21-actions");
await p.getByText("Edit dan kirim ulang").click();
await p.waitForTimeout(300);
await p.locator(".composer textarea").fill("tolong ls folder src saja");
await snap("22-editing");
await p.locator(".composer .send").click();
await settle();
await snap("23-branched");
console.log("chips:", await p.locator(".composer .chips").innerText());

await p.getByText("Cabang", { exact: false }).last().click();
await p.waitForSelector(".sheet .row");
await snap("24-branches");
await p.locator(".sheet .row:not(.active)").first().click();
await p.waitForTimeout(1500);
await snap("25-switched");
console.log("first user msg:", await p.locator(".user .bubble").first().innerText());

await p.locator(".user .bubble").first().click();
await p.waitForSelector(".sheet blockquote");
await p.getByText("Fork ke sesi baru").click();
await p.waitForTimeout(2500);
await snap("26-forked");
console.log("fork title:", await p.locator("header").first().innerText());
await browser.close();

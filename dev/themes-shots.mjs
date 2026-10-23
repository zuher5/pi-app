// Screens of Pi-App's themes on a phone: node dev/themes-shots.mjs <outdir>
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/themes";
const base = process.env.BASE || "http://127.0.0.1:30141";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--no-proxy-server"] });
const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`${base}/pair#t=dev-token-change-me-0123456789`, { timeout: 120000 });
await p.waitForURL((u) => !u.pathname.startsWith("/pair"), { timeout: 60000 });
await p.waitForTimeout(4000);
const openSession = async () => {
  await p.getByRole("button", { name: "Show sidebar" }).click(); await p.waitForTimeout(800);
  await p.getByText("tolong ls").click(); await p.waitForTimeout(3500);
};
for (const theme of ["mocha", "lime"]) {
  await p.evaluate((t) => localStorage.setItem("pi-theme", t), theme);
  await p.goto(base); await p.waitForTimeout(3500);
  await openSession();
  await p.screenshot({ path: `${out}/${theme}-chat.png` });
}
await p.getByRole("button", { name: "Show sidebar" }).click(); await p.waitForTimeout(800);
await p.getByRole("button", { name: "Settings" }).click(); await p.waitForTimeout(2000);
await p.screenshot({ path: `${out}/settings.png` });
await b.close();

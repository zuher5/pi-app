// Phone audit of pi-web: pair via QR link, then list touch targets under 44px.
// node dev/audit.mjs <outdir> [width]
import { chromium } from "../server/node_modules/playwright/index.mjs";
const out = process.argv[2] || "/tmp/audit";
const width = Number(process.argv[3] || 412);
const base = process.env.BASE || "http://127.0.0.1:30141";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--no-proxy-server"] });
const ctx = await b.newContext({ viewport: { width, height: 892 }, deviceScaleFactor: 2, hasTouch: true, isMobile: width < 700 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
const small = async (tag) => {
  const list = await p.locator("button:visible, a:visible, [role=button]:visible, input[type=checkbox]:visible, select:visible").evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), cls: (e.className?.baseVal ?? e.className ?? "").toString().slice(0, 60), label: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24) };
  }).filter((x) => x.w > 0 && (x.w < 44 || x.h < 44)));
  console.log(`--- ${tag}`); for (const x of list) console.log(`${x.w}x${x.h}\t${x.cls}\t${x.label}`);
};
await p.goto(`${base}/pair#t=dev-token-change-me-0123456789`, { waitUntil: "load", timeout: 120000 });
await p.waitForURL((u) => !u.pathname.startsWith("/pair"), { timeout: 60000 }).catch(() => console.log("pair: stayed on", p.url()));
await p.waitForTimeout(8000);
await p.screenshot({ path: `${out}/01-home.png` });
await small("home");
await p.getByRole("button", { name: "Show sidebar" }).click().catch(() => {});
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/02-sidebar.png` });
await small("sidebar");
if (process.env.SEND) {
  await p.keyboard.press("Escape");
  await p.mouse.click(width - 20, 400);
  await p.waitForTimeout(800);
  await p.locator("textarea").first().fill("ls the project");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${out}/03-chat.png` });
  await small("chat");
}
await b.close();

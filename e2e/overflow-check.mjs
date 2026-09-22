/** Reports elements wider than the viewport at mobile width (horizontal-scroll offenders). */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3002";
const W = Number(process.env.W ?? 390);
const paths = (process.env.PATHS ?? "/en/buyer").split(",");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--no-first-run",
    "--disable-sync",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--renderer-process-limit=1",
    "--disable-features=OptimizationHints,Translate,AutofillServerCommunication",
  ],
});
const ctx = await browser.newContext({ viewport: { width: W, height: 900 } });
await ctx.route(/(googleapis|google|gstatic|loremflickr)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(90000);
page.setDefaultNavigationTimeout(180000);

await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { waitUntil: "commit" }).catch(() => {});
await page.waitForTimeout(3000);

for (const p of paths) {
  await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const report = await page.evaluate((vw) => {
    const out = [];
    const doc = document.documentElement;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 && r.height > 0) {
        const style = getComputedStyle(el);
        if (style.position === "fixed") continue;
        // only report the offender closest to the leaf
        if (Array.from(el.children).some((c) => c.getBoundingClientRect().width > vw + 2)) continue;
        out.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 4).join(".")} w=${Math.round(r.width)}`);
      }
    }
    return { scrollWidth: doc.scrollWidth, offenders: [...new Set(out)].slice(0, 12) };
  }, W);
  console.log(`\n${p} scrollWidth=${report.scrollWidth} (viewport ${W})`);
  for (const o of report.offenders) console.log("   -", o);
}
await browser.close();

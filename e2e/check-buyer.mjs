import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS ?? "/tmp/claude-0/-home-claude/346c916b-5466-575b-adaa-ddaf8337ffa5/scratchpad/shots";
const BASE = process.env.BASE ?? "http://localhost:3002";
mkdirSync(OUT, { recursive: true });

const paths = (process.env.PATHS ?? "/en/buyer").split(",");
const width = Number(process.env.W ?? 1440);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync", "--disable-features=OptimizationHints,Translate,AutofillServerCommunication,InterestFeedContentSuggestions"],
});
const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
await ctx.route(/(googleapis|google|gstatic|loremflickr)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(180000);
const problems = [];
let current = "startup";
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`[${current}] console: ${m.text().slice(0, 3000)}`);
});
page.on("pageerror", (e) => problems.push(`[${current}] pageerror: ${String(e).slice(0, 400)}`));

await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { waitUntil: "commit" }).catch(() => {});
await page.waitForTimeout(3000);
console.log("logged in");

for (const p of paths) {
  const t0 = Date.now();
  current = p;
  try {
    const res = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(600);
    const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
    await page.screenshot({ path: `${OUT}/${width}-${name}.png`, fullPage: true });
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    console.log(`${res?.status()} ${p} (${Date.now() - t0}ms) h1="${(h1 ?? "").trim().slice(0, 60)}"`);
    if ((res?.status() ?? 500) >= 400) problems.push(`${p} -> ${res?.status()}`);
  } catch (e) {
    console.log(`FAIL ${p}: ${String(e).slice(0, 200)}`);
    problems.push(`${p}: ${String(e).slice(0, 200)}`);
  }
}
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of [...new Set(problems)]) console.log(" -", p);
}
await browser.close();

/** Financing: credit scoring + partner routing + indicative offer, driven through the UI. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS ?? "/tmp/claude-0/-home-claude/346c916b-5466-575b-adaa-ddaf8337ffa5/scratchpad/shots";
const BASE = process.env.BASE ?? "http://localhost:3002";
const ORDER = process.env.ORDER ?? "sd0002pyo9g0b24p";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync", "--disable-dev-shm-usage", "--disable-features=OptimizationHints,Translate,AutofillServerCommunication"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.route(/(googleapis|google|gstatic|loremflickr)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(180000);

await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { waitUntil: "domcontentloaded" });
console.log("[login] ok");

await page.goto(`${BASE}/en/buyer/financing/new?order=${ORDER}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#amount");
await page.selectOption("#productType", "IMPORT_FINANCING");
await page.fill("#amount", "40000");
await page.fill("#requestedTenorDays", "90");
await page.fill("#purpose", "Bridge the 70% balance on order ORD-2026-KW5C76 until our retail receivables clear in January.");
await page.fill("#annualRevenue", "14500000");
await page.fill("#receivables", "2100000");
await page.check('input[name="consent"]', { force: true });
await page.screenshot({ path: `${OUT}/financing-form.png` }).catch(() => {});
await page.getByRole("button", { name: /Submit application/i }).click();
await page.waitForURL(/\/en\/buyer\/financing\/[a-z0-9]+/, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
console.log("   ->", page.url());
const body = await page.locator("body").innerText();
const score = body.match(/\b(\d{1,3})\s*\n?\s*out of 100/i)?.[1] ?? body.match(/Grade ([ABCD])/)?.[0];
console.log("   credit score block:", score ?? "(not found)");
console.log("   routed to a partner:", /Global Import Finance/.test(body));
console.log("   offer shown:", /Accept offer/.test(body));
await page.screenshot({ path: `${OUT}/1440-financing-detail.png` }).catch(() => {});
await browser.close();

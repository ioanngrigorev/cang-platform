/** Last leg of the buyer journey: save a supplier, then review a completed order. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS ?? "/tmp/claude-0/-home-claude/346c916b-5466-575b-adaa-ddaf8337ffa5/scratchpad/shots";
const BASE = process.env.BASE ?? "http://localhost:3002";
const COMPLETED_ORDER = process.env.ORDER ?? "sd0002t9m066wsbq";
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
const shot = (n) => page.screenshot({ path: `${OUT}/journey-${n}.png` }).catch(() => {});

await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { waitUntil: "domcontentloaded" });
console.log("[login] ok");

console.log("\n[6] save a supplier");
await page.goto(`${BASE}/en/buyer/quotations`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("table");
await page.locator('a[href*="/buyer/quotations/"]').first().click();
await page.waitForURL(/\/buyer\/quotations\/[a-z0-9]+/, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
const saveBtn = page.getByRole("button", { name: /^Save$/ }).first();
if (await saveBtn.count()) {
  await saveBtn.click();
  await page.waitForTimeout(6000);
  console.log("   toggled to Saved:", (await page.getByRole("button", { name: /^Saved$/ }).count()) > 0);
} else {
  console.log("   already saved");
}
await page.goto(`${BASE}/en/buyer/saved/suppliers`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
const saved = (await page.locator('a[href*="/supplier/"]').allTextContents()).map((s) => s.trim()).filter(Boolean);
console.log("   saved suppliers:", saved.join(", ") || "(none)");
await shot("saved-suppliers");

console.log("\n[7] review the completed order");
await page.goto(`${BASE}/en/buyer/reviews/new?order=${COMPLETED_ORDER}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
if (await page.locator('select[name="orderId"]').count()) {
  for (const name of ["ratingQuality", "ratingCommunication", "ratingDelivery", "ratingAccuracy", "ratingService"]) {
    await page.locator(`input[name="${name}"][value="5"]`).first().check({ force: true });
  }
  await page.fill("#title", "Consistent quality and shipped on time");
  await page.fill(
    "#body",
    "Third season with this factory. Pre-production sample approved in nine days, bulk matched it, the AQL 2.5 inspection passed with no majors and the container left Cat Lai on the agreed date.",
  );
  await shot("review-form");
  await page.getByRole("button", { name: /Publish review/i }).click();
  await page.waitForURL(/\/en\/buyer\/reviews$/, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("table");
  console.log("   reviews written:", await page.locator("table tbody tr").count());
} else {
  console.log("   nothing to review");
}
await shot("reviews");
console.log("\ndone");
await browser.close();

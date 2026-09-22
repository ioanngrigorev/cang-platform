/** Accept the indicative financing offer on the newest application. */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3002";
const APP = process.env.APP;
if (!APP) throw new Error("set APP=<financing application id>");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync", "--disable-dev-shm-usage", "--disable-features=OptimizationHints,Translate,AutofillServerCommunication"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.route(/(googleapis|google|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
page.setDefaultNavigationTimeout(180000);

await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { waitUntil: "domcontentloaded" });

await page.goto(`${BASE}/en/buyer/financing/${APP}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
for (let i = 0; i < 5; i++) {
  if (await page.locator("dialog[open]").count()) break;
  await page.getByRole("button", { name: /^Accept offer$/ }).first().click();
  await page.waitForTimeout(1500);
}
await page.waitForSelector("dialog[open]");
await page.locator("dialog[open]").getByRole("button", { name: /^Accept offer$/ }).click();
await page.waitForTimeout(6000);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("h1");
const body = await page.locator("body").innerText();
console.log("application status Accepted:", /Accepted/.test(body));
await browser.close();

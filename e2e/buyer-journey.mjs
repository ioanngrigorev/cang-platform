/**
 * Flagship buyer journey, end to end:
 *   login → flagship RFQ → compare quotations → accept one (order created) → open the order →
 *   Pay now → simulate the bank confirmation (deposit PAID, escrow HELD) → publish a new RFQ →
 *   save a supplier → review the completed order.
 *
 * Run with the dev server on http://localhost:3002. Env: BASE, SHOTS, RFQ (flagship id), ORDER (completed order id).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS ?? "/tmp/claude-0/-home-claude/346c916b-5466-575b-adaa-ddaf8337ffa5/scratchpad/shots";
const BASE = process.env.BASE ?? "http://localhost:3002";
const RFQ = process.env.RFQ ?? "sd0002lm68sxf2eq";
const COMPLETED_ORDER = process.env.ORDER ?? "sd0002t9m066wsbq";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--disable-background-networking", "--disable-component-update", "--no-first-run", "--disable-sync", "--disable-features=OptimizationHints,Translate,AutofillServerCommunication"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.route(/(googleapis|google|gstatic|loremflickr)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(45000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const shot = (name) => page.screenshot({ path: `${OUT}/journey-${name}.png` }).catch(() => {});

// 1 — sign in
step(1, "sign in as the demo buyer");
await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "buyer@nordwind-outdoor.de");
await page.fill("#password", "Password123!");
await page.click("button[type=submit]");
await page.waitForURL(/\/en\/buyer/, { timeout: 90000 });
console.log("   ->", page.url());

// 2 — flagship RFQ + comparison table
step(2, "open the flagship RFQ and read the comparison table");
await page.goto(`${BASE}/en/buyer/rfqs/${RFQ}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("table", { timeout: 60000 });
const supplierCols = await page.locator("thead th").count();
const acceptButtons = page.getByRole("button", { name: /Accept & create order/i });
const acceptCount = await acceptButtons.count();
console.log(`   comparison columns: ${supplierCols}, accept buttons: ${acceptCount}`);
await shot("rfq-compare");
if (acceptCount === 0) throw new Error("no actionable quotation on the flagship RFQ");

// 3 — accept the first quotation
step(3, "accept a quotation (creates the purchase order)");
await acceptButtons.first().click();
await page.waitForSelector("dialog[open]", { timeout: 20000 });
const dlg = page.locator("dialog[open]");
for (const [sel, value] of [
  ['input[name="line1"]', "Speicherstadt 14"],
  ['input[name="city"]', "Hamburg"],
  ['input[name="postalCode"]', "20457"],
]) {
  const input = dlg.locator(sel);
  if (await input.count()) {
    const current = await input.inputValue();
    if (!current) await input.fill(value);
  }
}
const country = dlg.locator('select[name="countryCode"]');
if (await country.count()) {
  const v = await country.inputValue();
  if (!v) await country.selectOption("DE");
}
await shot("accept-dialog");
await dlg.getByRole("button", { name: /Create the order/i }).click();
await page.waitForURL(/\/en\/buyer\/orders\/[a-z0-9]+/, { timeout: 90000 });
const orderUrl = page.url();
const orderId = orderUrl.split("/").pop();
console.log("   order created ->", orderUrl);
await page.waitForSelector("h1", { timeout: 60000 });
await shot("order-created");

// 4 — pay the deposit and simulate the bank confirmation
step(4, "pay the deposit, then simulate the bank confirmation");
await page.getByRole("button", { name: /^Pay now$/i }).first().click();
await page.waitForTimeout(3500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("h1", { timeout: 60000 });
const instructionsVisible = await page.getByText(/Bank transfer instructions/i).count();
console.log(`   payment instructions rendered: ${instructionsVisible > 0}`);
await shot("payment-instructions");

await page.getByRole("button", { name: /Simulate bank confirmation/i }).first().click();
await page.waitForTimeout(4500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("h1", { timeout: 60000 });
const paidBadges = await page.getByText(/Held in escrow/i).count();
const paidText = await page.getByText(/Payment received/i).count();
console.log(`   escrow badges: ${paidBadges}, timeline payment events: ${paidText}`);
await shot("order-paid");

// 5 — publish a brand new RFQ
step(5, "create and publish a new RFQ");
await page.goto(`${BASE}/en/buyer/rfqs/new`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("#title", { timeout: 60000 });
const marker = `E2E ${Date.now()}`;
await page.fill("#title", `12,000 packable rain jackets 2.5L, ${marker}`);
await page.fill(
  "#description",
  "Packable 2.5-layer rain jackets for the European autumn range: 20,000 mm water column, fully taped seams, YKK AquaGuard zips, recycled polyester face fabric, buyer-supplied woven labels and hangtags.",
);
await page.fill("#quantity", "12000");
await page.selectOption("#unit", "pieces");
await page.fill("#targetPrice", "18.50");
await page.selectOption("#categoryId", { label: "Apparel" });
await page.selectOption("#destinationCountryCode", "DE");
await page.fill("#destinationCity", "Hamburg");
await page.selectOption("#incoterm", "CIF");
await page.fill("#preferredPaymentTerms", "30% deposit, 70% before shipment");
await page.fill("#certificationRequirements", "OEKO-TEX Standard 100 for the shell fabric, BSCI audit report.");
// add a line item (retry: the button only works once React has hydrated the form)
for (let attempt = 0; attempt < 5; attempt++) {
  if (await page.locator("#item-name-0").count()) break;
  await page.getByRole("button", { name: /Add line item/i }).click();
  await page.waitForTimeout(1200);
}
await page.fill("#item-name-0", "Rain jacket, men's, charcoal");
await page.fill("#item-qty-0", "7000");
// invite one supplier from the picker
const invite = page.locator("label").filter({ hasText: /Verified/ }).first();
if (await invite.count()) await invite.click();
await shot("rfq-new");
await page.getByRole("button", { name: /^Publish RFQ$/i }).click();
await page.waitForURL(/\/en\/buyer\/rfqs\/(?!new)[A-Za-z0-9]{8,}/, { timeout: 120000 });
const newRfqUrl = page.url();
const newRfqId = newRfqUrl.split("/").pop().split("?")[0];
await page.waitForSelector("h1", { timeout: 60000 });
const publishedAlert = await page.getByText(/RFQ published/i).count();
const statusOpen = await page.getByText(/^Open$/).count();
console.log(`   published -> ${newRfqUrl}`);
console.log(`   publish confirmation shown: ${publishedAlert > 0}, status badge Open: ${statusOpen > 0}`);
const invitedRows = await page.locator("li").filter({ hasText: /Not answered yet/i }).count();
console.log(`   invited suppliers listed: ${invitedRows}`);
await shot("rfq-published");

// 6 — save a supplier from a quotation
step(6, "save a supplier");
await page.goto(`${BASE}/en/buyer/rfqs/${RFQ}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("table", { timeout: 60000 });
const supplierLink = page.locator("thead th a").first();
const supplierName = (await supplierLink.textContent())?.trim();
const quotationLink = page.locator('a[href*="/buyer/quotations/"]').first();
if (await quotationLink.count()) {
  await quotationLink.click();
} else {
  await page.goto(`${BASE}/en/buyer/quotations`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href*="/buyer/quotations/"]').first().click();
}
await page.waitForURL(/\/buyer\/quotations\/[a-z0-9]+/, { timeout: 60000 });
await page.waitForSelector("h1", { timeout: 60000 });
const quotedSupplier = (await page.locator("h1").first().textContent())?.trim();
const saveBtn = page.getByRole("button", { name: /^Save$/ }).first();
if (await saveBtn.count()) {
  await saveBtn.click();
  await page.waitForTimeout(3000);
  const nowSaved = await page.getByRole("button", { name: /^Saved$/ }).count();
  console.log(`   save toggled to "Saved": ${nowSaved > 0}`);
} else {
  console.log("   supplier was already saved");
}
await page.goto(`${BASE}/en/buyer/saved/suppliers`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("h1", { timeout: 60000 });
const savedNames = await page.locator('a[href*="/supplier/"]').allTextContents();
console.log(`   saved suppliers: ${savedNames.map((s) => s.trim()).filter(Boolean).join(", ") || "(none)"}`);
void supplierName;
void quotedSupplier;
await shot("saved-suppliers");

// 7 — review the completed order
step(7, "review the completed order");
await page.goto(`${BASE}/en/buyer/reviews/new?order=${COMPLETED_ORDER}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("h1", { timeout: 60000 });
const hasForm = await page.locator('select[name="orderId"]').count();
if (hasForm) {
  for (const name of ["ratingQuality", "ratingCommunication", "ratingDelivery", "ratingAccuracy", "ratingService"]) {
    await page.locator(`input[name="${name}"][value="5"]`).first().check({ force: true });
  }
  await page.fill("#title", "Consistent quality and shipped on time");
  await page.fill(
    "#body",
    "Third season with this factory. Pre-production sample approved in nine days, bulk matched it, AQL 2.5 inspection passed with no majors and the container left Cat Lai on the agreed date.",
  );
  await shot("review-form");
  await page.getByRole("button", { name: /Publish review/i }).click();
  await page.waitForURL(/\/en\/buyer\/reviews$/, { timeout: 90000 });
  await page.waitForSelector("h1", { timeout: 60000 });
  const reviewRows = await page.locator("table tbody tr").count();
  console.log(`   review submitted; reviews written: ${reviewRows}`);
} else {
  console.log("   no completed order pending a review (already reviewed)");
}
await shot("reviews");

console.log("\nCreated in this run:");
console.log(`  order=${orderId}`);
console.log(`  rfq=${newRfqId}`);
if (errors.length) {
  console.log("\nPAGE ERRORS:");
  for (const e of [...new Set(errors)]) console.log(" -", e);
}
await browser.close();

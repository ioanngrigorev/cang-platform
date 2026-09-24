/**
 * Customer journeys end to end (29 steps), against a running production build with the demo seed:
 *   anonymous visitor → registers as a buyer (returns to the page they came from) → messages a supplier,
 *   saves a product, posts an RFQ → supplier quotes → buyer accepts → PO confirmed → deposit paid and
 *   confirmed by admin → production → truckload booked with the logistics partner (Saigon Freight) →
 *   partner assigns a truck, picks up (order → SHIPPING), driver reports transit, a failed attempt with a
 *   reason, redelivery, delivery with receiver + POD photo (order → DELIVERY) → buyer sees the timeline →
 *   balance paid → receipt confirmed (COMPLETED) → review. Then: partner REST API (idempotent events,
 *   validation, bad key), GHN webhook with token (duplicates ignored, bad token 401), a new supplier
 *   onboarding and product approval, a new logistics partner onboarding, approval and re-assignment.
 *
 * Run: `next build`, start `.next/standalone/server.js` (restart it between runs: registration is
 * rate-limited to 5 per hour per IP), then `node e2e/cjm-journey.mjs`.
 * Env: BASE (default http://localhost:3216), DATABASE_URL, PW_CHROMIUM, SHOTS, DEBUG_NET=1 to log POSTs.
 */
import { chromium } from "@playwright/test";
import pg from "pg";

const BASE = process.env.BASE ?? "http://localhost:3216";
const DB = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://cang:cang@localhost:5432/cang" });
const q = async (sql, params = []) => (await DB.query(sql, params)).rows;
const stamp = Date.now().toString(36);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const results = [];
const problems = [];

async function session(name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  // Wait for hydration before typing: filling server-rendered inputs too early loses the values.
  const goto = page.goto.bind(page);
  page.goto = (url, opts = {}) => goto(url, { waitUntil: "networkidle", ...opts });
  if (process.env.DEBUG_NET) {
    page.on("request", (r) => r.method() === "POST" && console.log(`   [${name}] >> POST ${r.url().replace(BASE, "").slice(0, 80)}`));
    page.on("response", (r) => r.request().method() === "POST" && console.log(`   [${name}] << ${r.status()} ${r.url().replace(BASE, "").slice(0, 80)}`));
    page.on("requestfinished", (r) => r.method() === "POST" && console.log(`   [${name}] == finished ${r.url().replace(BASE, "").slice(0, 60)} ${JSON.stringify(r.timing()).slice(0, 120)}`));
    page.on("requestfailed", (r) => console.log(`   [${name}] !! ${r.failure()?.errorText} ${r.url().replace(BASE, "").slice(0, 80)}`));
  }
  page.on("pageerror", (e) => problems.push(`${name} pageerror ${page.url()}: ${String(e).slice(0, 160)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR_ABORTED/.test(m.text())) problems.push(`${name} console ${page.url()}: ${m.text().slice(0, 200)}`);
  });
  return { ctx, page, name };
}
async function login(s, email, password = "Password123!") {
  await s.page.goto(`${BASE}/en/login`);
  await s.page.fill("#email", email);
  await s.page.fill("#password", password);
  await Promise.all([s.page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }), s.page.click("button[type=submit]")]);
}
/** Click and wait until the URL matches (soft navigations included); on timeout report what the page shows. */
async function clickAndWait(page, clickable, re, timeout = 30000) {
  await clickable.click();
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (re.test(new URL(page.url()).pathname + new URL(page.url()).search)) {
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(300);
      return page.url();
    }
    await page.waitForTimeout(250);
  }
  const alerts = (await page.locator("[role=alert], .text-danger-600, [role=status], [aria-live]").allInnerTexts().catch(() => [])).filter((t) => t.trim() && t.trim() !== "*");
  await page.screenshot({ path: `${process.env.SHOTS ?? "test-results"}/cjm-fail-${Date.now()}.png`, fullPage: true }).catch(() => {});
  const text = await page.locator("main").innerText().catch(() => "");
  throw new Error(`still at ${page.url()} — alerts: ${alerts.join(" | ").slice(0, 300)} — ${text.replace(/\s+/g, " ").slice(0, 200)}`);
}
async function step(name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, note });
    console.log(`✓ ${name}${note ? ` — ${note}` : ""}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, note: String(e).slice(0, 300) });
    console.log(`✗ ${name}: ${String(e).slice(0, 300)}`);
    throw e;
  }
}
/** Wait until no native <dialog> is open (the form closes it on success); report its errors otherwise. */
async function closed(page, label, timeout = 25000) {
  try {
    await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0, null, { timeout });
  } catch {
    const text = await page.locator("dialog[open]").first().innerText().catch(() => "");
    const busy = await page.locator("dialog[open] button[type=submit]").last().evaluate((b) => b.disabled || b.getAttribute("aria-busy")).catch(() => "?");
    throw new Error(`${label} stayed open (submit pending: ${busy}): ${text.replace(/\s+/g, " ").slice(0, 400)}`);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
}
/** Open a dialog by its trigger text, fill fields, submit, wait for it to close. */
async function dialog(page, trigger, fill, submit) {
  await page.getByRole("button", { name: trigger, exact: false }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ state: "visible" });
  await fill(dlg);
  await dlg.getByRole("button", { name: submit, exact: false }).last().click();
  await closed(page, `dialog "${trigger}"`);
  await page.waitForLoadState("networkidle").catch(() => {});
}

const buyer = await session("buyer");
const seller = await session("seller");
const admin = await session("admin");
const partner = await session("partner");
const driver = await session("driver");
const buyerEmail = `cjm.buyer.${stamp}@example.com`;
let rfqId, quotationId, orderId, shipmentId;

try {
  // ---------- Buyer: discover → contact → register (returns to the message form) ----------
  await step("anon: product page → Contact supplier → login keeps the target", async () => {
    const [p] = await q(`select p.slug, c.slug as supplier from products p join companies c on c.id=p.company_id where c.slug='saigon-pack-manufacturing' and p.status='ACTIVE' limit 1`);
    await buyer.page.goto(`${BASE}/en/product/${p.slug}`);
    await buyer.page.getByRole("link", { name: "Contact supplier" }).first().click();
    await buyer.page.waitForURL(/\/login\?next=/);
    const next = new URL(buyer.page.url()).searchParams.get("next");
    if (!next?.includes("/buyer/messages/new?supplier=saigon-pack-manufacturing")) throw new Error(`next lost: ${next}`);
    return next;
  });
  await step("anon: register as buyer from login → lands on the message form", async () => {
    await buyer.page.getByRole("link", { name: /create/i }).first().click();
    await buyer.page.waitForURL(/\/register/);
    await buyer.page.fill("#name", "CJM Test Buyer");
    await buyer.page.fill("#email", buyerEmail);
    await buyer.page.fill("#companyName", `CJM Imports ${stamp}`);
    await buyer.page.selectOption("#countryCode", "DE");
    await buyer.page.fill("#password", "Password123!");
    await buyer.page.fill("#confirmPassword", "Password123!");
    await buyer.page.check("input[name=acceptTerms]");
    await clickAndWait(buyer.page, buyer.page.locator("button[type=submit]"), /\/buyer\/messages\/new/);
    return buyer.page.url().replace(BASE, "");
  });
  await step("buyer: send the first message to the supplier", async () => {
    await buyer.page.fill("#subject", "Samples and MOQ");
    await buyer.page.fill("#body", "Hello, could you share MOQ and lead time for this backpack? We need 3,000 units for Q1.");
    await clickAndWait(buyer.page, buyer.page.getByRole("button", { name: "Send message" }), /\/buyer\/messages\/(?!new)[a-z0-9]+/);
    return buyer.page.url().replace(BASE, "");
  });
  await step("buyer: save a product from its page (real toggle)", async () => {
    const [p] = await q(`select slug, id from products where status='ACTIVE' order by view_count desc nulls last limit 1`);
    await buyer.page.goto(`${BASE}/en/product/${p.slug}`);
    await buyer.page.getByRole("button", { name: /^Save$/ }).first().click();
    await buyer.page.getByRole("button", { name: /Saved/ }).first().waitFor({ timeout: 15000 });
    const [row] = await q(`select count(*)::int n from saved_items si join users u on u.id=si.user_id where u.email=$1 and si.product_id=$2`, [buyerEmail, p.id]);
    if (row.n !== 1) throw new Error("not saved in DB");
    return p.slug;
  });
  await step("buyer: post a public RFQ", async () => {
    await buyer.page.goto(`${BASE}/en/buyer/rfqs/new`);
    const [cat] = await q(`select id from product_categories where slug='bags-luggage' or slug like 'backpack%' order by level limit 1`);
    await buyer.page.fill("#title", `3,000 laptop backpacks, private label (${stamp})`);
    if (cat) await buyer.page.selectOption("#categoryId", cat.id);
    await buyer.page.fill("#description", "Laptop backpack 20 L, recycled polyester 600D, padded 15.6\" sleeve, custom woven label and hangtag. Carton packing 20 pcs/ctn.");
    await buyer.page.fill("#quantity", "3000");
    await buyer.page.selectOption("#destinationCountryCode", "DE");
    await buyer.page.fill("#destinationCity", "Hamburg");
    await buyer.page.selectOption("#incoterm", "FOB");
    const d = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    await buyer.page.fill("#quoteDeadline", d);
    await clickAndWait(buyer.page, buyer.page.getByRole("button", { name: "Publish RFQ" }), /\/buyer\/rfqs\/(?!new)[a-z0-9]+(\?|$)/);
    rfqId = new URL(buyer.page.url()).pathname.split("/").pop();
    const [r] = await q(`select status, visibility from rfqs where id=$1`, [rfqId]);
    if (r.status !== "OPEN") throw new Error(`RFQ status ${r.status}`);
    return rfqId;
  });

  // ---------- Supplier quotes ----------
  await step("seller: sees the RFQ and sends a quotation", async () => {
    await login(seller, "sales@saigonpack.vn");
    await seller.page.goto(`${BASE}/en/seller/quotations/new?rfq=${rfqId}`, { waitUntil: "networkidle" });
    const rows = seller.page.locator("input[type=number]:not([name])");
    const n = await rows.count();
    if (n < 2) throw new Error(`quotation line inputs missing (${n})`);
    // the line's last number input is the unit price
    await rows.nth(n - 1).fill("11.8");
    await seller.page.fill("#q-validity", "30");
    await seller.page.fill("#q-lead", "45");
    await seller.page.fill("#q-payment", "30% deposit, 70% before shipment");
    await seller.page.selectOption("#q-incoterm", "FOB");
    await clickAndWait(seller.page, seller.page.getByRole("button", { name: "Send quotation" }), /\/seller\/quotations\/(?!new)[a-z0-9]+(\?|$)/);
    quotationId = new URL(seller.page.url()).pathname.split("/").pop();
    const [qq] = await q(`select status, total from quotations where id=$1`, [quotationId]);
    return `${qq.status} ${qq.total}`;
  });

  // ---------- Buyer accepts → order ----------
  await step("buyer: accepts the quotation → order created", async () => {
    await buyer.page.goto(`${BASE}/en/buyer/quotations/${quotationId}`);
    await buyer.page.getByRole("button", { name: /Accept & create order/ }).click();
    const dlg = buyer.page.getByRole("dialog");
    await dlg.waitFor();
    console.log("   accept dialog fields:", (await dlg.locator("input,select,textarea").evaluateAll((els) => els.map((e) => `${e.name || e.id}:${e.type}`))).join(", "));
    for (const [id, v] of [["line1", "Am Sandtorkai 50"], ["city", "Hamburg"], ["postalCode", "20457"], ["contactName", "CJM Buyer"], ["phone", "+49 40 1234567"]]) {
      const el = dlg.locator(`[name="${id}"], #${id}`).first();
      if (await el.count()) await el.fill(v).catch(() => {});
    }
    await dlg.getByRole("button", { name: /Create the order/ }).click();
    await closed(buyer.page, "accept dialog");
    await buyer.page.waitForTimeout(1500);
    const [o] = await q(`select id, status_code from orders where quotation_id=$1`, [quotationId]);
    if (!o) throw new Error("no order");
    orderId = o.id;
    return o.status_code;
  });

  // ---------- Supplier confirms, buyer pays through CANG, admin confirms the transfer ----------
  const orderPage = (who) => `${BASE}/en/${who}/orders/${orderId}`;
  const orderStatus = async () => (await q(`select status_code from orders where id=$1`, [orderId]))[0].status_code;
  async function payNext(label) {
    await buyer.page.goto(orderPage("buyer"));
    const pay = buyer.page.getByRole("button", { name: /Pay now|Payment instructions/ }).first();
    await pay.click();
    await buyer.page.waitForTimeout(2000);
    const [pmt] = await q(`select id, payment_number, status from payments where order_id=$1 and status in ('PENDING','AUTHORIZED') order by due_at nulls last, created_at limit 1`, [orderId]);
    if (!pmt) throw new Error(`${label}: no pending payment after "Pay now"`);
    await admin.page.goto(`${BASE}/en/admin/payments?tab=pending&q=${pmt.payment_number}`);
    await dialog(admin.page, /Confirm receipt/, async (dlg) => {
      const ref = dlg.locator("input[name=bankReference], input[name=reference]").first();
      if (await ref.count()) await ref.fill(`VCB-${stamp}`);
    }, /Confirm/);
    const [after] = await q(`select status, escrow_status from payments where id=$1`, [pmt.id]);
    if (!["PAID", "SETTLED"].includes(after.status)) throw new Error(`${label}: payment ${after.status}/${after.escrow_status}`);
    return `${pmt.payment_number} ${after.status}/${after.escrow_status}`;
  }
  await step("seller: confirms the purchase order → awaiting payment", async () => {
    await seller.page.goto(orderPage("seller"));
    await dialog(seller.page, /^Confirm order$/, async () => {}, /Confirm order/);
    const st = await orderStatus();
    if (st !== "PAYMENT") throw new Error(`order ${st}`);
    return st;
  });
  await login(admin, "admin@cang.vn", "Admin123!");
  await step("buyer pays the deposit, admin confirms the bank transfer", () => payNext("deposit"));
  await step("seller: starts production", async () => {
    await seller.page.goto(orderPage("seller"));
    await dialog(seller.page, /^Start production$/, async () => {}, /Start production/);
    const st = await orderStatus();
    if (st !== "PRODUCTION") throw new Error(`order ${st}`);
    return st;
  });

  // ---------- Shipment booked with the logistics partner ----------
  await step("seller: books a truckload with Saigon Freight (partner) from the order", async () => {
    await seller.page.goto(orderPage("seller"));
    const [prov] = await q(`select id from logistics_providers where code='SAIGON_FREIGHT'`);
    await dialog(seller.page, /New shipment/, async (dlg) => {
      await dlg.locator("#sf-mode").selectOption("ROAD");
      await dlg.locator("#sp-provider").selectOption(prov.id);
      await dlg.locator("#sp-carrier-code").selectOption("OTHER");
      await dlg.locator("#sf-packages").fill("150");
      await dlg.locator("#sf-weight").fill("1200");
      const etd = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await dlg.locator("#sf-etd").fill(etd);
    }, /Create shipment/);
    const [sh] = await q(`select id, status, provider_id from shipments where order_id=$1`, [orderId]);
    if (!sh || sh.provider_id !== prov.id) throw new Error("shipment not assigned to the partner");
    shipmentId = sh.id;
    const [n] = await q(`select count(*)::int n from notifications nt join company_members m on m.user_id=nt.user_id join logistics_providers p on p.company_id=m.company_id where p.code='SAIGON_FREIGHT' and nt.link=$1`, [`/partner/shipments/${sh.id}`]);
    if (n.n < 1) throw new Error("partner was not notified");
    return `${sh.status}, partner notified (${n.n})`;
  });
  await step("seller: cannot report transit on a partner-managed shipment (only hand-over / cancel)", async () => {
    await seller.page.goto(`${BASE}/en/seller/shipments/${shipmentId}`);
    await seller.page.getByRole("button", { name: /Update status/ }).click();
    const opts = await seller.page.locator("#su-status option").evaluateAll((os) => os.map((o) => o.value));
    await seller.page.keyboard.press("Escape");
    if (opts.some((o) => !["READY_TO_PICK", "CANCELLED"].includes(o)) || !opts.includes("READY_TO_PICK")) throw new Error(`seller offered ${opts.join(",")}`);
    return opts.join(", ");
  });

  // ---------- Partner portal: dispatcher and driver move the goods ----------
  async function partnerUpdate(s, status, fill = async () => {}) {
    await s.page.goto(`${BASE}/en/partner/shipments/${shipmentId}`);
    await dialog(s.page, /Update status/, async (dlg) => {
      await dlg.locator("#su-status").selectOption(status);
      await fill(dlg);
    }, /Save status/);
    const [sh] = await q(`select status from shipments where id=$1`, [shipmentId]);
    if (sh.status !== status) throw new Error(`shipment is ${sh.status}, expected ${status}`);
  }
  await step("partner: sees the booking in Pickups and assigns a truck", async () => {
    await login(partner, "ops@saigonfreight.vn");
    await partner.page.goto(`${BASE}/en/partner/shipments?tab=pickup`);
    const [sh] = await q(`select shipment_number from shipments where id=$1`, [shipmentId]);
    await partner.page.getByRole("link", { name: sh.shipment_number }).first().waitFor();
    await partnerUpdate(partner, "VEHICLE_ASSIGNED", async (dlg) => {
      await dlg.locator("#su-plate").fill("51C-888.88");
      await dlg.locator("#su-driver").fill("Lê Văn Tài");
    });
    return sh.shipment_number;
  });
  await step("partner: picked up (counted packages, weight) → order moves to Shipping", async () => {
    await partnerUpdate(partner, "PICKED_UP", async (dlg) => {
      await dlg.locator("#su-packages").fill("150");
      await dlg.locator("#su-weight").fill("1215");
      await dlg.locator("#su-location").fill("Saigon Pack factory, Tan Binh");
    });
    const st = await orderStatus();
    if (st !== "SHIPPING") throw new Error(`order ${st}`);
    return st;
  });
  await step("driver (Staff role): in transit → out for delivery", async () => {
    await login(driver, "driver@saigonfreight.vn");
    await partnerUpdate(driver, "IN_TRANSIT", async (dlg) => dlg.locator("#su-location").fill("QL1A, Phan Thiet"));
    await partnerUpdate(driver, "OUT_FOR_DELIVERY");
    return "ok";
  });
  await step("driver: failed attempt needs a reason, then redelivery", async () => {
    await driver.page.goto(`${BASE}/en/partner/shipments/${shipmentId}`);
    await driver.page.getByRole("button", { name: /Update status/ }).click();
    const dlg = driver.page.getByRole("dialog");
    await dlg.locator("#su-status").selectOption("DELIVERY_FAILED");
    await dlg.getByRole("button", { name: /Save status/ }).click();
    await dlg.getByText("Choose a reason.", { exact: true }).waitFor({ timeout: 10000 });
    await dlg.locator("#su-reason").selectOption("RECEIVER_UNREACHABLE");
    await dlg.getByRole("button", { name: /Save status/ }).click();
    await closed(driver.page, "status dialog");
    const [sh] = await q(`select status, exception_reason from shipments where id=$1`, [shipmentId]);
    if (sh.status !== "DELIVERY_FAILED" || sh.exception_reason !== "RECEIVER_UNREACHABLE") throw new Error(JSON.stringify(sh));
    const [n] = await q(`select count(*)::int n from notifications nt join users u on u.id=nt.user_id where u.email=$1 and nt.link=$2`, [buyerEmail, `/buyer/shipments/${shipmentId}`]);
    await partnerUpdate(driver, "OUT_FOR_DELIVERY");
    return `buyer notified ${n.n}×`;
  });
  await step("driver: delivered with receiver + proof-of-delivery photo → order Delivered", async () => {
    await driver.page.goto(`${BASE}/en/partner/shipments/${shipmentId}`);
    await driver.page.getByRole("button", { name: /Update status/ }).click();
    const dlg = driver.page.getByRole("dialog");
    await dlg.locator("#su-status").selectOption("DELIVERED");
    await dlg.getByRole("button", { name: /Save status/ }).click();
    await dlg.getByText(/Enter who received/).first().waitFor({ timeout: 10000 });
    await dlg.locator("#su-receiver").fill("Nguyễn Văn An");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await dlg.locator("input[type=file]").first().setInputFiles({ name: "pod.png", mimeType: "image/png", buffer: png });
    await dlg.getByText("pod.png").first().waitFor({ timeout: 15000 });
    await dlg.getByRole("button", { name: /Save status/ }).click();
    await closed(driver.page, "status dialog");
    const [sh] = await q(`select status, receiver_name, pod_url from shipments where id=$1`, [shipmentId]);
    if (sh.status !== "DELIVERED" || !sh.pod_url) throw new Error(JSON.stringify(sh));
    const st = await orderStatus();
    if (st !== "DELIVERY") throw new Error(`order ${st}`);
    return `${sh.receiver_name}, POD ${sh.pod_url.slice(0, 40)}…, order ${st}`;
  });
  await step("buyer: sees the full tracking history and can open the POD", async () => {
    await buyer.page.goto(`${BASE}/en/buyer/shipments/${shipmentId}`, { waitUntil: "networkidle" });
    await buyer.page.getByText("Tracking history").first().waitFor();
    const text = await buyer.page.locator("main").innerText();
    for (const s of ["Truck assigned", "Picked up", "Delivery attempt failed", "Receiver unreachable", "Received by Nguyễn Văn An"]) if (!text.includes(s)) throw new Error(`missing "${s}" in ${buyer.page.url()}: ${text.replace(/\s+/g, " ").slice(0, 600)}`);
    const pod = await buyer.page.locator("a", { hasText: "Proof of delivery" }).first().getAttribute("href");
    const res = await buyer.page.request.get(`${BASE}${pod}`);
    if (res.status() !== 200) throw new Error(`POD ${res.status()}`);
    return "timeline ok, POD 200";
  });
  await step("buyer pays the balance, admin confirms", () => payNext("balance"));
  await step("buyer: confirms receipt → order completed", async () => {
    await buyer.page.goto(orderPage("buyer"));
    await dialog(buyer.page, /Confirm receipt/, async () => {}, /Confirm/);
    const st = await orderStatus();
    if (st !== "COMPLETED") throw new Error(`order ${st}`);
    return st;
  });
  await step("buyer: leaves a review", async () => {
    await buyer.page.goto(`${BASE}/en/buyer/reviews/new?order=${orderId}`, { waitUntil: "networkidle" });
    for (const g of ["ratingQuality", "ratingCommunication", "ratingDelivery", "ratingAccuracy", "ratingService"]) await buyer.page.locator(`input[name=${g}]`).nth(4).check({ force: true });
    await buyer.page.fill("#title", "Reliable backpack supplier");
    await buyer.page.fill("#body", "Good quality, packing as agreed, delivered by the partner with photos. Would order again.");
    await buyer.page.getByRole("button", { name: /Submit|Publish|Post/ }).last().click();
    await buyer.page.waitForTimeout(2500);
    const [r] = await q(`select count(*)::int n from reviews where order_id=$1`, [orderId]);
    if (r.n < 1) throw new Error("review not saved: " + (await buyer.page.locator("main").innerText()).slice(0, 300));
    return "saved";
  });

  // ---------- Partner API (TMS integration) ----------
  let apiKey;
  await step("partner: creates an API key with shipment scopes in Integrations", async () => {
    await partner.page.goto(`${BASE}/en/partner/integrations`);
    await dialog(partner.page, /Create key/, async (dlg) => {
      await dlg.locator("#key-name").fill(`TMS ${stamp}`);
      const write = dlg.locator("input[value='shipments:write']");
      if (!(await write.isChecked())) await write.check();
    }, /Create key/);
    apiKey = (await partner.page.locator("code, pre").allInnerTexts()).map((t) => t.match(/cang_[a-f0-9]+_[A-Za-z0-9_-]+/)?.[0]).find(Boolean);
    if (!apiKey) throw new Error("key not shown");
    return apiKey.slice(0, 14) + "…";
  });
  await step("partner API: list assigned shipments, report arrival, idempotent retry, validation", async () => {
    const h = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    // test data hygiene: put the seeded sea shipment back in transit
    await q(`delete from shipment_events where shipment_id='sd0002qryii4218n' and source in ('api','partner','admin')`);
    await q(`update shipments set status='IN_TRANSIT', exception_reason=null, provider_id=(select id from logistics_providers where code='SAIGON_FREIGHT') where id='sd0002qryii4218n'`);
    const list = await (await fetch(`${BASE}/api/partner/v1/shipments?status=IN_TRANSIT&limit=100`, { headers: h })).json();
    const sea = list.data.find((x) => x.mode === "SEA_FCL" && x.status === "IN_TRANSIT");
    if (!sea) throw new Error("no in-transit sea shipment in API list: " + JSON.stringify(list).slice(0, 200));
    const ev = { status: "AT_DESTINATION_PORT", location: "Southampton", external_id: `TMS-${stamp}` };
    const r1 = await fetch(`${BASE}/api/partner/v1/shipments/${sea.shipment_number}/events`, { method: "POST", headers: h, body: JSON.stringify(ev) });
    const r2 = await fetch(`${BASE}/api/partner/v1/shipments/${sea.shipment_number}/events`, { method: "POST", headers: h, body: JSON.stringify(ev) });
    const j2 = await r2.json();
    const r3 = await fetch(`${BASE}/api/partner/v1/shipments/${sea.shipment_number}/events`, { method: "POST", headers: h, body: JSON.stringify({ status: "DELIVERED" }) });
    const r4 = await fetch(`${BASE}/api/partner/v1/shipments`, { headers: { Authorization: "Bearer cang_bad_key" } });
    if (r1.status !== 201 || !j2.duplicate || r3.status !== 422 || r4.status !== 401) throw new Error(`statuses ${r1.status} ${r2.status}/${j2.duplicate} ${r3.status} ${r4.status}`);
    const detail = await (await fetch(`${BASE}/api/partner/v1/shipments/${sea.shipment_number}`, { headers: h })).json();
    return `${sea.shipment_number} → ${detail.data.status}; retry duplicate; missing receiver 422; bad key 401`;
  });

  // ---------- Carrier webhook (GHN) on the demo truckload ----------
  await step("partner: GHN tracking number + webhook token → carrier events move the shipment and the order", async () => {
    // test data hygiene: put the seeded demo truckload (Hoang Gia LED order) back to "booked, in production"
    const [seeded] = await q(`select id, order_id from shipments where notes like 'Truckload Binh Duong%' limit 1`);
    if (seeded) {
      await q(`delete from shipment_events where shipment_id=$1 and not (source='manual' and status='BOOKED')`, [seeded.id]);
      await q(`update shipments set status='BOOKED', tracking_number=null, carrier_code='OTHER', exception_reason=null, actual_departure=null, actual_arrival=null, delivered_at=null, receiver_name=null, pod_url=null where id=$1`, [seeded.id]);
      await q(`update orders set status_code='PRODUCTION' where id=$1`, [seeded.order_id]);
    }
    const [demo] = await q(`select s.id, s.shipment_number, s.order_id from shipments s join logistics_providers p on p.id=s.provider_id where p.code='SAIGON_FREIGHT' and s.mode='ROAD' and s.status in ('BOOKED','READY_TO_PICK') and s.id<>$1 limit 1`, [shipmentId]);
    if (!demo) return "skipped (no demo truckload waiting)";
    const tracking = `GHN${stamp.toUpperCase()}`;
    await partner.page.goto(`${BASE}/en/partner/shipments/${demo.id}`);
    await dialog(partner.page, /Tracking number/, async (dlg) => {
      await dlg.locator("#tr-carrier").selectOption("GHN");
      await dlg.locator("#tr-number").fill(tracking);
    }, /Save/);
    await partner.page.goto(`${BASE}/en/partner/integrations`);
    await partner.page.getByRole("button", { name: /Create webhook token|Rotate token/ }).click();
    await partner.page.getByText(/token=[A-Za-z0-9_-]{20,}/).first().waitFor({ timeout: 15000 });
    const url = (await partner.page.locator("code").allInnerTexts()).find((t) => t.includes("/webhooks/ghn/"));
    const hook = url.replace(/^https?:\/\/[^/]+/, BASE);
    const post = (body) => fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const t0 = Date.now();
    const a = await post({ OrderCode: tracking, Status: "picked", Time: new Date(t0 - 3600e3).toISOString(), Type: "Switch_status" });
    const b = await post({ OrderCode: tracking, Status: "delivering", Time: new Date(t0 - 1800e3).toISOString(), Type: "Switch_status" });
    const b2 = await post({ OrderCode: tracking, Status: "delivering", Time: new Date(t0 - 1800e3).toISOString(), Type: "Switch_status" });
    const c = await post({ OrderCode: tracking, Status: "delivered", Time: new Date(t0 - 60e3).toISOString(), Type: "Switch_status" });
    const bad = await fetch(hook.replace(/token=[^&]+/, "token=wrong"), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const [sh] = await q(`select status from shipments where id=$1`, [demo.id]);
    const [o] = await q(`select status_code from orders where id=$1`, [demo.order_id]);
    if (a.body.applied !== 1 || b.body.applied !== 1 || b2.body.applied !== 0 || c.body.applied !== 1 || bad.status !== 401 || sh.status !== "DELIVERED") throw new Error(JSON.stringify({ a, b, b2, c, bad: bad.status, sh, o }));
    return `${demo.shipment_number}: picked → delivering → delivered (dup ignored, bad token 401); order ${o.status_code}`;
  });

  // ---------- Onboarding: new supplier ----------
  const sellerEmail = `cjm.seller.${stamp}@example.com`;
  const newSeller = await session("new-seller");
  let newProductId;
  await step("new supplier: registers, lands on the dashboard, publishes a product", async () => {
    await newSeller.page.goto(`${BASE}/en/register?type=seller`);
    await newSeller.page.fill("#name", "Phạm Thu Hà");
    await newSeller.page.fill("#email", sellerEmail);
    await newSeller.page.fill("#companyName", `CJM Bags Factory ${stamp}`);
    await newSeller.page.fill("#password", "Password123!");
    await newSeller.page.fill("#confirmPassword", "Password123!");
    await newSeller.page.check("input[name=acceptTerms]");
    await clickAndWait(newSeller.page, newSeller.page.locator("button[type=submit]"), /\/seller(\?|$)/);
    await newSeller.page.goto(`${BASE}/en/seller/products/new`, { waitUntil: "networkidle" });
    const [cat] = await q(`select id from product_categories where level=1 and is_active limit 1`);
    await newSeller.page.fill("#title", `Canvas tote bag 12 oz, custom print (${stamp})`);
    await newSeller.page.selectOption("#categoryId", cat.id);
    await newSeller.page.fill("#description", "12 oz cotton canvas tote, 38×42 cm, 60 cm handles, screen print up to 4 colours. OEM welcome.");
    await newSeller.page.selectOption("#priceType", "FIXED");
    await newSeller.page.fill("#basePrice", "1.85");
    await newSeller.page.fill("#moq", "500");
    await newSeller.page.fill("#leadTimeDays", "25");
    const img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await newSeller.page.locator("input[type=file]").first().setInputFiles({ name: "tote.png", mimeType: "image/png", buffer: img });
    await newSeller.page.waitForTimeout(2500);
    await clickAndWait(newSeller.page, newSeller.page.getByRole("button", { name: "Save & publish" }), /\/seller\/products(\/(?!new)[a-z0-9]+)?(\?|$)/);
    const [prod] = await q(`select p.id, p.status from products p join companies c on c.id=p.company_id join company_members m on m.company_id=c.id join users u on u.id=m.user_id where u.email=$1 order by p.created_at desc limit 1`, [sellerEmail]);
    newProductId = prod.id;
    return prod.status;
  });
  await step("admin: approves the new product → live on the marketplace", async () => {
    const [before] = await q(`select status, slug from products where id=$1`, [newProductId]);
    if (before.status === "PENDING_REVIEW") {
      await admin.page.goto(`${BASE}/en/admin/products/${newProductId}`);
      await dialog(admin.page, /^Approve/, async () => {}, /Approve/).catch(async () => {
        await admin.page.goto(`${BASE}/en/admin/products?tab=pending`);
        await admin.page.getByRole("button", { name: "Approve" }).first().click();
      });
    }
    const [after] = await q(`select status, slug from products where id=$1`, [newProductId]);
    const res = await fetch(`${BASE}/en/product/${after.slug}`);
    if (after.status !== "ACTIVE" || res.status !== 200) throw new Error(`${before.status}→${after.status}, page ${res.status}`);
    return `${before.status} → ${after.status}`;
  });

  // ---------- Onboarding: new logistics partner ----------
  const partnerEmail = `cjm.partner.${stamp}@example.com`;
  const newPartner = await session("new-partner");
  await step("new logistics partner: registers → portal shows 'waiting for approval'", async () => {
    await newPartner.page.goto(`${BASE}/en/register?type=logistics`);
    await newPartner.page.fill("#name", "Đỗ Minh Khoa");
    await newPartner.page.fill("#email", partnerEmail);
    await newPartner.page.fill("#companyName", `CJM Express ${stamp}`);
    await newPartner.page.fill("#password", "Password123!");
    await newPartner.page.fill("#confirmPassword", "Password123!");
    await newPartner.page.check("input[name=acceptTerms]");
    await clickAndWait(newPartner.page, newPartner.page.locator("button[type=submit]"), /\/partner(\?|$)/);
    const text = await newPartner.page.locator("main").innerText();
    if (!text.includes("Waiting for CANG approval")) throw new Error("no pending notice");
    await newPartner.page.goto(`${BASE}/en/partner/profile`);
    await newPartner.page.locator("input[value='LAST_MILE']").check();
    await newPartner.page.locator("input[value='COURIER']").check();
    await newPartner.page.getByRole("button", { name: "Save profile" }).click();
    await newPartner.page.waitForTimeout(1500);
    const [p] = await q(`select p.code, p.is_active, p.services from logistics_providers p join companies c on c.id=p.company_id join company_members m on m.company_id=c.id join users u on u.id=m.user_id where u.email=$1`, [partnerEmail]);
    if (!p || p.is_active) throw new Error(JSON.stringify(p));
    return `${p.code} pending, services ${p.services}`;
  });
  await step("admin: approves the partner → it can be assigned; partner notified", async () => {
    const [p] = await q(`select p.id, p.code from logistics_providers p join companies c on c.id=p.company_id join company_members m on m.company_id=c.id join users u on u.id=m.user_id where u.email=$1`, [partnerEmail]);
    await admin.page.goto(`${BASE}/en/admin/logistics?tab=providers`);
    const row = admin.page.locator("tr", { hasText: p.code });
    await row.getByRole("button", { name: "Approve" }).click();
    await admin.page.waitForTimeout(1500);
    const [after] = await q(`select is_active from logistics_providers where id=$1`, [p.id]);
    const [n] = await q(`select count(*)::int n from notifications nt join users u on u.id=nt.user_id where u.email=$1 and nt.link='/partner'`, [partnerEmail]);
    if (!after.is_active || n.n < 1) throw new Error(JSON.stringify({ after, n }));
    return "approved, notified";
  });
  await step("admin: re-assigns a shipment to another partner from Logistics", async () => {
    const [p] = await q(`select p.id, p.name from logistics_providers p join companies c on c.id=p.company_id join company_members m on m.company_id=c.id join users u on u.id=m.user_id where u.email=$1`, [partnerEmail]);
    const [s] = await q(`select id, shipment_number from shipments where status not in ('DELIVERED','CANCELLED') order by created_at limit 1`);
    if (!s) return "skipped";
    await admin.page.goto(`${BASE}/en/admin/logistics?tab=shipments`);
    const row = admin.page.locator("tr", { hasText: s.shipment_number });
    await row.getByRole("button", { name: "Partner" }).click();
    const dlg = admin.page.getByRole("dialog");
    await dlg.locator("#assign-provider").selectOption(p.id);
    await dlg.getByRole("button", { name: "Save" }).click();
    await closed(admin.page, "assign dialog");
    const [after] = await q(`select provider_id from shipments where id=$1`, [s.id]);
    if (after.provider_id !== p.id) throw new Error("not reassigned");
    await newPartner.page.goto(`${BASE}/en/partner/shipments?tab=all`);
    await newPartner.page.getByRole("link", { name: s.shipment_number }).first().waitFor();
    return `${s.shipment_number} → ${p.name}`;
  });
} catch (e) {
  // fallthrough to report
} finally {
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} steps passed`);
  console.log("problems:", problems.length);
  for (const p of problems.slice(0, 40)) console.log(" -", p);
  await browser.close();
  await DB.end();
  console.log(JSON.stringify({ rfqId, quotationId, orderId, shipmentId, buyerEmail }));
}

/**
 * Link audit: crawls the site as a visitor, buyer, supplier, admin and logistics partner, requests every
 * internal href it finds and reports targets that are not 200, signed-in links that bounce to /login,
 * and pages that fail to load. Writes the full link map (text → target) to OUT as JSON.
 *
 * Run against a production build with the demo seed: `node e2e/link-audit.mjs`.
 * Env: BASE (default http://localhost:3216), OUT, ONLY=anon,buyer,…, MAX_PAGES, PER_PATTERN, PW_CHROMIUM.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3216";
const OUT = process.env.OUT ?? "test-results/links.json";
const ROLES = [
  { name: "anon", start: ["/en", "/vi"] },
  { name: "buyer", email: "buyer@nordwind-outdoor.de", password: "Password123!", start: ["/en/buyer"] },
  { name: "seller", email: "sales@saigonpack.vn", password: "Password123!", start: ["/en/seller"] },
  { name: "admin", email: "admin@cang.vn", password: "Admin123!", start: ["/en/admin"] },
  { name: "partner", email: "ops@saigonfreight.vn", password: "Password123!", start: ["/en/partner"] },
  ...(process.env.EXTRA_ROLE ? [JSON.parse(process.env.EXTRA_ROLE)] : []),
].filter((r) => !process.env.ONLY || process.env.ONLY.split(",").includes(r.name));
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 260);
const PER_PATTERN = Number(process.env.PER_PATTERN ?? 3);

const skip = (u) => /\/logout|\/api\/auth|\/api\/files|mailto:|tel:|\/_next\//.test(u);
function pattern(u) {
  const url = new URL(u);
  let p = url.pathname
    .replace(/^\/(en|vi)(?=\/|$)/, "/:l")
    .split("/")
    .map((seg, i, all) => {
      if (/^[a-z0-9]{20,}$/i.test(seg) || /^[0-9a-f-]{32,}$/i.test(seg)) return ":id";
      const parent = all[i - 1];
      if (["product", "supplier", "guides", "legal", "clusters", "rfq", "invite"].includes(parent) && seg !== "new") return ":slug";
      if (parent === "manufacturers" || parent === "products") return ":slug";
      if (all[i - 2] === "manufacturers") return ":slug";
      return seg;
    })
    .join("/");
  const q = [...url.searchParams.keys()].sort().join("&");
  return q ? `${p}?${q}` : p;
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const report = { links: [], pages: [], errors: [] };

for (const role of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  if (role.email) {
    await page.goto(`${BASE}/en/login`);
    await page.fill("#email", role.email);
    await page.fill("#password", role.password);
    await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 }), page.click("button[type=submit]")]);
  }
  const seen = new Set();
  const patternCount = new Map();
  const status = new Map();
  const queue = role.start.map((p) => BASE + p);
  let crawled = 0;
  async function check(u) {
    if (status.has(u)) return status.get(u);
    let res = { code: 0, final: u };
    try {
      const r = await ctx.request.get(u, { maxRedirects: 5, timeout: 30000 });
      res = { code: r.status(), final: r.url() };
    } catch (e) {
      res = { code: -1, final: String(e).slice(0, 120) };
    }
    status.set(u, res);
    return res;
  }
  while (queue.length && crawled < MAX_PAGES) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const pat = pattern(u);
    const n = patternCount.get(pat) ?? 0;
    if (n >= PER_PATTERN) continue;
    patternCount.set(pat, n + 1);
    crawled++;
    let resp;
    try {
      resp = await page.goto(u, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e) {
      report.errors.push({ role: role.name, url: u, error: String(e).slice(0, 200) });
      continue;
    }
    const finalUrl = page.url();
    report.pages.push({ role: role.name, url: u, status: resp?.status() ?? 0, final: finalUrl });
    if (!finalUrl.startsWith(BASE)) continue;
    const grab = () =>
      page.$$eval("a[href]", (as) =>
        as.map((a) => ({
          href: a.href,
          text: (a.innerText || a.getAttribute("aria-label") || a.getAttribute("title") || a.querySelector("img")?.alt || "").replace(/\s+/g, " ").trim().slice(0, 80),
          inNav: !!a.closest("header, nav, footer, aside"),
        })),
      );
    let anchors;
    try {
      anchors = await grab();
    } catch {
      report.errors.push({ role: role.name, url: u, error: `client-side navigation to ${page.url()}` });
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      anchors = await grab().catch(() => []);
    }
    for (const a of anchors) {
      if (!a.href.startsWith(BASE) || skip(a.href)) continue;
      const href = a.href.split("#")[0];
      const res = await check(href);
      report.links.push({ role: role.name, from: pattern(finalUrl), fromUrl: finalUrl, text: a.text, href, pattern: pattern(href), code: res.code, final: res.final, inNav: a.inNav });
      if (!seen.has(href) && res.code === 200) queue.push(href);
    }
  }
  console.log(role.name, "crawled", crawled, "unique targets", status.size);
  await ctx.close();
}
await browser.close();
fs.mkdirSync(OUT.replace(/\/[^/]*$/, "") || ".", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report));
const bad = report.links.filter((l) => l.code !== 200);
const uniqBad = [...new Map(bad.map((l) => [`${l.role} ${l.href}`, l])).values()];
console.log("broken/non-200 targets:", uniqBad.length);
for (const l of uniqBad.slice(0, 80)) console.log(l.role, l.code, l.href.replace(BASE, ""), "←", l.from, `"${l.text}"`);
const loginBounce = report.links.filter((l) => l.role !== "anon" && /\/login/.test(l.final));
console.log("logged-in links bouncing to login:", new Set(loginBounce.map((l) => l.href)).size);
console.log("page errors:", report.errors.length);

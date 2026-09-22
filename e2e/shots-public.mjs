import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS ?? "/tmp/claude-0/-home-claude/346c916b-5466-575b-adaa-ddaf8337ffa5/scratchpad/shots";
const BASE = process.env.BASE ?? "http://localhost:3001";
mkdirSync(OUT, { recursive: true });

/** The public routes this worktree owns; `SUBSET=1` limits the run to the ones flagged `key`. */
const routes = [
  ["home", "/en", true],
  ["products", "/en/products", true],
  ["category", "/en/products/bags-luggage", true],
  ["product", "/en/product/trailridge-35l-recycled-hiking-backpack", true],
  ["manufacturers", "/en/manufacturers", true],
  ["industry-province", "/en/manufacturers/apparel/ho-chi-minh-city", true],
  ["supplier", "/en/supplier/saigon-pack-manufacturing", true],
  ["clusters", "/en/clusters"],
  ["cluster", "/en/clusters/binh-duong", true],
  ["rfq", "/en/rfq", true],
  ["rfq-new", "/en/rfq/new"],
  ["search", "/en/search?q=backpack", true],
  ["search-suppliers", "/en/search?q=backpack&type=suppliers"],
  ["pricing", "/en/pricing", true],
  ["trade-assurance", "/en/trade-assurance", true],
  ["logistics", "/en/logistics"],
  ["financing", "/en/financing"],
  ["inspection", "/en/inspection"],
  ["guides", "/en/guides"],
  ["guide", "/en/guides/buyer-guide"],
  ["contact", "/en/contact"],
  ["about", "/en/about"],
  ["help", "/en/help"],
  ["legal", "/en/legal/terms"],
  ["why-vietnam", "/en/why-vietnam"],
  ["home-vi", "/vi", true],
  ["cluster-vi", "/vi/clusters/binh-duong"],
  ["pricing-vi", "/vi/pricing"],
];

const selected = process.env.SUBSET ? routes.filter((r) => r[2]) : routes;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const problems = [];

for (const [width, tag] of [
  [1440, "desktop"],
  [390, "mobile"],
]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  // loremflickr is unreachable from the sandbox — drop remote images so the run does not wait on them.
  await page.route("**://*.loremflickr.com/**", (r) => r.abort());
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  for (const [name, path] of selected) {
    consoleErrors.length = 0;
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => ({ status: () => `ERR ${e.message}` }));
    const status = typeof res?.status === "function" ? res.status() : "?";
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
    if (overflow.scrollW > overflow.clientW + 1) problems.push(`${tag} ${path}: h-overflow ${overflow.scrollW}>${overflow.clientW}`);
    if (status !== 200) problems.push(`${tag} ${path}: status ${status}`);
    const real = consoleErrors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_FAILED|ERR_BLOCKED|net::/.test(e));
    if (real.length) problems.push(`${tag} ${path}: console ${real.slice(0, 2).join(" | ").slice(0, 220)}`);
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
    process.stdout.write(`${tag} ${status} ${path}\n`);
  }
  await page.close();
}

await browser.close();
process.stdout.write("\n--- PROBLEMS ---\n" + (problems.length ? problems.join("\n") : "none") + "\n");

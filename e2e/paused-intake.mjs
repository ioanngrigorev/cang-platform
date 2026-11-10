import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const p = await browser.newPage();
  for (const [locale, needle] of [['en', 'not accepting new applications'], ['vi', 'tạm ngừng tiếp nhận']]) {
    for (const path of ['', '/contact', '/register', '/rfq/new']) {
      const r = await p.goto('http://localhost:3220/' + locale + path);
      assert.equal(r.status(), 200);
      assert.ok((await p.locator('#mvp-intake-notice').innerText()).includes(needle));
      if (path) assert.equal(await p.locator('input[type=password],textarea[name=message]').count(), 0);
    }
    await p.goto('http://localhost:3220/' + locale + '/login');
    assert.ok(await p.locator('input[type=password]').isVisible());
  }
} finally { await browser.close(); }

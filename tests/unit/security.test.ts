import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeHtml, renderMarkdown } from '../../src/modules/content/markdown';
import { platformCan, memberCan } from '../../src/modules/auth/rbac';
import { rateLimit } from '../../src/lib/rate-limit';

test('CMS rejects encoded, unquoted and control-character executable URLs', () => {
  for (const html of ['<a href=javascript:alert(1)>x</a>', '<a href="java&#x73;cript:alert(1)">x</a>', '<a href="java&#10;script:alert(1)">x</a>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)></svg>', '<iframe src="https://example.com"></iframe>']) {
    const clean = sanitizeHtml(html);
    assert.doesNotMatch(clean, /javascript|onerror|onload|iframe|svg/i);
  }
  assert.match(renderMarkdown('[Safe](https://example.com)\n\n## Heading'), /href="https:\/\/example.com"/);
  assert.match(renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |'), /<table>/);
});

test('platform and company permission boundaries are separate', () => {
  assert.equal(platformCan('USER', 'admin.payments.write'), false);
  assert.equal(platformCan('SUPPORT', 'admin.payments.write'), false);
  assert.equal(platformCan('FINANCE', 'admin.payments.write'), true);
  assert.equal(memberCan('VIEWER', 'orders.write'), false);
  assert.equal(memberCan('STAFF', 'shipments.update'), true);
  assert.equal(memberCan('missing-role', 'products.write'), false);
});

test('rate limit counts concurrent hits atomically', async () => {
  const results = await Promise.all(Array.from({length: 12}, () => rateLimit(`test-${process.pid}`, {limit: 5, windowMs: 1000})));
  assert.equal(results.filter(r => r.allowed).length, 5);
});

/** Local-only regression: password change revokes other browser sessions. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import pg from 'pg';
import bcrypt from 'bcryptjs';
const database = new URL(process.env.DATABASE_URL);
const base = process.env.BASE ?? 'http://localhost:3216';
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && database.pathname.endsWith('_test'));
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const pool = new pg.Pool({ connectionString: database.href });
const id = randomUUID();
const companyId = randomUUID();
const email = `session-${id}@example.com`;
const password = 'LocalRegression123!';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
try {
  await pool.query('INSERT INTO users (id,email,name,password_hash) VALUES ($1,$2,$3,$4)', [id,email,'Session regression',await bcrypt.hash(password,12)]);
  await pool.query("INSERT INTO companies (id,slug,name,is_buyer,status) VALUES ($1,$2,'Security regression',true,'ACTIVE')",[companyId,`security-${companyId}`]);
  await pool.query("INSERT INTO company_members (id,company_id,user_id,role) VALUES ($1,$2,$3,'OWNER')",[randomUUID(),companyId,id]);
  const pages = [];
  for (let i=0;i<2;i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${base}/en/login`, {waitUntil:'networkidle'});
    await page.fill('#email',email);
    await page.fill('#password',password);
    await Promise.all([page.waitForURL(u=>!u.pathname.endsWith('/login')),page.click('button[type=submit]')]);
    pages.push(page);
  }
  assert.equal(Number((await pool.query('SELECT count(*) FROM sessions WHERE user_id=$1',[id])).rows[0].count),2);
  await pages[0].goto(`${base}/en/buyer/settings`,{waitUntil:'networkidle'});
  await pages[0].fill('#currentPassword',password);
  await pages[0].fill('#password','ChangedRegression123!');
  await pages[0].fill('#confirmPassword','ChangedRegression123!');
  await pages[0].locator('form').filter({has:pages[0].locator('#currentPassword')}).locator('button[type=submit]').click();
  await pages[0].getByText('Password updated.',{exact:true}).waitFor();
  assert.equal(Number((await pool.query('SELECT count(*) FROM sessions WHERE user_id=$1',[id])).rows[0].count),1);
  await pages[1].goto(`${base}/en/buyer/settings`,{waitUntil:'networkidle'});
  assert.ok(new URL(pages[1].url()).pathname.endsWith('/login'));
  await pages[0].reload({waitUntil:'networkidle'});
  assert.ok(new URL(pages[0].url()).pathname.endsWith('/buyer/settings'));
  const upload = scope => pages[0].context().request.post(`${base}/api/uploads`,{multipart:{scope,file:{name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('regression')}}});
  assert.equal((await upload('cms')).status(),403);
  await pool.query("UPDATE companies SET status='BANNED' WHERE id=$1",[companyId]);
  assert.equal((await upload('product')).status(),403);
  await pages[0].reload({waitUntil:'networkidle'});
  assert.ok(new URL(pages[0].url()).pathname.endsWith('/onboarding'));
  console.log('PASS: CMS uploads require admin permission; banned company loses upload and dashboard access');
  console.log('PASS: password change revokes the other session and keeps the current browser signed in');
} finally {
  await browser.close();
  await pool.query('DELETE FROM companies WHERE id=$1',[companyId]);
  await pool.query('DELETE FROM audit_logs WHERE actor_id=$1',[id]);
  await pool.query('DELETE FROM users WHERE id=$1',[id]);
  await pool.end();
}

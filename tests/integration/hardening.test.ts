import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq, and } from 'drizzle-orm';
import { db, pool } from '../../src/db';
import { payments, paymentTransactions, plans, feeRules, paymentProviders, quotations, orders, companyMembers, companies, apiKeys, logisticsProviders, rfqs, quotationItems } from '../../src/db/schema';
import { confirmPayment, refundPayment, releasePayment } from '../../src/modules/payments/service';
import { chooseProvider } from '../../src/modules/payments/registry';
import { seedPlatform } from '../../src/db/seed/platform';
import { createOrderFromQuotation } from '../../src/modules/orders/service';
import { authenticatePartnerApi } from '../../src/modules/partner/api-auth';
import { sha256 } from '../../src/modules/auth/session';

const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['localhost','127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Use a dedicated local database ending in _test');
after(() => pool.end());
let n = 0;
async function payment(status: 'PAID' | 'PENDING' = 'PAID', escrowStatus: 'HELD' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE') {
  const [p] = await db.insert(payments).values({paymentNumber:`TEST-${Date.now()}-${n++}`,amount:100,status,escrowStatus}).returning();
  return p;
}

test('refunds reject invalid amounts and preserve a refundable remainder', async () => {
  const p=await payment();
  for(const amount of [150,0,-1,Number.NaN,Number.POSITIVE_INFINITY,0.00001]) await assert.rejects(refundPayment(p.id,null,amount,'Test refund'));
  await refundPayment(p.id,null,25,'Partial refund');
  let [row]=await db.select().from(payments).where(eq(payments.id,p.id));
  assert.equal(row.status,'PAID');
  assert.equal(row.metadata?.refundedAmount,25);
  await refundPayment(p.id,null,undefined,'Refund remaining');
  [row]=await db.select().from(payments).where(eq(payments.id,p.id));
  assert.equal(row.status,'REFUNDED');
  const txs=await db.select().from(paymentTransactions).where(eq(paymentTransactions.paymentId,p.id));
  assert.deepEqual(txs.map(t=>t.amount).sort((a,b)=>a-b),[25,75]);
});

test('simultaneous refunds cannot exceed the original payment', async () => {
  const p=await payment();
  const result=await Promise.allSettled([refundPayment(p.id,null,75,'First'),refundPayment(p.id,null,75,'Second')]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
});

test('simultaneous confirmations create one capture', async () => {
  const p=await payment('PENDING');
  const results=await Promise.all(Array.from({length:4},()=>confirmPayment(p.id,{source:'admin'})));
  for(const result of results) { assert.equal(result.status,'PAID'); assert.ok(result.paidAt); }
  const txs=await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.paymentId,p.id),eq(paymentTransactions.type,'CAPTURE')));
  assert.equal(txs.length,1);
});

test('release only transfers the remaining balance once', async () => {
  const p=await payment('PAID','HELD');
  await refundPayment(p.id,null,25,'Partial refund');
  await Promise.all([releasePayment(p.id,null,'Delivered'),releasePayment(p.id,null,'Retry')]);
  const txs=await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.paymentId,p.id),eq(paymentTransactions.type,'RELEASE')));
  assert.equal(txs.length,1);assert.equal(txs[0].amount,75);
});

test('seed preserves operator prices, commissions and disabled providers', async () => {
  const [plan]=await db.select().from(plans).limit(1);
  const [fee]=await db.select().from(feeRules).limit(1);
  const [provider]=await db.select().from(paymentProviders).limit(1);
  try {
    await db.update(plans).set({priceMonthly:9876}).where(eq(plans.id,plan.id));
    await db.update(feeRules).set({value:17}).where(eq(feeRules.id,fee.id));
    await db.update(paymentProviders).set({isActive:false}).where(eq(paymentProviders.id,provider.id));
    await seedPlatform(db);
    assert.equal((await db.select().from(plans).where(eq(plans.id,plan.id)))[0].priceMonthly,9876);
    assert.equal((await db.select().from(feeRules).where(eq(feeRules.id,fee.id)))[0].value,17);
    assert.equal((await db.select().from(paymentProviders).where(eq(paymentProviders.id,provider.id)))[0].isActive,false);
  } finally {
    await db.update(plans).set({priceMonthly:plan.priceMonthly}).where(eq(plans.id,plan.id));
    await db.update(feeRules).set({value:fee.value}).where(eq(feeRules.id,fee.id));
    await db.update(paymentProviders).set({isActive:provider.isActive}).where(eq(paymentProviders.id,provider.id));
  }
});

test('provider selection does not fall back to incompatible currency/escrow', async () => {
  assert.equal(await chooseProvider({currency:'UNSUPPORTED',escrow:true}),null);
});

test('concurrent acceptance returns one order and one payment schedule', async () => {
  const source=await db.query.quotations.findFirst({with:{rfq:true,items:true}});
  assert.ok(source,'Seed must supply a quotation');
  const {id: _rfqId, ...rfqValues}=source.rfq;
  const [rfq]=await db.insert(rfqs).values({...rfqValues,rfqNumber:`TEST-RFQ-${Date.now()}`,status:'OPEN',awardedQuotationId:null}).returning();
  const {id: _quotationId,rfq: _rfq,items,...quoteValues}=source;
  const [quotation]=await db.insert(quotations).values({...quoteValues,rfqId:rfq.id,quotationNumber:`TEST-Q-${Date.now()}`,status:'SUBMITTED'}).returning();
  for(const {id: _itemId,...item} of items) await db.insert(quotationItems).values({...item,quotationId:quotation.id});
  const [member]=await db.select().from(companyMembers).where(eq(companyMembers.companyId,rfq.buyerCompanyId)).limit(1);
  const input={quotationId:quotation.id,actorUserId:member.userId,buyerCompanyId:rfq.buyerCompanyId};
  const results=await Promise.all([createOrderFromQuotation(input),createOrderFromQuotation(input)]);
  assert.equal(results[0].id,results[1].id);
  const rows=await db.select().from(orders).where(eq(orders.quotationId,quotation.id));
  assert.equal(rows.length,1);
  const schedule=await db.select().from(payments).where(eq(payments.orderId,rows[0].id));
  assert.equal(schedule.length,2);
});

test('a banned partner loses API access even with an active provider/key', async () => {
  const [provider]=await db.select().from(logisticsProviders).where(eq(logisticsProviders.code,'SAIGON_FREIGHT')).limit(1);
  assert.ok(provider.companyId);
  const [company]=await db.select().from(companies).where(eq(companies.id,provider.companyId));
  const [member]=await db.select().from(companyMembers).where(eq(companyMembers.companyId,company.id)).limit(1);
  const key=`cang_test_${Date.now()}`;
  const [apiKey]=await db.insert(apiKeys).values({companyId:company.id,createdById:member.userId,name:'Local regression',keyHash:sha256(key),prefix:key.slice(0,12),scopes:['shipments:read']}).returning();
  try {
    await db.update(companies).set({status:'BANNED'}).where(eq(companies.id,company.id));
    const result=await authenticatePartnerApi(new Request('http://localhost/api/partner/v1/shipments',{headers:{authorization:`Bearer ${key}`}}),'shipments:read');
    assert.ok(result instanceof Response);assert.ok([401,403].includes(result.status));
  } finally {
    await db.update(companies).set({status:company.status}).where(eq(companies.id,company.id));
    await db.delete(apiKeys).where(eq(apiKeys.id,apiKey.id));
  }
});

test('Redis shares rate limits across separate application processes', {skip: !process.env.TEST_REDIS_URL}, async () => {
  const { execFileSync } = await import('node:child_process');
  const key=`redis-integration-${Date.now()}`;
  const run=()=>JSON.parse(execFileSync(process.execPath,['--import','tsx','-e',`const { rateLimit } = require('./src/lib/rate-limit.ts'); rateLimit('${key}',{limit:1,windowMs:10000}).then(r=>{console.log(JSON.stringify(r));process.exit(0)}).catch(()=>process.exit(1));`],{encoding:'utf8',env:{...process.env,REDIS_URL:process.env.TEST_REDIS_URL},timeout:10000}));
  assert.equal(run().allowed,true);
  assert.equal(run().allowed,false);
});

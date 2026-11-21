import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin } from '../lib/staff/admin/pin.ts';
import { summarizeTickets, summarizeSumUp } from '../lib/staff/admin/finance.ts';

const valuation = { drinkCents:1500, bottles:{}, clubPerGuest:{} };
function order(overrides = {}) {
  return { id:'or_test', status:'completed', total:9700, currency:{code:'EUR',base_multiplier:100},
    line_items:[{type:'ticket',description:'Premium - 2 Guests · incl. 2 Drinks',quantity:1,value:9400,booking_fee:300,total:9700,
      event_summary:{event_id:'ev_test',name:'Concert',start_date:'2026-12-05T21:30:00+01:00'}}],
    transactions:[{type:'payment',amount:9700,currency:'EUR',pending:false,created_at:'2026-11-20T20:00:00Z',payment_method:'STRIPE'}], ...overrides };
}
test('PIN hashes are salted, require six digits and reject malformed input',()=>{
  const a=hashPin('123456'),b=hashPin('123456');
  assert.notEqual(a,b);assert.ok(verifyPin('123456',a));assert.equal(verifyPin('123455',a),false);
  for(const value of ['1234','1234567',null,{},'１２３４５６'])assert.equal(verifyPin(value,a),false);
  assert.equal(verifyPin('123456','not-a-hash'),false);
});
test('November cash and December event revenue are distinct, drinks are not added twice',()=>{
  const o=order();const nov=summarizeTickets([o],'2026-11',valuation),dec=summarizeTickets([o],'2026-12',valuation);
  assert.equal(nov.netPayments,9700);assert.equal(nov.nights.length,0);assert.equal(dec.netPayments,0);
  assert.equal(dec.nights[0].ticketCents,9400);assert.equal(dec.nights[0].includedCents,3000);
  assert.equal(dec.nights[0].admissionCents,6400);assert.equal(dec.nights[0].feeCents,300);
  assert.equal(dec.nights[0].upgradeCents,null);
});
test('unit value and fee multiply by quantity once; duplicate orders do not multiply totals',()=>{
  const o=order();o.line_items[0].quantity=2;o.line_items[0].total=19400;o.total=19400;o.transactions[0].amount=19400;
  const s=summarizeTickets([o,o],'2026-12',valuation);
  assert.equal(s.nights[0].ticketCents,18800);assert.equal(s.nights[0].guests,4);assert.equal(s.nights[0].includedCents,6000);
});
test('refund is attributed to its own payment month; event allocation is withheld',()=>{
  const o=order();o.transactions.push({...o.transactions[0],type:'refund',amount:2000,created_at:'2026-12-06T12:00:00Z'});
  assert.equal(summarizeTickets([o],'2026-11',valuation).netPayments,9700);
  const dec=summarizeTickets([o],'2026-12',valuation);
  assert.equal(dec.netPayments,-2000);assert.ok(dec.nights[0].uncertain);assert.equal(dec.eventIssues,1);
});
test('missing bottle values never become zero; configured VIP valuation isolates upgrade',()=>{
  const o=order();o.line_items[0].description='VIP Table - World Star VIP · 2 Guests · Moët & Chandon';
  const unknown=summarizeTickets([o],'2026-12',valuation).nights[0];assert.equal(unknown.includedCents,null);
  const known=summarizeTickets([o],'2026-12',{...valuation,bottles:{'Flasche Moët':4000},clubPerGuest:{ev_test:2100}}).nights[0];
  assert.equal(known.includedCents,4000);assert.equal(known.admissionCents,5400);assert.equal(known.upgradeCents,1200);
});
test('unreconciled totals, offline payments and pending funds are not reliable event revenue',()=>{
  for(const change of [o=>o.total++,o=>o.transactions[0].payment_method='OFFLINE',o=>o.transactions[0].pending=true]){
    const o=order();change(o);assert.ok(summarizeTickets([o],'2026-12',valuation).nights[0].uncertain);
  }
});
test('calendar month uses Berlin midnight, service night stays with previous evening',()=>{
  const row={transaction_id:'a',type:'PAYMENT',status:'SUCCESSFUL',timestamp:'2026-11-30T23:30:00Z',amount:10,currency:'EUR'};
  const nov=summarizeSumUp([row,row],'2026-11'),dec=summarizeSumUp([row],'2026-12');
  assert.equal(nov.netPayments,0);assert.equal(nov.nights['2026-11-30'],1000);assert.equal(dec.netPayments,1000);
});
test('SumUp refunds are deducted once; uncertain service allocation stays null',()=>{
  const rows=[{id:'a',type:'PAYMENT',status:'REFUNDED',timestamp:'2026-11-19T20:00:00Z',amount:50,currency:'EUR',refunded_amount:10},
    {id:'b',type:'REFUND',status:'SUCCESSFUL',timestamp:'2026-11-20T20:00:00Z',amount:-10,currency:'EUR'}];
  const s=summarizeSumUp(rows,'2026-11');assert.equal(s.payments-s.refunds,4000);assert.equal(s.netPayments,null);assert.equal(s.nights['2026-11-19'],null);
  assert.throws(()=>summarizeSumUp([{...rows[0],currency:'USD'}],'2026-11'));
});
test('mixed-event order assigns each line only to its event month',()=>{
  const o=order();o.line_items.push({...o.line_items[0],event_summary:{event_id:'ev_nov',name:'November',start_date:'2026-11-20T21:00:00+01:00'}});
  o.total=19400;o.transactions[0].amount=19400;
  const s=summarizeTickets([o],'2026-11',valuation);assert.equal(s.netPayments,19400);assert.equal(s.nights.length,1);assert.equal(s.nights[0].ticketCents,9400);
});

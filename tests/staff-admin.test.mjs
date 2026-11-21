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
  const o=order();o.transactions.push({...o.transactions[0],type:'refund',amount:-2000,created_at:'2026-12-06T12:00:00Z'});
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
test('signed Ticket Tailor v2 refunds reduce cash once and only in their refund month',()=>{
  const o=order();
  o.transactions.push({...o.transactions[0],type:'refund',amount:-1700});
  const s=summarizeTickets([o,o],'2026-11',valuation);
  assert.equal(s.payments,9700);assert.equal(s.refunds,1700);assert.equal(s.netPayments,8000);assert.equal(s.paymentIssues,0);
  o.transactions[1].amount=1700;
  assert.equal(summarizeTickets([o],'2026-11',valuation).netPayments,null);
  assert.equal(summarizeTickets([o],'2026-10',valuation).netPayments,0);
});
function sumupRefund() {
  const payment={id:'parent',type:'PAYMENT',status:'SUCCESSFUL',timestamp:'2026-10-31T22:30:00Z',amount:50,currency:'EUR',refunded_amount:10};
  const refund={...payment,type:'REFUND',status:'REFUNDED',timestamp:'2026-11-01T12:00:00Z',amount:10,refunded_amount:0};
  const event={id:99,transaction_id:'parent',type:'REFUND',status:'REFUNDED',timestamp:refund.timestamp,amount:10};
  const detail={id:'parent',currency:'EUR',timestamp:payment.timestamp,amount:50,events:[event]};
  return {payment,refund,event,detail};
}
test('SumUp reconciles separate refund rows against events, across calendar months',()=>{
  const {payment,refund,detail}=sumupRefund();
  const oct=summarizeSumUp([payment],'2026-10',[detail]);
  assert.equal(oct.netPayments,5000);assert.equal(oct.nights['2026-10-31'],4000);
  const nov=summarizeSumUp([refund,refund],'2026-11',[detail]);
  assert.equal(nov.netPayments,-1000);assert.equal(nov.refunds,1000);assert.deepEqual(nov.nights,{});
});
test('SumUp refund events and history are never double counted, including partial refunds',()=>{
  const {payment,refund,detail,event}=sumupRefund();
  payment.timestamp='2026-11-01T00:30:00Z';detail.timestamp=payment.timestamp;
  detail.events=[event,event];
  const result=summarizeSumUp([payment,payment,refund,refund],'2026-11',[detail]);
  assert.equal(result.payments,5000);assert.equal(result.refunds,1000);assert.equal(result.netPayments,4000);
  assert.equal(result.paymentIssues,0);assert.deepEqual(result.nights,{});
});
test('SumUp missing, mismatched or incomplete refund details do not produce trusted totals',()=>{
  const {payment,refund,detail}=sumupRefund();
  payment.timestamp='2026-11-01T20:00:00Z';detail.timestamp=payment.timestamp;
  for (const details of [[],[{...detail,id:'wrong'}],[{...detail,events:[]}],[{...detail,events:[{...detail.events[0],amount:9}]}]]) {
    const result=summarizeSumUp([payment,refund],'2026-11',details);
    assert.equal(result.netPayments,null);assert.ok(result.paymentIssues>0);
  }
});
test('two refunds on one payment keep their own dates and unique event IDs',()=>{
  const {payment,refund,detail,event}=sumupRefund();
  payment.refunded_amount=20;
  detail.events=[event,{...event,id:100,timestamp:'2026-12-01T12:00:00Z'}];
  assert.equal(summarizeSumUp([payment],'2026-10',[detail]).nights['2026-10-31'],3000);
  assert.equal(summarizeSumUp([refund],'2026-11',[detail]).netPayments,-1000);
  assert.equal(summarizeSumUp([{...refund,timestamp:'2026-12-01T12:00:00Z'}],'2026-12',[detail]).netPayments,-1000);
});
test('unvalued VIP bottles preserve the known drink portion and explicit missing quantities',()=>{
  const premium=order();
  const vip=order({id:'or_vip'});vip.line_items[0].description='VIP Table - 2 Guests · incl. 1 Bottle Crémant';
  vip.line_items[0].quantity=2;vip.line_items[0].total=19400;vip.total=19400;vip.transactions[0].amount=19400;
  const night=summarizeTickets([premium,vip],'2026-12',valuation).nights[0];
  assert.equal(night.includedDrinkCount,2);assert.equal(night.knownIncludedCents,3000);
  assert.equal(night.includedCents,null);assert.equal(night.admissionCents,null);assert.equal(night.upgradeCents,null);
  assert.deepEqual(night.unvaluedSupplies,[{label:'Flasche Crémant',quantity:2}]);
  assert.equal(night.ticketCents,28200);
});
test('valued bottles complete the included total without duplicating drink values',()=>{
  const premium=order(),vip=order({id:'or_vip'});vip.line_items[0].description='VIP Table - 2 Guests · incl. 1 Bottle Crémant';
  const night=summarizeTickets([premium,vip],'2026-12',{...valuation,bottles:{'Flasche Crémant':3000}}).nights[0];
  assert.equal(night.knownIncludedCents,6000);assert.equal(night.includedCents,6000);
  assert.equal(night.admissionCents,12800);assert.deepEqual(night.unvaluedSupplies,[]);
});
test('cancelled bookings are excluded from valid event packages but cash and refunds remain',()=>{
  const valid=order(),cancelled=order({id:'or_cancelled',status:'cancelled'});
  cancelled.line_items[0].type='void';
  cancelled.transactions.push({...cancelled.transactions[0],type:'refund',amount:-9400});
  const cash=summarizeTickets([valid,cancelled],'2026-11',valuation);
  assert.equal(cash.netPayments,10000);assert.equal(cash.refunds,9400);
  const events=summarizeTickets([valid,cancelled],'2026-12',valuation);
  assert.equal(events.excludedEventOrders,1);assert.equal(events.eventIssues,0);
  assert.equal(events.nights[0].ticketCents,9400);assert.equal(events.nights[0].addonCents,0);
});
test('cancelled credit bookings do not block unrelated valid event totals',()=>{
  const cancelled=order({status:'cancelled'});cancelled.line_items[0].type='void';
  const cash=summarizeTickets([cancelled],'2026-11',valuation);
  const events=summarizeTickets([cancelled],'2026-12',valuation);
  assert.equal(cash.netPayments,9700);assert.equal(events.excludedEventOrders,1);
  assert.equal(events.eventIssues,0);assert.deepEqual(events.nights,[]);
});
test('void lines in a completed order cannot become add-on revenue or included entitlements',()=>{
  const o=order();o.line_items.push({...o.line_items[0],type:'void'});o.total=19400;o.transactions[0].amount=19400;
  const night=summarizeTickets([o],'2026-12',valuation).nights[0];
  assert.equal(night.ticketCents,9400);assert.equal(night.addonCents,0);assert.equal(night.includedDrinkCount,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

globalThis.adminTest = { team:true, admin:false, configured:true, reads:0, unlocks:0, locks:0, checkCount:0 };
const state = globalThis.adminTest;
registerHooks({resolve(specifier, context, next) {
  const modules = {
    '@/lib/staff/admin/session': `const s=globalThis.adminTest; export const adminConfigured=()=>s.configured; export const hasAdminSession=async()=>{s.checkCount++;if(s.fail)throw Error('offline');return s.admin && !(s.expireAfterRead && s.reads);}; export const unlockAdmin=async()=>{s.unlocks++;return 'invalid'};export const lockAdmin=async()=>{s.locks++}`,
    '@/lib/staff/session': `export const hasSession=async()=>globalThis.adminTest.team`,
    '@/lib/staff/admin/dashboard-data': `export const readAdminEvening=async()=>{globalThis.adminTest.reads++;return {privateAmount:123}}; export const readAdminHistory=readAdminEvening;`,
    '@/lib/staff/admin/data': `export const readAdminSummary=async()=>{globalThis.adminTest.reads++;return {privateAmount:123}}`,
  };
  if(specifier in modules) return {url:'data:text/javascript,'+encodeURIComponent(modules[specifier]),shortCircuit:true};
  if(specifier==='@/lib/staff/admin/finance')return {url:new URL('../lib/staff/admin/finance.ts',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
const summary=await import('../app/api/staff/admin/summary/route.ts');
const session=await import('../app/api/staff/admin/session/route.ts');
const request=()=>new Request('https://staff.jazzkeller.com/api/staff/admin/summary?month=2026-06');

test('finance never loads for a team-only session; private/no-store even on denial',async()=>{
  state.admin=false;state.reads=0;
  const res=await summary.GET(request());assert.equal(res.status,401);assert.equal(state.reads,0);
  assert.match(res.headers.get('cache-control'),/private, no-store/);assert.deepEqual(await res.json(),{});
});
test('session backend failure denies finance rather than falling back to team access',async()=>{
  state.fail=true;state.admin=true;state.reads=0;
  const res=await summary.GET(request());assert.equal(res.status,503);assert.equal(state.reads,0);state.fail=false;
});
test('revocation during data load prevents the response containing financial data',async()=>{
  state.admin=true;state.expireAfterRead=true;state.reads=0;
  const res=await summary.GET(request());assert.equal(res.status,401);assert.equal(state.reads,1);assert.deepEqual(await res.json(),{});state.expireAfterRead=false;
});
test('admin endpoint accepts only valid month and valid separate session',async()=>{
  state.admin=true;state.reads=0;
  const invalid=await summary.GET(new Request('https://staff.jazzkeller.com/api/staff/admin/summary?month=2026-99'));
  assert.equal(invalid.status,400);assert.equal(state.reads,0);
  const ok=await summary.GET(request());assert.equal(ok.status,200);assert.equal(state.reads,1);
});
test('PIN endpoint rejects cross-origin requests and unauthenticated team users',async()=>{
  const req=(origin)=>new Request('https://staff.jazzkeller.com/api/staff/admin/session',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'unlock',pin:'000000'})});
  state.unlocks=0;assert.equal((await session.POST(req('https://other.example'))).status,403);
  state.team=false;assert.equal((await session.POST(req('https://staff.jazzkeller.com'))).status,401);assert.equal(state.unlocks,0);
  state.team=true;assert.equal((await session.POST(req('https://staff.jazzkeller.com'))).status,401);assert.equal(state.unlocks,1);
});

const evening=await import('../app/api/staff/admin/evening/route.ts');
const history=await import('../app/api/staff/admin/history/route.ts');
for(const [label,route] of [['evening',evening],['history',history]]) {
 test(label+' requires private admin authorization before AND after loading',async()=>{
  state.admin=false;state.reads=0;
  let res=await route.GET(new Request('https://staff.jazzkeller.com/api/staff/admin/'+label));
  assert.equal(res.status,401);assert.equal(state.reads,0);assert.match(res.headers.get('cache-control'),/private, no-store/);
  state.admin=true;state.expireAfterRead=true;
  res=await route.GET(new Request('https://staff.jazzkeller.com/api/staff/admin/'+label));
  assert.equal(res.status,401);assert.equal(state.reads,1);assert.deepEqual(await res.json(),{});
  state.expireAfterRead=false;state.reads=0;
  res=await route.GET(new Request('https://staff.jazzkeller.com/api/staff/admin/'+label));
  assert.equal(res.status,200);assert.equal(state.reads,1);
 });
}
test('history rejects malformed or future months before querying providers',async()=>{
 state.admin=true;state.reads=0;
 for(const before of ['2026-99','2099-01','1999-12','bad']) {
  const res=await history.GET(new Request('https://staff.jazzkeller.com/api/staff/admin/history?before='+before));
  assert.equal(res.status,400);
 }
 assert.equal(state.reads,0);
});

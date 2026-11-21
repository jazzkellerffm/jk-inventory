import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHistoryWindow,clearHistoryWindow,historyMonth} from '../lib/staff/admin/history-window.ts';
const signal=()=>new AbortController().signal;
const fixture=(first='2022-02')=>{
 const calls=[];
 const fetchPage=async before=>{
  calls.push(before);
  const months=Array.from({length:4},(_,i)=>historyMonth(before,-i)).filter(m=>first&&m>=first);
  return {firstMonth:first,asOf:1000,points:months.map(month=>({month,cents:month==='2026-09'?null:month==='2026-08'?-500:10000,partial:month==='2026-11'})),nextBefore:months.at(-1)>first?historyMonth(months.at(-1),-1):null};
 };return {calls,fetchPage};
};
test('loads only the visible twelve months, then reuses them without network reads',async()=>{
 const cache=new Map(),{calls,fetchPage}=fixture();
 const result=await loadHistoryWindow('2026-11',cache,signal(),fetchPage);
 assert.deepEqual(calls,['2026-11','2026-07','2026-03']);assert.equal(result.points.length,12);
 assert.equal(result.points[0].month,'2025-12');assert.equal(result.points.at(-1).month,'2026-11');
 assert.equal(result.points.at(-1).partial,true);assert.equal(result.points.find(p=>p.month==='2026-09').cents,null);
 assert.equal(result.points.find(p=>p.month==='2026-08').cents,-500);
 await loadHistoryWindow('2026-11',cache,signal(),fetchPage);assert.equal(calls.length,3);
 await loadHistoryWindow('2025-11',cache,signal(),fetchPage);assert.equal(calls.length,6);
 await loadHistoryWindow('2026-11',cache,signal(),fetchPage);assert.equal(calls.length,6);
 clearHistoryWindow('2026-11',cache);
 await loadHistoryWindow('2026-11',cache,signal(),fetchPage);assert.equal(calls.length,9);
 await loadHistoryWindow('2025-11',cache,signal(),fetchPage);assert.equal(calls.length,9);
});
test('stops at the first payment month, including a short final window and an empty account',async()=>{
 const a=fixture('2026-09');const result=await loadHistoryWindow('2026-11',new Map(),signal(),a.fetchPage);
 assert.deepEqual(result.points.map(p=>p.month),['2026-09','2026-10','2026-11']);assert.equal(a.calls.length,1);
 const b=fixture(null);const empty=await loadHistoryWindow('2026-11',new Map(),signal(),b.fetchPage);
 assert.equal(empty.firstMonth,null);assert.deepEqual(empty.points,[]);assert.equal(b.calls.length,1);
});
test('aborting a closed or locked view prevents late responses entering the cache or UI',async()=>{
 const controller=new AbortController(), cache=new Map();let finish,updates=0;
 const work=loadHistoryWindow('2026-11',cache,controller.signal,()=>new Promise(resolve=>finish=resolve),()=>updates++);
 controller.abort();finish(await fixture().fetchPage('2026-11'));
 await assert.rejects(work,{name:'AbortError'});assert.equal(cache.size,0);assert.equal(updates,0);
});
test('failed requests preserve earlier pages, resume from the missing page and reject cursor loops',async()=>{
 const cache=new Map(),f=fixture();let fail=true;
 const read=async month=>{if(month==='2026-07'&&fail)throw Error('offline');return f.fetchPage(month);};
 await assert.rejects(loadHistoryWindow('2026-11',cache,signal(),read),/offline/);assert.equal(cache.size,1);
 fail=false;await loadHistoryWindow('2026-11',cache,signal(),read);assert.deepEqual(f.calls,['2026-11','2026-07','2026-03']);
 await assert.rejects(loadHistoryWindow('2026-11',new Map(),signal(),async m=>({...await f.fetchPage(m),nextBefore:m})),/vollständig/);
});

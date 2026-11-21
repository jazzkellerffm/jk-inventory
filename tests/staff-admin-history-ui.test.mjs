import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
import {historyMonth} from '../lib/staff/admin/history-window.ts';

// Exercise the disclosure's actual handlers/effects without a browser dependency.
// This is a lifecycle regression check, not a visual or DOM integration test.
const hooks=`const h=()=>globalThis.historyUiHarness;
export const useState=initial=>{const m=h(),i=m.s++;if(!(i in m.state))m.state[i]=typeof initial==='function'?initial():initial;return [m.state[i],v=>{m.state[i]=typeof v==='function'?v(m.state[i]):v}];};
export const useRef=initial=>{const m=h(),i=m.r++;return m.refs[i]??(m.refs[i]={current:initial});};
export const useId=()=> 'history-test';
export const useEffect=(fn,deps)=>{const m=h(),i=m.e++,old=m.effects[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))m.pending.push(()=>{old?.cleanup?.();m.effects[i]={deps,cleanup:fn()};});};`;
registerHooks({resolve(s,c,next){
 if(s==='react'&&c.parentURL?.endsWith('/admin-dashboard.tsx'))return {url:'data:text/javascript,'+encodeURIComponent(hooks),shortCircuit:true};
 if(s.startsWith('@/'))s=process.cwd()+'/'+s.slice(2);
 if((s.startsWith('/')||s.startsWith('.'))&&c.parentURL?.startsWith('file:')){
  const u=new URL(s,c.parentURL);for(const ext of ['.tsx','.ts'])if(existsSync(u.pathname+ext))return {url:u.href+ext,shortCircuit:true};
 }return next(s,c);
},load(u,c,next){if(u.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(new URL(u),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};return next(u,c);}});
const {AdminHistorySection}=await import('../components/staff/admin-dashboard.tsx');
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));

test('history stays idle until opened; closing/reopening and returning to a loaded window reuse data',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 const m=globalThis.historyUiHarness={state:[],refs:[],effects:[],pending:[],s:0,r:0,e:0};
 globalThis.window={setTimeout,clearTimeout};const calls=[];let expired=0,fail=false,tree;
 const dispose=()=>m.effects.forEach(e=>e.cleanup?.());
 const onExpired=()=>{expired++;dispose();};
 const render=()=>{m.s=m.r=m.e=0;tree=AdminHistorySection({month:'2026-11',onExpired});m.pending.splice(0).forEach(fn=>fn());return tree;};
 const button=label=>find(tree,n=>n.type==='button'&&n.props['aria-label']===label);
 const toggle=()=>{find(tree,n=>n.props?.className==='admin-history-toggle').props.onClick();render();};
 globalThis.fetch=async url=>{
  const before=new URL(url,'https://example.invalid').searchParams.get('before');calls.push(before);
  if(fail)return new Response('{}',{status:401});
  const months=Array.from({length:4},(_,i)=>historyMonth(before,-i)).filter(m=>m>='2022-02');
  return new Response(JSON.stringify({firstMonth:'2022-02',asOf:1000,points:months.map(month=>({month,cents:10000,partial:month==='2026-11'})),nextBefore:months.at(-1)>'2022-02'?historyMonth(months.at(-1),-1):null}));
 };
 try{
  render();await tick();assert.equal(calls.length,0);assert.equal(find(tree,n=>n.props?.className==='admin-history-toggle').props['aria-expanded'],false);
  toggle();await tick();render();assert.equal(calls.length,3);assert.equal(button('Neuere zwölf Monate').props.disabled,true);
  toggle();await tick();render();assert.equal(calls.length,3);
  toggle();await tick();render();assert.equal(calls.length,3);
  button('Ältere zwölf Monate').props.onClick();render();await tick();render();assert.equal(calls.length,6);
  button('Neuere zwölf Monate').props.onClick();render();await tick();render();assert.equal(calls.length,6);
  fail=true;button('SumUp-Verlauf aktualisieren').props.onClick();render();await tick();assert.equal(expired,1);assert.equal(calls.length,7);
 }finally{dispose();globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;delete globalThis.historyUiHarness;}
});

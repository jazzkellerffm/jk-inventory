import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceCsv,csvPages} from '../lib/staff/service-csv.ts';
const event={id:'ev_1',name:'Jam',start:{date:'2026-11-18'}};
const ticket={id:'it_1',event_id:'ev_1',status:'valid',description:'Premium – 3 Guests',order_id:'or_1',full_name:'Gast'};
const order={id:'or_1',buyer_details:{name:'Müller'},line_items:[{type:'ticket',description:ticket.description,quantity:1,event_summary:{event_id:'ev_1'}},{type:'add_on',description:'Hummus Plate',quantity:2}]};
test('groups, multiple ticket types, partial cancellation and manual tickets',()=>{
 const csv=serviceCsv(event,[ticket,{...ticket,id:'it_2',description:'Club – 2 Guests'},{...ticket,id:'it_3',status:'voided'},{...ticket,id:'it_4',order_id:undefined}], [order]);
 assert.ok(csv.startsWith('\uFEFF'));assert.equal(csv.split('2 × Hummus Plate').length-1,1);
 assert.equal(csv.split('\r\n').length,5);assert.ok(!csv.includes('it_3'));assert.ok(csv.includes('Müller'));assert.ok(csv.includes('"3";""'));assert.ok(csv.includes('Gast'));
});
test('missing orders and unknown packages fail closed',()=>{
 assert.throws(()=>serviceCsv(event,[ticket],[]));
 assert.throws(()=>serviceCsv(event,[{...ticket,description:'Unknown'}],[order]));
});
test('all pages fetched and failed pages reject',async()=>{
 let calls=0;const request=async url=>{assert.ok(String(url).includes('/v2/orders?'));return new Response(JSON.stringify(++calls===1?{data:[{id:'a'}],links:{next:'?starting_after=a'}}:{data:[{id:'b'}],links:{next:null}}));};
 assert.equal((await csvPages('orders','ev_1','test',request)).length,2);assert.equal(calls,2);
 await assert.rejects(csvPages('orders','ev_1','test',async()=>new Response('',{status:503})));
});
test('ambiguous extras and duplicate tickets reject',()=>{
 assert.throws(()=>serviceCsv(event,[ticket,ticket],[order]));
 assert.throws(()=>serviceCsv(event,[ticket],[{...order,line_items:[...order.line_items,{type:'ticket',quantity:1,description:'Club',event_id:'ev_2'}]}]));
});

test('Crémant group packages count guests in the actual CSV',()=>{
 const tickets=[{...ticket,id:'c1',description:'Club - Cremant for 2'},{...ticket,id:'c2',description:'Club - Crémant for 2'}];
 const csv=serviceCsv(event,tickets,[order]);
 const lines=csv.trim().split('\r\n').slice(1);
 assert.equal(lines.length,2);
 assert.equal(lines.reduce((sum,line)=>sum+Number(line.split(';')[4].replaceAll('"','')),0),4);
});

 test('Anita export has six columns and orders categories before names',()=>{
 const labels=['Worldstar VIP - 2 Guests','Premium - 3 Guests','Club Plus - 2 Guests','VIP Table - 2 Guests','Club - 2 Guests'];
 const ts=labels.map((description,i)=>({...ticket,id:'sort'+i,order_id:undefined,description,full_name:'Name'}));
 const csv=serviceCsv(event,ts,[]);const rows=csv.trim().split('\r\n');
 assert.equal(rows[0].replace(/^\uFEFF/,''),'"Datum";"Veranstaltung";"Buchungsname";"Ticketkategorie";"Personenzahl";"Vorbestellungen der Buchung"');
 assert.deepEqual(rows.slice(1).map(r=>r.split(';')[3].replaceAll('"','')),[labels[4],labels[2],labels[1],labels[3],labels[0]]);
 });

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showtime, showtimeTeam } from '../lib/staff/showtime.ts';
const ms = date => Date.parse(date);
const night = (start, more = {}) => ({id:start, name:'Jazz', start:ms(start)/1000, guests:51, recent:0, drinks:0, unknown:0, ...more});

test('Thursday switches from doors to show countdown and then scheduled showtime', () => {
 const nights=[night('2026-11-19T21:00:00+01:00')];
 const before=showtime(nights,ms('2026-11-19T19:18:00+01:00'));
 assert.equal(before.label,'Einlass in'); assert.equal(before.value,'42 Min.');
 assert.equal(before.doors,'20:00'); assert.equal(before.start,'21:00');
 const doors=showtime(nights,ms('2026-11-19T20:00:00+01:00'));
 assert.equal(doors.label,'Show in'); assert.equal(doors.value,'1 Std.');
 assert.equal(showtime(nights,ms('2026-11-19T20:59:59+01:00')).value,'1 Min.');
 const started=showtime(nights,ms('2026-11-19T21:00:00+01:00'));
 assert.equal(started.phase,'started'); assert.equal(started.value,'21:00');
});

test('Showtime team follows the event night across midnight and then the next event', () => {
 const shifts=[{date:'2026-11-19',names:['Chelly','Adri'],role:'Bar inkl. Backstage'},
  {date:'2026-11-19',names:['Laura','Ana']}, {date:'2026-11-20',names:['Hamad','Adri'],role:'Bar'},
  {date:'2026-11-20',names:['Adriano','Ana']}];
 const nights=[night('2026-11-19T21:00:00+01:00'),night('2026-11-20T21:30:00+01:00')];
 const running=showtime(nights,ms('2026-11-20T01:49:00+01:00'));
 assert.deepEqual(showtimeTeam(shifts,running.night.start).people.map(p=>p.name),['Chelly','Adri','Laura','Ana']);
 const next=showtime(nights,ms('2026-11-20T03:00:00+01:00'));
 assert.deepEqual(showtimeTeam(shifts,next.night.start).people.map(p=>p.name),['Hamad','Adri','Adriano','Ana']);
});

test('future event without shifts does not borrow another evening’s team; date is Berlin', () => {
 const shifts=[{date:'2026-11-20',names:['Hamad']},{date:'2026-11-21',names:['Chelly']}];
 assert.deepEqual(showtimeTeam(shifts,ms('2026-11-20T23:30:00Z')/1000),{date:'2026-11-21',people:[{name:'Chelly',tentative:false,station:'team',roles:['Team']}]});
 assert.deepEqual(showtimeTeam(shifts,ms('2026-11-25T21:00:00+01:00')/1000).people,[]);
});

test('team names appear once across roles and tentative assignments remain explicit', () => {
 const date='2026-11-26';
 const shifts=[{date,names:['Adri','Joab'],status:'tentative'},
  {date,names:[' adri ','Hamad'],role:'Bar'}, {date,names:['Joab'],status:'tentative',role:'Backstage'}];
 assert.deepEqual(showtimeTeam(shifts,ms(date+'T21:00:00+01:00')/1000).people,
  [{name:'Adri',tentative:false,station:'bar',roles:['Team','Bar']},
   {name:'Joab',tentative:true,station:'backstage',roles:['Team','Backstage']},
   {name:'Hamad',tentative:false,station:'bar',roles:['Bar']}]);
});

test('team stations follow each evening’s roster, including combined and open assignments', () => {
 const date='2026-11-19';
 const shifts=[{date,names:['Chelly','Adri'],role:'Bar inkl. Backstage'},
  {date,names:['Laura'],role:'Service'}, {date,names:['Ana'],role:'Door'},
  {date,names:['Joab'],role:'Backstage (noch offen)',status:'tentative'},
  {date,names:['Sam'],role:'Team · Aufgaben noch offen'},
  {date:'2026-11-20',names:['Chelly'],role:'Backstage'}];
 const today=showtimeTeam(shifts,ms(date+'T21:00:00+01:00')/1000).people;
 assert.deepEqual(today.map(p=>[p.name,p.station]),[
  ['Chelly','bar'],['Adri','bar'],['Laura','service'],['Ana','door'],['Joab','backstage'],['Sam','team']]);
 assert.equal(today.find(p=>p.name==='Joab').tentative,true);
 assert.deepEqual(today[0].roles,['Bar inkl. Backstage']);
 assert.equal(showtimeTeam(shifts,ms('2026-11-20T21:30:00+01:00')/1000).people[0].station,'backstage');
});

test('confirmed role wins over tentative role in either order; multiple roles remain available', () => {
 const date='2026-11-19',start=ms(date+'T21:00:00+01:00')/1000;
 const confirmed={date,names:['Adri'],role:'Bar'};
 const tentative={date,names:['Adri'],role:'Backstage',status:'tentative'};
 for(const shifts of [[confirmed,tentative],[tentative,confirmed]]) {
  const [person]=showtimeTeam(shifts,start).people;
  assert.equal(person.station,'bar'); assert.equal(person.tentative,false);
  assert.deepEqual([...person.roles].sort(),['Backstage','Bar']);
 }
 const [multi]=showtimeTeam([confirmed,{...confirmed,role:'Service'},confirmed],start).people;
 assert.equal(multi.station,'bar'); assert.deepEqual(multi.roles,['Bar','Service']);
 const unknown={...confirmed,role:'Aufgaben noch offen'};
 for(const shifts of [[unknown,tentative],[tentative,unknown]]) {
  assert.equal(showtimeTeam(shifts,start).people[0].station,'team');
 }
});
test('Friday, Saturday, Sunday and special times come from the actual event', () => {
 for(const [start,doors] of [
  ['2026-11-20T21:30:00+01:00','20:30'],['2026-11-21T21:30:00+01:00','20:30'],
  ['2026-11-22T20:00:00+01:00','19:00'],['2026-11-22T18:15:00+01:00','17:15'],
  ['2027-07-01T21:00:00+02:00','20:00']]) {
  assert.equal(showtime([night(start)],ms(start)-2*3600000).doors,doors);
 }
});
test('keeps the running evening across midnight until exactly Berlin 03:00, including Sunday/Monday', () => {
 const nights=[night('2026-11-25T21:00:00+01:00'),night('2026-11-22T20:00:00+01:00')];
 assert.equal(showtime(nights,ms('2026-11-23T02:59:59+01:00')).night.start,nights[1].start);
 assert.equal(showtime(nights,ms('2026-11-23T03:00:00+01:00')).night.start,nights[0].start);
});
test('Berlin daylight saving nights keep the same service day through the repeated hour', () => {
 const nights=[night('2026-10-24T21:30:00+02:00'),night('2026-10-25T20:00:00+01:00')];
 assert.equal(showtime(nights,ms('2026-10-25T02:30:00+02:00')).night.id,nights[0].id);
 assert.equal(showtime(nights,ms('2026-10-25T02:30:00+01:00')).night.id,nights[0].id);
 assert.equal(showtime(nights,ms('2026-10-25T03:00:00+01:00')).night.id,nights[1].id);
});
test('future events use calendar days, and malformed or finished events are not selected', () => {
 const upcoming=night('2026-11-20T21:30:00+01:00');
 const events=[night('2026-11-18T21:00:00+01:00'),{...upcoming,start:NaN},upcoming];
 assert.equal(showtime(events,ms('2026-11-19T12:00:00+01:00')).value,'morgen');
 assert.equal(showtime([upcoming],ms('2026-11-18T12:00:00+01:00')).value,'in 2 Tagen');
 assert.equal(showtime([],Date.now()),null); assert.equal(showtime(events,0),null);
 assert.equal(showtime([events[0]],ms('2026-11-19T12:00:00+01:00')),null);
});
test('occupancy uses guests, clamps overflow and respects explicit sold out even below 60', () => {
 const start='2026-11-19T21:00:00+01:00',now=ms(start)-3600000;
 for(const [guests,soldOut,expected] of [[0,false,0],[51,false,85],[60,false,100],[68,false,100],[54,true,100]]) {
  const info=showtime([night(start,{guests,soldOut,unknown:1})],now);
  assert.equal(info.percent,expected);assert.equal(info.night.soldOut,soldOut);assert.equal(info.night.unknown,1);
 }
});

 test('Berlin midnight ends the display, while 03:00 still changes the event', () => {
 const nights=[night('2026-11-20T21:30:00+01:00'),night('2026-11-21T21:30:00+01:00')];
 assert.equal(showtime(nights,ms('2026-11-20T23:59:59+01:00')).phase,'started');
 for (const time of ['00:00:00','01:29:00','02:59:59']) {
  const info=showtime(nights,ms('2026-11-21T'+time+'+01:00'));
  assert.equal(info.phase,'ended'); assert.equal(info.label,'Show ended'); assert.equal(info.value,'');
  assert.equal(info.night.id,nights[0].id);
 }
 assert.equal(showtime(nights,ms('2026-11-21T03:00:00+01:00')).night.id,nights[1].id);
 const summer=[night('2026-07-10T21:30:00+02:00')];
 assert.equal(showtime(summer,ms('2026-07-11T00:00:00+02:00')).phase,'ended');
});

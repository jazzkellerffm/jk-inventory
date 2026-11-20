import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showtime } from '../lib/staff/showtime.ts';
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

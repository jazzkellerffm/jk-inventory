'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { Masthead } from './masthead';
import { TicketLoader } from './ticket-loader';
import { AdminDashboard } from './admin-dashboard';
import { AdminMonthView, type AdminMode } from './admin-month-view';
import type { AdminSummary } from '@/lib/staff/admin/data';

const currentMonth = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()).slice(0, 7);
function shifted(month: string, delta: number) {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false), [configured, setConfigured] = useState<boolean | null>(null);
  const [pin, setPin] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(currentMonth), [mode, setMode] = useState<AdminMode>('payments');
  const [data, setData] = useState<AdminSummary | null>(null);
  const [refresh, setRefresh] = useState(0);
  const request = useRef<AbortController | null>(null);
  const touch = useRef<{ x: number; y: number; id: number } | null>(null);
  const clear = useCallback(() => { request.current?.abort(); setData(null); setBusy(false); setUnlocked(false); setPin(''); }, []);
  const lock = useCallback(async () => {
    clear();
    try { await fetch('/api/staff/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lock' }) }); }
    catch { setMessage('Ansicht gesperrt. Verbindung zum Server unterbrochen.'); }
  }, [clear]);
  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/admin/session', { cache: 'no-store' });
      if (!res.ok) { clear(); setMessage('Bitte Teamzugang und Verbindung prüfen.'); return; }
      const state = await res.json(); setConfigured(state.configured); setUnlocked(state.unlocked);
      if (!state.unlocked) setData(null);
    } catch { clear(); setMessage('Verbindung derzeit nicht verfügbar.'); }
  }, [clear]);
  useEffect(() => {
    const initial = window.setTimeout(() => { void check(); }, 0);
    const hidden = () => { if (document.visibilityState === 'hidden') { request.current?.abort(); setData(null); setUnlocked(false); } else void check(); };
    const restore = () => { clear(); void check(); };
    document.addEventListener('visibilitychange', hidden); window.addEventListener('pageshow', restore);
    return () => { window.clearTimeout(initial); request.current?.abort(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pageshow', restore); };
  }, [check, clear]);
  useEffect(() => {
    if (!unlocked) return;
    // Client hides the screen too; the server independently enforces session expiry.
    const timeout = window.setTimeout(() => { void lock(); }, 15 * 60000);
    return () => window.clearTimeout(timeout);
  }, [unlocked, month, mode, lock]);
  useEffect(() => {
    if (!unlocked) return;
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setData(null); setMessage(''); setBusy(true);
      return fetch('/api/staff/admin/summary?month=' + month, { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if (res.status === 401) { clear(); throw Error('Bitte erneut entsperren.'); }
        if (!res.ok) throw Error('Auswertung derzeit nicht verfügbar.');
        const result = await res.json();
        if (!controller.signal.aborted && result.month === month) setData(result);
      }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    });
    return () => controller.abort();
  }, [month, unlocked, clear, refresh]);
  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/staff/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock', pin }) });
      setPin(''); const result = await res.json();
      if (res.ok && result.unlocked) setUnlocked(true);
      else setMessage(result.result === 'limited' ? 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' : result.result === 'invalid' ? 'Die PIN stimmt nicht.' : 'Zugang derzeit nicht verfügbar.');
    } catch { setMessage('Verbindung derzeit nicht verfügbar.'); }
    finally { setBusy(false); }
  }
  const move = (delta: number) => {
    const next = shifted(month, delta);
    if (busy || next < '2026-06' || next > currentMonth()) return;
    request.current?.abort(); setData(null); setBusy(true); setMonth(next);
  };
  return <div className="staff-shell"><Masthead signedIn /><main className="staff-admin">
    <div className="admin-heading"><h1>Administration</h1>{unlocked && <button onClick={() => void lock()}><LockKeyhole size={18} /> Sperren</button>}</div>
    <Link href="/staff#staff-tools">Zurück zum Team</Link>
    {unlocked && <AdminDashboard onExpired={clear} />}
    {!unlocked ? <section className="staff-login">
      <LockKeyhole aria-hidden="true"/><h2>Geschützter Bereich</h2>
      {configured === null ? <TicketLoader label="Zugang wird geprüft"/> : configured ? <form onSubmit={unlock}>
        <label htmlFor="admin-pin">Admin-PIN</label><input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} minLength={6} value={pin} onChange={e => setPin(e.target.value)} required />
        <button className="staff-submit" disabled={busy}>{busy ? 'Prüfen …' : 'Entsperren'}</button>
      </form> : <p>Der Admin-Zugang ist vorbereitet. Die persönliche PIN muss noch eingerichtet werden.</p>}
    </section> : <section className="admin-month-view" aria-label="Monatsauswertung"
      onTouchStart={event => {
        if (busy || event.touches.length !== 1 || (event.target as Element).closest('button, a, input, select, textarea')) { touch.current = null; return; }
        const finger = event.touches[0]; touch.current = { x: finger.clientX, y: finger.clientY, id: finger.identifier };
      }}
      onTouchMove={event => {
        const start = touch.current;
        if (!start) return;
        if (event.touches.length !== 1) { touch.current = null; return; }
        const finger = event.touches[0], dx = finger.clientX - start.x, dy = finger.clientY - start.y;
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) touch.current = null;
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current; touch.current = null;
        if (!start || event.touches.length) return;
        const finger = Array.from(event.changedTouches).find(item => item.identifier === start.id);
        if (!finger) return;
        const dx = finger.clientX - start.x, dy = finger.clientY - start.y;
        // Same direction and threshold as the team month overview.
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx > 0 ? -1 : 1);
      }}>
      <div className="admin-month"><h2><select aria-label="Monat direkt auswählen" value={month} onChange={event=>{request.current?.abort();setData(null);setMonth(event.target.value);}}>{Array.from({length:Math.max(1,(Number(currentMonth().slice(0,4))-2026)*12+Number(currentMonth().slice(5))-5)},(_,i)=>shifted("2026-06",i)).reverse().map(value=><option key={value} value={value}>{new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value+"-01T12:00:00Z"))}</option>)}</select></h2><div role="group" aria-label="Monat wechseln">
        <button type="button" aria-label="Vorheriger Monat" disabled={month <= '2026-06' || busy} onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" aria-label="Nächster Monat" disabled={month >= currentMonth() || busy} onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button>
      </div></div>
      <div className="service-switch admin-switch" role="group" aria-label="Berechnungsbasis">
        <button type="button" aria-pressed={mode === 'payments'} onClick={() => setMode('payments')}>Zahlungen</button>
        <button type="button" aria-pressed={mode === 'events'} onClick={() => setMode('events')}>Veranstaltungen</button>
      </div>
      <div aria-busy={busy}>
        {busy && <TicketLoader label="Monatsauswertung wird geladen"/>}
        {data?.month === month && <AdminMonthView key={month + mode} data={data} mode={mode} retry={() => setRefresh(value => value + 1)} />}
      </div>
    </section>}
    {message && <p role="alert">{message}</p>}
  </main></div>;
}

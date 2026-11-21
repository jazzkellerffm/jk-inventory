'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { Masthead } from './masthead';
import { serviceDate } from '@/lib/staff/service-day';
import type { AdminSummary } from '@/lib/staff/admin/data';

const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const currentMonth = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()).slice(0, 7);
function shifted(month: string, delta: number) {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false), [configured, setConfigured] = useState<boolean | null>(null);
  const [pin, setPin] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(currentMonth), [mode, setMode] = useState<'payments' | 'events'>('payments');
  const [data, setData] = useState<AdminSummary | null>(null);
  const [refresh, setRefresh] = useState(0);
  const request = useRef<AbortController | null>(null);
  const clear = useCallback(() => { request.current?.abort(); setData(null); setUnlocked(false); setPin(''); }, []);
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
  const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));
  const nights = data?.ticket?.nights ?? [];
  const eventComplete = data?.ticket && data.ticket.eventIssues === 0;
  const ticketTotal = eventComplete ? nights.reduce((sum, night) => sum + night.ticketCents, 0) : null;
  return <div className="staff-shell"><Masthead signedIn /><main className="staff-admin">
    <div className="admin-heading"><h1>Administration</h1>{unlocked && <button onClick={() => void lock()}><LockKeyhole size={18} /> Sperren</button>}</div>
    <Link href="/staff#staff-tools">Zurück zum Team</Link>
    {!unlocked ? <section className="staff-login">
      <LockKeyhole aria-hidden="true"/><h2>Geschützter Bereich</h2>
      {configured === null ? <p>Zugang wird geprüft …</p> : configured ? <form onSubmit={unlock}>
        <label htmlFor="admin-pin">Admin-PIN</label><input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} minLength={6} value={pin} onChange={e => setPin(e.target.value)} required />
        <button className="staff-submit" disabled={busy}>{busy ? 'Prüfen …' : 'Entsperren'}</button>
      </form> : <p>Der Admin-Zugang ist vorbereitet. Die persönliche PIN muss noch eingerichtet werden.</p>}
    </section> : <>
      <div className="admin-month"><h2>{label}</h2><div><button aria-label="Vorheriger Monat" disabled={month <= '2026-06' || busy} onClick={() => setMonth(shifted(month, -1))}><ChevronLeft /></button><button aria-label="Nächster Monat" disabled={month >= currentMonth() || busy} onClick={() => setMonth(shifted(month, 1))}><ChevronRight /></button></div></div>
      <div className="service-switch" role="group" aria-label="Berechnungsbasis"><button aria-pressed={mode === 'payments'} className={mode === 'payments' ? 'active' : ''} onClick={() => setMode('payments')}>Zahlungen</button><button aria-pressed={mode === 'events'} className={mode === 'events' ? 'active' : ''} onClick={() => setMode('events')}>Veranstaltungen</button></div>
      {busy && <p role="status">Zahlungsvorgänge werden abgeglichen …</p>}
      {data && (mode === 'payments' ? <>
        <section className="admin-total"><p>Zahlungen im Monat · nach erfassten Rückzahlungen</p><strong>{money(data.combinedPayments)}</strong><p>Ticket Tailor + SumUp · vor Anbietergebühren · inklusive etwaiger Trinkgelder</p></section>
        <dl className="admin-values"><div><dt>Ticket Tailor</dt><dd>{money(data.ticket?.netPayments)}</dd></div><div><dt>SumUp</dt><dd>{money(data.bar?.netPayments)}</dd></div><div><dt>Erfasste Rückzahlungen</dt><dd>{money(data.ticket?.netPayments != null && data.bar?.netPayments != null ? data.ticket.refunds + data.bar.refunds : null)}</dd></div></dl>
        {(data.combinedPayments === null) && <div role="status">
          {!data.ticket ? <p>Ticket Tailor konnte nicht vollständig geladen werden.</p> : data.ticket.paymentIssues > 0 && <p>Ticket Tailor: {data.ticket.paymentIssues} Zahlungsvorgänge benötigen noch einen Abgleich.</p>}
          {!data.bar ? <p>SumUp konnte nicht vollständig geladen werden.</p> : data.bar.paymentIssues > 0 && <p>SumUp: {data.bar.paymentIssues} Erstattungen konnten noch nicht vollständig zugeordnet werden.</p>}
          <p>Die Gesamtsumme erscheint, sobald beide Quellen vollständig abgeglichen sind.</p>
          <button onClick={() => setRefresh(value => value + 1)} disabled={busy}>Erneut laden</button>
        </div>}
        <p className="admin-note">Zahlungsdatum in Europe/Berlin. Ticketkäufe für spätere Veranstaltungen zählen hier mit. Stripe wird nicht nochmals addiert. Auszahlungen und Gewinn sind andere Größen.</p>
      </> : <>
        <section className="admin-total"><p>Ticketwert der Veranstaltungen im Monat</p><strong>{money(ticketTotal)}</strong><p>Ohne Buchungsgebühren und Zusatzbestellungen · unabhängig vom Kaufmonat</p></section>
        {!eventComplete && <p>Einige Bestellungen benötigen einen Abgleich, etwa wegen Erstattungen oder Guthaben. Eine vollständige Monatssumme bleibt bis dahin offen.</p>}
        {nights.map(night => {
          const sameDate = nights.filter(other => other.date === night.date).length;
          const bar = data.bar && sameDate === 1 && night.date <= serviceDate(data.asOf)
            ? Object.hasOwn(data.bar.nights, night.date) ? data.bar.nights[night.date] : 0 : null;
          const gastro = !night.uncertain && bar != null && night.includedCents != null ? bar + night.includedCents : null;
          return <section className="admin-night" key={night.id}><p>{new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(new Date(night.date + 'T12:00:00Z'))}</p><h3>{night.name}</h3>
            {night.uncertain ? <p>Zuordnung wird geprüft · keine verlässliche Aufteilung.</p> : <dl className="admin-values">
              <div><dt>Ticketpakete</dt><dd>{money(night.ticketCents)}</dd></div>
              <div><dt>Davon Inklusivgetränke · kalkulatorisch</dt><dd>{money(night.includedCents)}</dd></div>
              <div><dt>Eintritt & Platzkomfort</dt><dd>{money(night.admissionCents)}</dd></div>
              <div><dt>Mehrerlös gegenüber Club · nach Inklusivwert</dt><dd>{money(night.upgradeCents)}</dd></div>
              <div><dt>SumUp-Zahlungen des Abends</dt><dd>{money(bar)}</dd></div>
              <div><dt>SumUp + Inklusivwert · kalkulatorisch</dt><dd>{money(gastro)}</dd></div>
              <div><dt>Zusatzbestellungen über Ticket Tailor</dt><dd>{money(night.addonCents)}</dd></div>
            </dl>}
          </section>;
        })}
        <p className="admin-note">Inklusivdrinks: vereinbarter Ansatz 15 € je enthaltenem Drink, keine Aussage über den tatsächlichen Verbrauch. Für Flaschen und historische Club-Vergleichspreise bleiben fehlende Ansätze offen. SumUp kann Trinkgelder und weitere Artikel enthalten; deshalb ist die Summe noch kein reiner Gastronomieumsatz. Serviceabend: 03:00 bis 03:00.</p>
      </>)}
      {data && <p className="admin-note">Stand {new Date(data.asOf).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr</p>}
    </>}
    {message && <p role="alert">{message}</p>}
  </main></div>;
}

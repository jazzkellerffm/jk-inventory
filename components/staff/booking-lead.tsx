'use client';
import { useEffect, useState } from 'react';
import { leadLabels, type LeadFeed } from '@/lib/staff/booking-lead';
import { TicketLoader } from './ticket-loader';
export function BookingLead({ enabled, example }: { enabled: boolean; example: boolean }) {
  const [feed, setFeed] = useState<LeadFeed|null>(null);
  const [failed, setFailed] = useState(false);
  const [group, setGroup] = useState<'all'|'jam'|'nyjb'|'weekend'>('all');
  const [weekend, setWeekend] = useState<'weekend'|'friday'|'saturday'>('weekend');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || example) return;
    const abort = new AbortController();
    setFailed(false);
    fetch('/api/staff/booking-lead', { signal: abort.signal, cache: 'no-store' })
      .then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setFeed)
      .catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, [enabled, example, retry]);
  const data = feed?.groups[group === 'weekend' ? weekend : group];
  const total = data?.bins.reduce((a,b) => a+b, 0) ?? 0;
  return <section className="mt-4 border-t border-[var(--line)] pt-4">
    <h3 className="font-poly-bulky">Wie früh buchen unsere Gäste?</h3>
    <p className="text-sm text-[var(--muted)]">Abgeschlossene Abende{feed && ' · ' + new Intl.DateTimeFormat('de-DE', {month:'long',year:'numeric'}).format(new Date(feed.month+'-15T12:00:00Z'))}</p>
    <div className="service-switch week-switch" role="group" aria-label="Buchungsvorlauf nach Format">
      {(['all','jam','nyjb','weekend'] as const).map(g => <button type="button" key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g==='all'?'Alle':g==='jam'?'Jam':g==='nyjb'?'NYJB':'Weekend'}</button>)}
    </div>
    {group === 'weekend' && <div className="mt-3 mb-4">
      <select aria-label="Weekend nach Wochentag" value={weekend}
        onChange={e=>setWeekend(e.target.value as 'weekend'|'friday'|'saturday')}
        className="max-w-full min-h-11 rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-base text-[var(--ink)]">
        <option value="weekend">Freitag + Samstag</option>
        <option value="friday">Freitag</option>
        <option value="saturday">Samstag</option>
      </select>
    </div>}
    {example ? <p>Im Livebetrieb verfügbar.</p> : failed ? <p role="status">Buchungsvorlauf derzeit nicht verfügbar. <button type="button" onClick={()=>setRetry(v=>v+1)}>Erneut laden</button></p> : !data ? <TicketLoader label="Buchungsvorlauf wird geladen"/> : <>
      <p className="mt-4 text-sm text-[var(--muted)]">{total} zugeordnete Gäste · {data.nights} abgeschlossene Abende</p>
      {total > 0 ? <dl className="mt-3 space-y-3">{leadLabels.map((label,i)=><div key={label}>
        <div className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-poly-bulky whitespace-nowrap">{Math.round(data.bins[i]/total*100)} % <span className="font-normal text-[var(--muted)]">· {data.bins[i]}</span></dd></div>
        <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-[#e2e9e3]"><div className="h-full rounded-full bg-[#42675a]" style={{width:100*data.bins[i]/total+'%'}}/></div>
      </div>)}</dl> : <p>Noch keine auswertbaren Buchungen für dieses Format.</p>}
      <p className="mt-3 text-xs text-[var(--muted)]">Anteil der zugeordneten Gäste · Kaufdatum bis Veranstaltungstag. Abgesagte Abende ausgenommen.</p>
      {(data.excludedGuests>0 || data.unknownPackages>0) && <p className="text-xs text-[var(--muted)]">Nicht zugeordnet: {data.excludedGuests} Gäste ohne eindeutiges Kaufdatum; {data.unknownPackages} Ticketpakete ohne bekannte Gästezahl.</p>}
    </>}
  </section>;
}

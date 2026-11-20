import type { TicketFeed } from '@/lib/staff/tickets';
import { showtime } from '@/lib/staff/showtime';
import styles from './showtime.module.css';

export function Showtime({ feed, state, now, example = false }: {
  feed: TicketFeed | null; state: string; now: number; example?: boolean;
}) {
  const info = showtime(feed?.nights ?? [], now);
  const stale = !example && !!feed && (state === 'unavailable' || now / 1000 - feed.asOf > 300);
  return <div className={styles.showtime} aria-label="Showtime">
    {!info ? <div className={styles.empty}><b>Showtime</b><span>
      {!feed ? state === 'setup' ? 'Ticket Tailor ist noch nicht verbunden.'
        : state === 'unavailable' ? 'Termine derzeit nicht verfügbar.' : 'Termine werden geladen …'
        : !now ? 'Termine werden geladen …' : stale ? 'Termine derzeit nicht verfügbar.' : 'Kein Termin in der Vorschau.'}
    </span></div> : <>
      <div className={styles.heading}>
        <div className={styles.event}>
          <span className={styles.eyebrow}>Showtime · {info.date}</span>
          <b title={info.night.name}>{info.night.name}</b>
          <small>Einlass {info.doors} · Show {info.start}</small>
        </div>
        <div className={styles.countdown} role="timer">
          <span>{info.label}</span>
          <strong>{info.value}</strong>
        </div>
      </div>
      <div className={styles.track} role="meter" aria-label="Gebuchte Gäste · Richtwert 60"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={info.percent}
        aria-valuetext={(stale ? 'Letzter Stand: ' : '') + (info.night.unknown ? 'Mindestens ' : '') + info.night.guests + ' Gäste gebucht' + (info.night.soldOut ? ', Sold out' : '')}
        data-stale={stale || undefined}>
        <i style={{ width: info.percent + '%' }}/>
      </div>
      <div className={styles.footer}>
        <span>{info.night.unknown ? '≥ ' : ''}{info.night.guests} {info.night.guests === 1 ? 'Gast' : 'Gäste'} gebucht{info.night.unknown ? ' · Zuordnung offen' : ''}</span>
        {info.night.soldOut && <b className={styles.soldOut}>Sold out</b>}
        {stale && <span className={styles.stale}>Letzter Stand · {new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin', hour:'2-digit', minute:'2-digit'}).format(feed!.asOf * 1000)}</span>}
      </div>
    </>}
  </div>;
}

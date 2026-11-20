import type { TicketFeed } from '@/lib/staff/tickets';
import type { Shift } from '@/lib/staff/types';
import { ArrowUpRight } from 'lucide-react';
import { showtime, showtimeTeam } from '@/lib/staff/showtime';
import { stationIcons } from './station-cards';
import styles from './showtime.module.css';

export function Showtime({ feed, state, now, example = false, shifts, teamUnavailable, onOpenSchedule }: {
  feed: TicketFeed | null; state: string; now: number; example?: boolean;
  shifts?: Shift[]; teamUnavailable: boolean; onOpenSchedule: (date: string) => void;
}) {
  const info = showtime(feed?.nights ?? [], now);
  const team = info ? showtimeTeam(shifts ?? [], info.night.start) : null;
  const stale = !example && !!feed && (state === 'unavailable' || now / 1000 - feed.asOf > 300);
  return <section className={styles.showtime} aria-label="Showtime">
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
      {team && (teamUnavailable || !shifts ? <p className={styles.teamStatus}>
        {teamUnavailable ? 'Team derzeit nicht verfügbar.' : 'Team wird geladen …'}
      </p> : <a className={styles.team} href="#schedule" onClick={() => onOpenSchedule(team.date)}
        aria-label={'Team für ' + info.date + ': ' + (team.people.length
          ? team.people.map(person => person.name + ': ' + person.roles.join(', ') + (person.tentative ? ' noch offen' : '')).join('; ')
          : 'noch nicht geplant') + '. Dienstplan öffnen'}>
        <span className={styles.teamLabel}>Team</span>
        <span className={styles.people}>
          {team.people.length ? team.people.map(person => {
            const Icon = stationIcons[person.station];
            return <span className={styles.person} key={person.name} data-station={person.station}
              title={person.roles.join(' · ')} data-tentative={person.tentative || undefined}>
              <Icon size={12} aria-hidden="true"/>
              <span>{person.name}{person.tentative && <small> · offen</small>}</span>
            </span>;
          }) : <span className={styles.unplanned}>Team noch nicht geplant</span>}
        </span>
        <ArrowUpRight size={15} aria-hidden="true"/>
      </a>)}
    </>}
  </section>;
}

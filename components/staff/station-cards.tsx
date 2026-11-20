import { DoorOpen, HandPlatter, Martini, UsersRound, Utensils } from "lucide-react";
import type { Shift } from "@/lib/staff/types";
import { stationFor } from "@/lib/staff/stations";

export const stationIcons = {
  bar: Martini, backstage: Utensils, service: HandPlatter, door: DoorOpen, team: UsersRound,
};

export function StationCards({ shifts, activeName }: { shifts: Shift[]; activeName?: string }) {
  return <dl className="station-cards">{shifts.map((shift, index) => {
    const station = stationFor(shift.role);
    const Icon = stationIcons[station];
    return <div key={index} className="roster-role" data-station={station} data-tentative={shift.status === "tentative"}>
      <dt><Icon size={15} aria-hidden="true"/><span>{shift.role || "Team"}</span></dt>
      <dd>
        {shift.start && <small>{shift.start} Uhr</small>}
        <span className="roster-names">{shift.names.map(person =>
          <span className="roster-name" key={person} data-match={person === activeName}>{person}</span>
        )}</span>
      </dd>
    </div>;
  })}</dl>;
}

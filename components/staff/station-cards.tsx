import { DoorOpen, HandPlatter, Martini, UsersRound, Utensils } from "lucide-react";
import type { Shift } from "@/lib/staff/types";

const stations = [
  { key: "bar", Icon: Martini },
  { key: "backstage", Icon: Utensils },
  { key: "service", Icon: HandPlatter },
  { key: "door", Icon: DoorOpen },
];
const teamStation = { key: "team", Icon: UsersRound };

function stationFor(role = "") {
  const label = role.trim().toLowerCase();
  return stations.find(station => label.startsWith(station.key)) ?? teamStation;
}

export function StationCards({ shifts, activeName }: { shifts: Shift[]; activeName?: string }) {
  return <dl className="station-cards">{shifts.map((shift, index) => {
    const { key: station, Icon } = stationFor(shift.role);
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

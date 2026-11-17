import { Boxes, CalendarDays, Trophy, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StaffBoard } from "@/lib/staff/types";
import { FormatBattle } from "./format-battle";
import { Schedule } from "./schedule";

type StaffModule = { id: string; title: string; hint: string; icon: LucideIcon } & (
  { href: string } | { render: (board: StaffBoard | undefined, error: boolean, example?: boolean) => ReactNode }
);

export const staffModules: StaffModule[] = [
  { id: "format-battle", title: "Jam vs. NYJB", hint: "Ranking & Aufsteiger", icon: Trophy, render: (_board, _error, example) => <FormatBattle example={example}/> },
  { id: "inventory", title: "Inventory", hint: "Bestände prüfen", icon: Boxes, href: "/inventory" },
  {
    id: "schedule", title: "Dienstplan", hint: "Schichten & Team", icon: CalendarDays,
    render: (board, error) => <Schedule shifts={board?.shifts ?? []}
      invalid={!!board?.scheduleError || (error && !board)} loading={!board && !error}/>,
  },
];

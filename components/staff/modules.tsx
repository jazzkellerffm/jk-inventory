import { LockKeyhole, Boxes, CalendarDays, ChartNoAxesColumnIncreasing, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StaffBoard } from "@/lib/staff/types";
import { FormatPerformance } from "./format-battle";
import { Schedule } from "./schedule";

type StaffModule = { id: string; title: string; hint: string; icon: LucideIcon } & (
  { href: string } | { render: (board: StaffBoard | undefined, error: boolean, example?: boolean, scheduleFocus?: { date: string; request: number }) => ReactNode }
);

export const staffModules: StaffModule[] = [
  { id: "jam-nyjb", title: "Jam & NYJB", hint: "Gäste, Ticketmix & Performance", icon: ChartNoAxesColumnIncreasing, render: (_board, _error, example) => <FormatPerformance example={example}/> },
  { id: "inventory", title: "Inventory", hint: "Bestände prüfen", icon: Boxes, href: "/inventory" },
  {
    id: "schedule", title: "Dienstplan", hint: "Schichten & Team", icon: CalendarDays,
    render: (board, error, _example, focus) => <Schedule key={focus?.request ?? 0} initialDate={focus?.date} shifts={board?.shifts ?? []}
      invalid={!!board?.scheduleError || (error && !board)} loading={!board && !error}/>,
  },
  { id: "administration", title: "Administration", hint: "Geschützter Bereich", icon: LockKeyhole, href: "/staff/admin" },
];

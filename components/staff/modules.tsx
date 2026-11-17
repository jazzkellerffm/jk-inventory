import { Boxes, CalendarDays, ChartNoAxesColumnIncreasing, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StaffBoard } from "@/lib/staff/types";
import { FormatPerformance } from "./format-battle";
import { Schedule } from "./schedule";

type StaffModule = { id: string; title: string; hint: string; icon: LucideIcon } & (
  { href: string } | { render: (board: StaffBoard | undefined, error: boolean, example?: boolean) => ReactNode }
);

export const staffModules: StaffModule[] = [
  { id: "jam-performance", title: "Jazz Jam Session Performance", hint: "Mittwochs · Gäste, Drinks & Umsatz", icon: ChartNoAxesColumnIncreasing, render: (_board, _error, example) => <FormatPerformance format="jam" example={example}/> },
  { id: "nyjb-performance", title: "New York Jazz Bar Performance", hint: "Donnerstags · Gäste, Drinks & Umsatz", icon: ChartNoAxesColumnIncreasing, render: (_board, _error, example) => <FormatPerformance format="nyjb" example={example}/> },
  { id: "inventory", title: "Inventory", hint: "Bestände prüfen", icon: Boxes, href: "/inventory" },
  {
    id: "schedule", title: "Dienstplan", hint: "Schichten & Team", icon: CalendarDays,
    render: (board, error) => <Schedule shifts={board?.shifts ?? []}
      invalid={!!board?.scheduleError || (error && !board)} loading={!board && !error}/>,
  },
];

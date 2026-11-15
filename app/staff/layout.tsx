import type { Metadata } from "next";
import "./staff.css";

export const metadata: Metadata = {
  title: "JK Staff OS · Jazzkeller Frankfurt",
  description: "Bar, Inventory und Dienstplan für das Jazzkeller-Team",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div className="jk-staff" lang="de">{children}</div>;
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./staff.css";

const gustavo = localFont({ src: "./fonts/Gustavo-Bold.woff2", weight: "700", variable: "--staff-display", display: "swap" });

export const metadata: Metadata = {
  title: "JK Staff OS · Jazzkeller Frankfurt",
  description: "Bar, Inventory und Dienstplan für das Jazzkeller-Team",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div className={`jk-staff ${gustavo.variable}`} lang="de">{children}</div>;
}

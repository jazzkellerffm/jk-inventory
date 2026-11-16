import type { Metadata } from "next";
import localFont from "next/font/local";
import "./staff.css";

const gustavo = localFont({ src: "./fonts/Gustavo-Bold.woff2", weight: "700", variable: "--staff-display", display: "swap" });

export const metadata: Metadata = {
  title: "JK Staff OS · Jazzkeller Frankfurt",
  description: "Bar, Inventory und Dienstplan für das Jazzkeller-Team",
  openGraph: {
    type: "website",
    siteName: "JKOS",
    locale: "de_DE",
    title: "JKOS · Staff OS",
    description: "Teamzugang für den Jazzkeller Frankfurt",
    images: [{
      url: "https://staff.jazzkeller.com/branding/jkos-staff-preview-v2.png",
      width: 896,
      height: 896,
      type: "image/png",
      alt: "JKOS · Jazzkeller Frankfurt",
    }],
  },
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div className={`jk-staff ${gustavo.variable}`} lang="de">{children}</div>;
}

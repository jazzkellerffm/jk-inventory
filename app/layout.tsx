import type { Metadata } from "next";
import { aceBold, aceMedium, polySans } from "./local-fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "JK Inventory – Fast Stock Check",
  description: "Fast stock check for bar staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${aceBold.variable} ${aceMedium.variable} ${polySans.variable} h-full antialiased`}
    >
      <body
        className={`${polySans.className} min-h-dvh flex flex-col bg-[#F6F4EF] text-neutral-900 font-normal`}
      >
        {children}
      </body>
    </html>
  );
}

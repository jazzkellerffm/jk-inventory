import localFont from "next/font/local";

export const aceBold = localFont({
  src: "./fonts/Ace-Bold.woff2",
  variable: "--font-ace-bold",
  display: "swap",
});

export const aceMedium = localFont({
  src: "./fonts/Ace-Medium.woff2",
  variable: "--font-ace-medium",
  display: "swap",
});

export const polySans = localFont({
  src: [
    {
      path: "./fonts/PolySans-Neutral.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/PolySans-Bulky.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/PolySans-NeutralItalic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-poly",
  display: "swap",
});

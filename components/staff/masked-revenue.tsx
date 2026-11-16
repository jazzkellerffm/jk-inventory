"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const euro = new Intl.NumberFormat("de-DE", {style:"currency", currency:"EUR"});

export function MaskedRevenue({label, cents, dots = 4}: {label:string; cents:number; dots?:number}) {
  const [showRevenue, setShowRevenue] = useState(false);
  useEffect(() => {
    if (!showRevenue) return;
    const hide = () => setShowRevenue(false);
    const timer = window.setTimeout(hide, 5000);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
    };
  }, [showRevenue]);
  return <button type="button" onClick={() => setShowRevenue(!showRevenue)}
            aria-label={showRevenue ? label + " " + euro.format(cents / 100) + " verbergen" : label + " anzeigen"}
            className="inline-flex min-h-11 items-center gap-3 text-left">
            {showRevenue ? (
              <strong key="amount" aria-hidden="true">{euro.format(cents / 100)}</strong>
            ) : (
              <strong key="mask" aria-hidden="true" className="select-none tracking-widest opacity-60">{"•".repeat(dots)}</strong>
            )}
            {showRevenue ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
          </button>;
}

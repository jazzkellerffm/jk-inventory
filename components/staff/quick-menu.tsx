"use client";

import { Activity, LayoutGrid, ClipboardList, Martini, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const destinations = [
  { href:"#bar-monitor", label:"Bar", icon:Activity },
  { href:"#drink-orders", label:"Drinks", icon:Martini },
  { href:"#food-orders", label:"Food", icon:Utensils },
  { href:"#service-door", label:"Service", icon:ClipboardList },
  { href:"#staff-tools", label:"Tools", icon:LayoutGrid },
];

const hideAfterDownwardScroll = 24;
const showAfterUpwardScroll = 12;

function pageScrollY() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(window.scrollY, max));
}

export function QuickMenu() {
  const menu = useRef<HTMLElement>(null);
  const [active, setActive] = useState("#bar-monitor");
  const [hidden,setHidden] = useState(false);
  const [dark,setDark] = useState(false);
  useEffect(()=>{
    let lastY = pageScrollY();
    let travel = 0;
    let frame = 0;
    let didScroll = false;
    let didNavigate = false;
    function update() {
      frame = 0;
      const y = pageScrollY();
      if (didNavigate) {
        travel = 0;
        setHidden(false);
      } else if (didScroll) {
        const delta = y - lastY;
        if (delta > 0) travel = Math.max(0, travel) + delta;
        if (delta < 0) travel = Math.min(0, travel) + delta;
        if (y <= 32 || travel <= -showAfterUpwardScroll) setHidden(false);
        else if (travel >= hideAfterDownwardScroll) setHidden(true);
      }
      lastY = y;
      didScroll = false;
      didNavigate = false;
      let current = "#bar-monitor";
      let nearest = -Infinity;
      for (const { href } of destinations) {
        const top = document.querySelector(href)?.getBoundingClientRect().top;
        if (top !== undefined && top <= 32 && top >= nearest) {
          nearest = top;
          current = href;
        }
      }
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) current = "#staff-tools";
      setActive(current);
      const layer=document.elementsFromPoint(window.innerWidth/2,window.innerHeight-44)
        .find(el=>el.closest("main"));
      setDark(!!layer?.closest(".staff-activity,.service-drinks"));
    }
    function scheduleUpdate() {
      if (!frame) frame=requestAnimationFrame(update);
    }
    function onScroll() {
      didScroll = true;
      scheduleUpdate();
    }
    function onNavigate() {
      // Native fragment links can scroll the page before the next paint.
      didNavigate = true;
      scheduleUpdate();
    }
    const nav = menu.current;
    update();
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",scheduleUpdate);
    window.addEventListener("hashchange",onNavigate);
    nav?.addEventListener("click",onNavigate);
    return ()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",scheduleUpdate);
      window.removeEventListener("hashchange",onNavigate);
      nav?.removeEventListener("click",onNavigate);
      cancelAnimationFrame(frame);
    };
  },[]);
  return <div className="staff-quick-dock">
    <nav ref={menu} aria-label="Schnellzugriff" className="staff-quick" data-hidden={hidden} data-dark={dark}>
      {destinations.map(({href,label,icon:Icon})=><a key={href} href={href} aria-current={active === href ? "location" : undefined}
        onClick={()=>{if(href==="#service-door"){
          const plan=document.querySelector<HTMLDetailsElement>(href);
          if(plan) plan.open=true;
        }}}><Icon size={20} aria-hidden="true"/>{label}</a>)}
    </nav>
  </div>;
}

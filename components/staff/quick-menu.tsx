"use client";

import { Activity, LayoutGrid, ClipboardList, Martini, Utensils } from "lucide-react";
import { useEffect, useState } from "react";

const destinations = [
  { href:"#bar-monitor", label:"Bar", icon:Activity },
  { href:"#drink-orders", label:"Drinks", icon:Martini },
  { href:"#food-orders", label:"Food", icon:Utensils },
  { href:"#service-door", label:"Service", icon:ClipboardList },
  { href:"#staff-tools", label:"Tools", icon:LayoutGrid },
];

export function QuickMenu() {
  const [active, setActive] = useState("#bar-monitor");
  const [hidden,setHidden] = useState(false);
  const [dark,setDark] = useState(false);
  useEffect(()=>{
    let last = window.scrollY;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout>;
    function update() {
      frame = 0;
      const y = Math.max(0,window.scrollY);
      if (Math.abs(y-last)>4 || y===0) {
        setHidden(y>32 && y>last);
        last=y;
      }
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
    function onScroll() {
      if (!frame) frame=requestAnimationFrame(update);
      clearTimeout(idle);
      idle=setTimeout(()=>setHidden(false),850);
    }
    update();
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onScroll);
    return ()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",onScroll);
      clearTimeout(idle);
      cancelAnimationFrame(frame);
    };
  },[]);
  return <nav aria-label="Schnellzugriff" className="staff-quick" data-hidden={hidden} data-dark={dark}>
    {destinations.map(({href,label,icon:Icon})=><a key={href} href={href} aria-current={active === href ? "location" : undefined}
      onClick={()=>{if(href==="#service-door"){
        const plan=document.querySelector<HTMLDetailsElement>(href);
        if(plan) plan.open=true;
      }}}><Icon size={20} aria-hidden="true"/>{label}</a>)}
  </nav>;
}

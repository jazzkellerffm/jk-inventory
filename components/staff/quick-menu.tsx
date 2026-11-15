"use client";

import Link from "next/link";
import { Activity, Boxes, ClipboardList, Martini } from "lucide-react";
import { useEffect, useState } from "react";

const destinations = [
  { href:"#activity", label:"Bar", icon:Activity },
  { href:"#night-drinks", label:"Drinks", icon:Martini },
  { href:"#service-door", label:"Service", icon:ClipboardList },
  { href:"/", label:"Inventory", icon:Boxes },
];

export function QuickMenu() {
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
      const layer=document.elementsFromPoint(window.innerWidth/2,window.innerHeight-44)
        .find(el=>el.closest("main"));
      setDark(!!layer?.closest(".staff-activity,.service-drinks,.staff-turnover"));
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
    {destinations.map(({href,label,icon:Icon})=><Link key={href} href={href}
      onClick={()=>{if(href==="#service-door"){
        const plan=document.querySelector<HTMLDetailsElement>(href);
        if(plan) plan.open=true;
      }}}><Icon size={20} aria-hidden="true"/>{label}</Link>)}
  </nav>;
}

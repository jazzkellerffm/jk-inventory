"use client";

import { Activity, LayoutGrid, ClipboardList, Martini, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const destinations = [
  { href:"#bar-monitor", label:"Bar", icon:Activity },
  { href:"#bar-orders", label:"Drinks", icon:Martini },
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
    let serviceTarget: HTMLDetailsElement | null = null;
    let serviceScrollY = 0;
    const serviceResize = new ResizeObserver(alignService);

    function releaseService() {
      serviceResize.disconnect();
      serviceTarget = null;
    }
    function alignService() {
      if (!serviceTarget?.open) return;
      // The native jump can hit the page end before the service bookings render.
      serviceTarget.scrollIntoView({ block: "start", behavior: "instant" });
      serviceScrollY = pageScrollY();
      if (serviceTarget.getBoundingClientRect().top <= 1) serviceResize.disconnect();
      didNavigate = true;
      scheduleUpdate();
    }
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
      setActive(serviceTarget?.open ? "#service-door" : current);
      const layer=document.elementsFromPoint(window.innerWidth/2,window.innerHeight-44)
        .find(el=>el.closest("main"));
      setDark(!!layer?.closest(".staff-activity,.service-drinks"));
    }
    function scheduleUpdate() {
      if (!frame) frame=requestAnimationFrame(update);
    }
    function onScroll() {
      if (serviceTarget && Math.abs(pageScrollY() - serviceScrollY) > 1) releaseService();
      didScroll = true;
      scheduleUpdate();
    }
    function onNavigate(hash: string) {
      releaseService();
      if (hash === "#service-door") {
        serviceTarget = document.querySelector<HTMLDetailsElement>(hash);
        if (serviceTarget) {
          serviceTarget.open = true;
          serviceResize.observe(serviceTarget);
          alignService();
        }
      }
      // Native fragment links can scroll the page before the next paint.
      didNavigate = true;
      scheduleUpdate();
    }
    function onMenuClick(event: MouseEvent) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link) onNavigate(link.hash);
    }
    function onHashChange() { onNavigate(window.location.hash); }
    const nav = menu.current;
    if (window.location.hash === "#service-door") onHashChange();
    update();
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",scheduleUpdate);
    window.addEventListener("hashchange",onHashChange);
    nav?.addEventListener("click",onMenuClick);
    return ()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",scheduleUpdate);
      window.removeEventListener("hashchange",onHashChange);
      nav?.removeEventListener("click",onMenuClick);
      releaseService();
      cancelAnimationFrame(frame);
    };
  },[]);
  return <div className="staff-quick-dock">
    <nav ref={menu} aria-label="Schnellzugriff" className="staff-quick" data-hidden={hidden} data-dark={dark}>
      {destinations.map(({href,label,icon:Icon})=><a key={href} href={href} aria-current={active === href ? "location" : undefined}>
        <Icon size={20} aria-hidden="true"/>{label}</a>)}
    </nav>
  </div>;
}

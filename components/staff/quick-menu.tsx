"use client";

import { Activity, LayoutGrid, ClipboardList, Martini, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const destinations = [
  { href:"#bar-monitor", label:"Bar", icon:Activity, sections:"#bar-monitor, #bestseller" },
  { href:"#bar-orders", label:"Drinks", icon:Martini, sections:"#bar-orders" },
  { href:"#food-orders", label:"Food", icon:Utensils, sections:"#food-orders" },
  { href:"#service-door", label:"Service", icon:ClipboardList,
    sections:'[aria-labelledby="tonight-team"], [aria-labelledby="ticket-title"], #performance, #service-door' },
  { href:"#staff-tools", label:"Tools", icon:LayoutGrid, sections:"#staff-tools" },
];

const hideAfterDownwardScroll = 24;
const showAfterUpwardScroll = 12;
const showAfterIdleMs = 850;

function pageScrollY() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(window.scrollY, max));
}

function visibleDestination(y: number) {
  if (y <= 1) return "#bar-monitor";
  if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) return "#staff-tools";

  const viewport = window.visualViewport;
  const readingLine = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) * 0.4;
  let current = "#bar-monitor";
  let nearest = -Infinity;
  for (const { href, sections } of destinations) {
    for (const section of document.querySelectorAll<HTMLElement>(sections)) {
      const top = section.getBoundingClientRect().top;
      if (top <= readingLine && top > nearest) {
        nearest = top;
        current = href;
      }
    }
  }
  return current;
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
    let idleTimer = 0;
    let tappedDestination: string | undefined;
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
        window.clearTimeout(idleTimer);
        setHidden(false);
      } else if (didScroll && y !== lastY) {
        tappedDestination = undefined;
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
          travel = 0;
          setHidden(false);
        }, showAfterIdleMs);
        const delta = y - lastY;
        if (delta > 0) travel = Math.max(0, travel) + delta;
        if (delta < 0) travel = Math.min(0, travel) + delta;
        if (y <= 32 || travel <= -showAfterUpwardScroll) setHidden(false);
        else if (travel >= hideAfterDownwardScroll) setHidden(true);
      }
      lastY = y;
      didScroll = false;
      didNavigate = false;
      setActive(tappedDestination ?? visibleDestination(y));
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
      tappedDestination = destinations.find(({ href }) => href === hash)?.href;
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
    const main = nav?.closest(".staff-shell")?.querySelector("main");
    const layoutResize = new ResizeObserver(scheduleUpdate);
    if (main) layoutResize.observe(main);
    if (window.location.hash === "#service-door") onHashChange();
    update();
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",scheduleUpdate);
    window.visualViewport?.addEventListener("resize",scheduleUpdate);
    window.addEventListener("hashchange",onHashChange);
    nav?.addEventListener("click",onMenuClick);
    return ()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",scheduleUpdate);
      window.visualViewport?.removeEventListener("resize",scheduleUpdate);
      window.removeEventListener("hashchange",onHashChange);
      nav?.removeEventListener("click",onMenuClick);
      releaseService();
      layoutResize.disconnect();
      window.clearTimeout(idleTimer);
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

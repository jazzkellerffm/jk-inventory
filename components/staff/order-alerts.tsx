"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { isDrink } from "@/lib/staff/bar-workload";
import type { StaffBoard, ReceiptItem } from "@/lib/staff/types";
import type { FoodOrder } from "@/lib/staff/food";

import type { BookingAlert } from "@/lib/staff/tickets";

const modes = { off: "Aus", drink: "Drinks", food: "Essen", both: "Drinks + Essen", booking: "Buchungen", drinkBooking: "Drinks + Buchungen", foodBooking: "Essen + Buchungen", all: "Alle Hinweise" };
type Mode = keyof typeof modes;
type Notice = { kind: "drink" | "food" | "booking"; booking?: BookingAlert; label: string; target: string };
const describe = (items: ReceiptItem[]) => items.map(i => (i.quantity ? i.quantity + " × " : "") + i.name).join(" · ");

function enabled(mode: Mode, kind: Notice["kind"]) {
  return mode === "all" || mode === kind || (mode === "both" && kind !== "booking")
    || (mode === "drinkBooking" && kind !== "food") || (mode === "foodBooking" && kind !== "drink");
}

function bookingNotice(booking: BookingAlert): Notice {
  return {kind: "booking", label: "Neue Buchung · " + booking.label, target: "ticket-title", booking};
}

function chime(ctx: AudioContext, kind: Notice["kind"]) {

  const notes = kind === "booking" ? [523, 659, 784] : kind === "food" ? [660, 494] : [880];
  notes.forEach((frequency, index) => {
    const start = ctx.currentTime + index * 0.17;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  });
}

export function OrderAlerts({board, food, demo, bookings, onBooking}: {bookings?: BookingAlert[]; onBooking: (booking: BookingAlert) => void; board?: StaffBoard; food?: FoodOrder[]; demo: boolean}) {
  const [mode, setMode] = useState<Mode>("off");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioFailed, setAudioFailed] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const since = useRef(Infinity);
  const seen = useRef(new Map<string, number>());
  const pending = useRef<Notice[]>([]);

  const orderBatch = useRef<Notice[]>([]);
  const batch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const storageKey = "jkos-order-tones-" + (demo ? "demo" : "staff");
  const [preferred, setPreferred] = useState<Mode>("all");
  useEffect(() => {
    let selection: Mode = "all";
    let muted = false;
    try {
      setSoundEnabled(localStorage.getItem(storageKey + "-sound") !== "off");
      const saved = localStorage.getItem(storageKey);
      if (saved && saved !== "off" && Object.hasOwn(modes, saved)) selection = saved as Mode;
      muted = saved === "off" || localStorage.getItem(storageKey + "-muted") === "true";
    } catch {}
    since.current = Date.now();
    setPreferred(selection);
    setMode(muted ? "off" : selection);
    return () => { clearTimeout(batch.current); clearTimeout(dismiss.current); if (ctx.current) { void ctx.current.close().catch(()=>{}); ctx.current = null; } };
  }, [storageKey]);

  const unlockAudio = useCallback(() => {
    try {
      const audio = ctx.current ??= new AudioContext();
      if (audio.state !== "running") {
        void audio.resume().catch(() => { if (ctx.current === audio) setAudioFailed(true); });
      }
      const primer = audio.createBufferSource();
      primer.buffer = audio.createBuffer(1, 1, audio.sampleRate);
      primer.connect(audio.destination);
      primer.onended = () => primer.disconnect();
      primer.start();
      setAudioFailed(false);
    } catch { setAudioFailed(true); }
  }, []);

  useEffect(() => {
    if (mode === "off" || !soundEnabled) return;
    function onInteraction() {
      if (ctx.current?.state !== "running") unlockAudio();
    }
    window.addEventListener("touchend", onInteraction, {capture: true, passive: true});
    window.addEventListener("click", onInteraction, true);
    window.addEventListener("keydown", onInteraction, true);
    return () => {
      window.removeEventListener("touchend", onInteraction, true);
      window.removeEventListener("click", onInteraction, true);
      window.removeEventListener("keydown", onInteraction, true);
    };
  }, [mode, soundEnabled, unlockAudio]);

  function closeAudio() {
    const audio = ctx.current;
    ctx.current = null;
    if (audio) void audio.close().catch(() => {});
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAudioFailed(false);
    try { localStorage.setItem(storageKey + "-sound", next ? "on" : "off"); } catch {}
    if (next) unlockAudio();
    else closeAudio();
  }

  function activate(value: Mode) {
    since.current = Date.now();
    pending.current = [];
    orderBatch.current = [];
    clearTimeout(batch.current);
    batch.current = undefined;
    clearTimeout(dismiss.current);
    dismiss.current = undefined;
    setNotice(null);
    setMode(value);
    setAudioFailed(false);
    try {
      if (value === "off") localStorage.setItem(storageKey + "-muted", "true");
      else {
        localStorage.setItem(storageKey, value);
        localStorage.removeItem(storageKey + "-muted");
      }
    } catch {}
    if (value === "off") closeAudio();
    else {
      setPreferred(value);
      if (soundEnabled) unlockAudio();
    }
  }

  const advance = useCallback(function next() {
    clearTimeout(dismiss.current);
    dismiss.current = undefined;
    if (document.hidden) pending.current = [];
    const item = pending.current.shift();
    setNotice(item ?? null);
    if (!item) return;
    const timer = setTimeout(next, item.kind === "booking" ? 8000 : 20000);
    dismiss.current = timer;

  }, []);

  const queue = useCallback((item: Notice) => {
    const queuedAt = Date.now();
    if (soundEnabled && !document.hidden) {
      try {
        const audio = ctx.current ??= new AudioContext();
        // Expire a delayed resume so an old alert cannot sound on a later tap.
        if (audio.state === "running") chime(audio, item.kind);
        else void audio.resume().then(() => {
          if (ctx.current === audio && !document.hidden && Date.now() - queuedAt < 1500) chime(audio, item.kind);
        }).catch(() => setAudioFailed(true));
      } catch { setAudioFailed(true); }
    }
    pending.current.push(item);
    if (dismiss.current === undefined) advance();
  }, [advance, soundEnabled]);

  const queueOrder = useCallback((item: Notice) => {
    orderBatch.current.push(item);
    if (batch.current !== undefined) return;
    batch.current = setTimeout(() => {
      batch.current = undefined;
      const list = orderBatch.current.splice(0);
      if (document.hidden || !list.length) return;
      const groups = new Map<string, Notice[]>();
      for(const notice of list){const key=notice.target;const group=groups.get(key)??[];group.push(notice);groups.set(key,group);}
      for(const group of groups.values()){const first=group[0];queue(group.length===1?first:{...first,label:group.length+" neue Bestellhinweise · "+(first.target==="included-title"?"Included Drinks":"SumUp")});}
    },350);
  },[queue]);

  useEffect(() => {
    if (mode === "off" || demo) return;
    const now = Date.now();
    const cutoff = now - 10 * 60_000;
    for (const [id, at] of seen.current) if (at < cutoff) seen.current.delete(id);
    function accept(id: string, at: string, n: Notice) {
      const timestamp = Date.parse(at);
      if (!(timestamp >= Math.max(since.current, n.kind === "booking" ? cutoff : now - 120_000)) || seen.current.has(id)) return;
      seen.current.set(id,timestamp);
      if (!document.hidden && enabled(mode, n.kind)) {
        if (n.kind === "booking") queue(n);
        else queueOrder(n);
      }
    }
    for (const booking of bookings ?? []) {
      accept("booking/" + booking.id, new Date(booking.at * 1000).toISOString(), bookingNotice(booking));
    }
    if (board?.drinksState === "ready") for (const order of board.drinks?.orders ?? []) {
      if (order.status === "open") accept("included/"+order.id,order.at,{kind:"drink",label:describe(order.items)+(order.table?.trim() ? " · Tisch "+order.table.trim() : " · Included Drinks"),target:"included-title"});
    }
    if (board?.feedState === "ready") for (const pay of board.feed?.payments ?? []) {
      const drinks = pay.items.filter(item=>isDrink(item.name));
      if (!pay.items.length && pay.summary && /^mini dream$/i.test(pay.summary)) drinks.push({name:pay.summary,quantity:null});
      if (drinks.length) accept("sumup/"+pay.id,pay.at,{kind:"drink",label:describe(drinks)+" · SumUp",target:"payments"});
    }
    for (const order of food ?? []) accept("food/"+order.id,order.at,{kind:"food",label:order.description+" · SumUp",target:"food-orders"});
  }, [mode,demo,board,food,bookings,queue,queueOrder]);

  return <aside className="staff-alert-controls" aria-label="Bestellhinweise">
    <button type="button" aria-pressed={mode !== "off"} onClick={()=>activate(mode==="off" ? preferred : "off")}><Bell size={15}/> {mode==="off" ? "Hinweise aktivieren" : "Hinweise an"}</button>
    {mode!=="off" && <select aria-label="Bestellhinweise für" value={mode} onChange={e=>activate(e.target.value as Mode)}>
      {(["drink","food","both","booking","drinkBooking","foodBooking","all"] as const).map(m=><option key={m} value={m}>{modes[m]}</option>)}
    </select>}
    {mode !== "off" && <button type="button" aria-label="Hinweistöne" title={soundEnabled ? "Ton ausschalten" : "Ton einschalten"} aria-pressed={soundEnabled} onClick={toggleSound}>
      {soundEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
    </button>}
    {demo && mode!=="off" && (["drink","food"] as const).filter(k=>enabled(mode,k)).map(k=>
      <button key={k} onClick={()=>queue(k==="drink" ? {kind:k,label:"2 × Basil Bliss · Tisch 12",target:"included-title"} : {kind:k,label:"2 × Hummus-Platte · SumUp",target:"food-orders"})}>{k==="drink" ? "Drink testen" : "Essen testen"}</button>)}
    {mode !== "off" && enabled(mode,"booking") && <button type="button" onClick={()=>queue(bookingNotice({
      id:"test", at:Date.now()/1000, label:"Premium – 2 Guests · Test", eventName:"Testbuchung"
    }))}>Buchung testen</button>}
    {soundEnabled && mode !== "off" && audioFailed && <small role="status">Ton nicht verfügbar. Hinweise erscheinen oben.</small>}
    <div role="status" aria-live="polite">{notice && <a className="staff-order-banner" data-kind={notice.kind} data-source={notice.target==="included-title"?"included":notice.target==="payments"?"sumup":undefined} href={"#"+notice.target} onClick={()=>{if (notice.booking) onBooking(notice.booking); advance();}}>{notice.label}</a>}</div>
  </aside>;
}


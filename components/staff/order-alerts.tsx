"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { isDrink } from "@/lib/staff/bar-workload";
import type { StaffBoard, ReceiptItem } from "@/lib/staff/types";
import type { FoodOrder } from "@/lib/staff/food";

const modes = { off: "Aus", drink: "Drinks", food: "Essen", both: "Beides" };
type Mode = keyof typeof modes;
type Notice = { kind: "drink" | "food"; label: string; target: string };
const describe = (items: ReceiptItem[]) => items.map(i => (i.quantity ? i.quantity + " × " : "") + i.name).join(" · ");

function playbackMode(active: boolean) {
  const session = (navigator as Navigator & {audioSession?: {type: string}}).audioSession;
  if (session) {
    try { session.type = active ? "playback" : "auto"; } catch {}
  }
}

function chime(ctx: AudioContext, kind: Notice["kind"]) {

  const notes = kind === "food" ? [660, 494] : [880];
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

export function OrderAlerts({board, food, demo}: {board?: StaffBoard; food?: FoodOrder[]; demo: boolean}) {
  const [mode, setMode] = useState<Mode>("off");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const since = useRef(Infinity);
  const seen = useRef(new Map<string, number>());
  const pending = useRef<Notice[]>([]);
  const batch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismiss = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const storageKey = "jkos-order-tones-" + (demo ? "demo" : "staff");
  const [preferred, setPreferred] = useState<Mode>("both");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && Object.hasOwn(modes, saved)) setPreferred(saved as Mode);
    } catch {}
    return () => { clearTimeout(batch.current); clearTimeout(dismiss.current); if (ctx.current) { playbackMode(false); void ctx.current.close().catch(()=>{}); ctx.current = null; } };
  }, [storageKey]);

  function activate(value: Mode) {
    since.current = Date.now();
    pending.current = [];
    clearTimeout(batch.current);
    clearTimeout(dismiss.current);
    batch.current = undefined;
    setNotice(null);
    setMode(value);
    setAudioFailed(false);
    playbackMode(value !== "off");
    if (value === "off") return;
    setPreferred(value);
    try { localStorage.setItem(storageKey,value); } catch {}
    try {
      ctx.current ??= new AudioContext();
      void ctx.current.resume().catch(() => setAudioFailed(true));
    } catch { setAudioFailed(true); }
  }

  const present = useCallback((item: Notice) => {
    const audio = ctx.current;
    if (audio) {
      void audio.resume().catch(() => setAudioFailed(true));
      chime(audio, item.kind);
    }
    setNotice(item);
    clearTimeout(dismiss.current);
    dismiss.current = setTimeout(()=>setNotice(null),20_000);
  }, []);

  const queue = useCallback((item: Notice) => {
    pending.current.push(item);
    if (batch.current !== undefined) return;
    batch.current = setTimeout(() => {
      batch.current = undefined;
      const list = pending.current.splice(0);
      if (document.hidden || !list.length) return;
      const first = list.find(n=>n.kind==="food") ?? list[0];
      present(list.length === 1 ? first : {...first,label:list.length+" neue Bestellhinweise"});
    },350);
  }, [present]);

  useEffect(() => {
    if (mode === "off" || demo) return;
    const now = Date.now();
    const cutoff = now - 2 * 60_000;
    for (const [id, at] of seen.current) if (at < cutoff) seen.current.delete(id);
    function accept(id: string, at: string, n: Notice) {
      const timestamp = Date.parse(at);
      if (!(timestamp >= Math.max(since.current, cutoff)) || seen.current.has(id)) return;
      seen.current.set(id,timestamp);
      if (!document.hidden && (mode === "both" || mode === n.kind)) queue(n);
    }
    if (board?.drinksState === "ready") for (const order of board.drinks?.orders ?? []) {
      if (order.status === "open") accept("included/"+order.id,order.at,{kind:"drink",label:describe(order.items)+(order.table?.trim() ? " · Tisch "+order.table.trim() : " · Included Drinks"),target:"included-title"});
    }
    if (board?.feedState === "ready") for (const pay of board.feed?.payments ?? []) {
      const drinks = pay.items.filter(item=>isDrink(item.name));
      if (drinks.length) accept("sumup/"+pay.id,pay.at,{kind:"drink",label:describe(drinks)+" · SumUp",target:"payments"});
    }
    for (const order of food ?? []) accept("food/"+order.id,order.at,{kind:"food",label:order.description+" · SumUp",target:"food-orders"});
  }, [mode,demo,board,food,queue]);

  return <aside className="staff-alert-controls" aria-label="Bestellhinweise">
    <button type="button" aria-pressed={mode !== "off"} onClick={()=>activate(mode==="off" ? preferred : "off")}><Bell size={15}/> {mode==="off" ? "Hinweise aktivieren" : "Hinweise an"}</button>
    {mode!=="off" && <select aria-label="Bestellhinweise für" value={mode} onChange={e=>activate(e.target.value as Mode)}>
      {(["drink","food","both"] as const).map(m=><option key={m} value={m}>{modes[m]}</option>)}
    </select>}
    {demo && mode!=="off" && (["drink","food"] as const).filter(k=>mode==="both" || mode===k).map(k=>
      <button key={k} onClick={()=>present(k==="drink" ? {kind:k,label:"2 × Basil Bliss · Tisch 12",target:"included-title"} : {kind:k,label:"2 × Hummus-Platte · SumUp",target:"food-orders"})}>{k==="drink" ? "Drink testen" : "Essen testen"}</button>)}
    {audioFailed && <small role="status">Ton nicht verfügbar. Hinweise erscheinen oben.</small>}
    <div role="status" aria-live="polite">{notice && <a className="staff-order-banner" data-kind={notice.kind} href={"#"+notice.target} onClick={()=>setNotice(null)}>{notice.label}</a>}</div>
  </aside>;
}

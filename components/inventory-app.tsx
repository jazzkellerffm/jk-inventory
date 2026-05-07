"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Package,
  StickyNote,
  XCircle,
} from "lucide-react";
import { aceBold, aceMedium } from "@/app/local-fonts";
import { appendSavedCheck } from "@/lib/check-storage";
import {
  createInitialInventory,
  INVENTORY_TOTAL,
  sectionDomId,
  sectionHeading,
  type InventoryItem,
  type StockStatus,
} from "@/lib/inventory-data";

const cream = "#F6F4EF";
const racing = "#0B3328";
const ok = "#2E7D32";
const low = "#C89B3C";
const critical = "#C62828";

/** Active category pill — muted dusty plum (PolySans pills only). */
const categoryNavActivePlum = "#766281";

/** JKOS system badge: dark green glass; image uses explicit max size caps. */
const jkosBadgeShellClass =
  "inline-flex h-[30px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.09] bg-[#1a2f2a]/90 px-[8px] shadow-[0_2px_10px_-4px_rgba(11,51,40,0.22)] backdrop-blur-[6px]";

function JkosSystemBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${jkosBadgeShellClass} ${className}`.trim()}
      aria-label="JKOS"
      title="JKOS"
    >
      <Image
        src="/JKOS.png"
        alt=""
        width={560}
        height={200}
        sizes="60px"
        className="mx-auto block h-auto max-h-[16px] w-auto max-w-[60px] object-contain object-center opacity-[0.98]"
      />
    </div>
  );
}

const segTrack = "rounded-2xl bg-[#F2EFE9] p-1 ring-1 ring-inset ring-black/[0.04]";

const segBase =
  "font-poly-bulky flex-1 rounded-[11px] py-2.5 text-center text-[11px] font-bold tracking-[0.04em] transition-all duration-150 active:scale-[0.98]";

const segIdle = `${segBase} text-neutral-500 bg-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)]`;

const segOk = `${segBase} text-white bg-[#2E7D32] shadow-[0_0_0_1px_rgba(46,125,50,0.22),0_4px_14px_rgba(46,125,50,0.32),0_0_20px_rgba(46,125,50,0.28)]`;

const segLow = `${segBase} text-white bg-[#C89B3C] shadow-[0_0_0_1px_rgba(200,155,60,0.25),0_4px_16px_rgba(200,155,60,0.34),0_0_18px_rgba(200,155,60,0.26)]`;

const segCrit = `${segBase} text-white bg-[#C62828] shadow-[0_0_0_1px_rgba(183,28,28,0.45),0_6px_22px_rgba(198,40,40,0.5),0_0_26px_rgba(229,57,53,0.42),0_0_10px_rgba(198,40,40,0.45)]`;

function pickSeg(
  which: Exclude<StockStatus, "unchecked">,
  current: StockStatus,
): string {
  const selected = current === which;
  if (!selected) return segIdle;
  if (which === "ok") return segOk;
  if (which === "low") return segLow;
  return segCrit;
}

/** Stable token: inventory id + unit (e.g. foams-prep-gomme-syrup-bottle) */
function itemDomToken(it: InventoryItem): string {
  return `${it.id}-${it.unit.toLowerCase()}`;
}

type PillSurface = "inventory" | "dashboard";

/** Form / inventory list: unit + status share one footprint. */
const inventoryPillGeometry =
  "inline-flex shrink-0 items-center self-start rounded-full border border-solid px-2 py-1 text-[12px] leading-none tracking-tight";

/** Dashboard: unit = secondary context (smaller, neutral, no bulky). */
const dashboardUnitPillClass =
  "inline-flex shrink-0 items-center self-start rounded-full border border-solid border-[#E4E1DA] bg-[#EEEAE2] px-2 py-0.5 text-[10px] font-normal leading-none tracking-tight text-[#6B6B6B] font-poly-neutral";

/** Dashboard: status = primary signal (PolySans Bulky file, weight 400). */
const dashboardStatusPillBase =
  "inline-flex shrink-0 items-center self-start rounded-full border border-solid px-3 py-1 text-[12px] leading-none font-poly-bulky-badge tracking-[0.02em] shadow-sm";

const dashboardSectionTitleClass = `${aceMedium.className} text-[16px] font-medium uppercase leading-snug tracking-[0.08em] text-[#0B3328] sm:text-[17px]`;

function InventoryUnitPill({
  unit,
  surface = "inventory",
  "data-testid": dataTestId,
}: {
  unit: string;
  surface?: PillSurface;
  "data-testid"?: string;
}) {
  const shell =
    surface === "dashboard"
      ? dashboardUnitPillClass
      : `${inventoryPillGeometry} font-poly-bulky border-[#D8D4CC] bg-[#EEEAE2] text-[#4A4A4A]`;

  return (
    <span data-testid={dataTestId} className={shell}>
      {unit}
    </span>
  );
}

const staffInputClass =
  "font-poly-neutral mt-2 w-full rounded-2xl border border-neutral-200/80 bg-white px-4 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 outline-none transition-[box-shadow,border-color] focus-visible:border-[#0B3328]/30 focus-visible:shadow-[0_0_0_3px_rgba(11,51,40,0.1)]";

const noteFieldClass =
  "jk-note-input mt-3 w-full rounded-2xl border border-neutral-200/40 bg-[#FAF8F3] px-4 py-3 text-sm text-neutral-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[box-shadow,border-color,background-color] placeholder:italic placeholder:text-neutral-400/85 focus-visible:border-[#0B3328]/22 focus-visible:bg-white focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),0_0_0_3px_rgba(11,51,40,0.08)]";

const generalShiftNotesFieldClass =
  "jk-note-input min-h-[5.5rem] w-full resize-y rounded-2xl border border-neutral-200 bg-[#FAF8F3] px-4 py-3 text-sm leading-relaxed text-neutral-900 outline-none transition-[border-color,background-color,box-shadow] placeholder:italic placeholder:text-neutral-400/75 focus-visible:border-[#0B3328]/25 focus-visible:bg-[#FCFAF6] focus-visible:shadow-[0_0_0_3px_rgba(11,51,40,0.06)]";

/** Sticky bar + breathing room for `scrollIntoView` / scroll-margin. */
const CATEGORY_STICKY_SCROLL_PAD_PX = 76;

const categoryPillBaseClass =
  "font-poly-neutral inline-flex h-[34px] shrink-0 snap-start items-center justify-center rounded-[10px] px-[1.35rem] text-[13px] font-medium leading-none tracking-[0.01em] transition-[background-color,color,transform,box-shadow] duration-200 ease-out [-webkit-tap-highlight-color:transparent] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#766281]/22 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF] active:scale-[0.98]";

const categoryPillInactiveClass = `${categoryPillBaseClass} bg-[#E8E5DF] text-[#1a1a1a]`;

const categoryPillActiveClass = `${categoryPillBaseClass} text-white shadow-[0_1px_3px_rgba(118,98,129,0.28)]`;

const categoryNavScrollerClass =
  "flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function InventoryApp() {
  const [view, setView] = useState<"form" | "dashboard">("form");
  const [items, setItems] = useState<InventoryItem[]>(() =>
    createInitialInventory(),
  );
  const [staffName, setStaffName] = useState("");
  const [nameBlurred, setNameBlurred] = useState(false);
  const [nameSubmitAttempted, setNameSubmitAttempted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");
  /** Snapshot from saved check for dashboard display. */
  const [dashboardGeneralNotes, setDashboardGeneralNotes] = useState("");
  /** Shift notes panel: collapsed saves space; expand to edit (scrollable, not fixed). */
  const [shiftNotesOpen, setShiftNotesOpen] = useState(false);
  const shiftNotesSectionRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const pillRefsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollSyncSkipRef = useRef(false);
  const categoryNavScrollSourceRef = useRef<"scroll" | "tap">("scroll");
  const [copyMissingCopied, setCopyMissingCopied] = useState(false);
  const copyMissingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /** Same section order as the list below: first index where each `section` appears in `items`. */
  const categoryNavItems = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const it of items) {
      if (!seen.has(it.section)) {
        seen.add(it.section);
        order.push(it.section);
      }
    }
    return order.map((section) => ({ section, label: section }));
  }, [items]);

  const [activeCategorySection, setActiveCategorySection] = useState("");
  useEffect(() => {
    const first = categoryNavItems[0]?.section ?? "";
    setActiveCategorySection((prev) =>
      prev && categoryNavItems.some((c) => c.section === prev) ? prev : first,
    );
  }, [categoryNavItems]);

  const scrollToCategorySection = useCallback((section: string) => {
    const el = document.getElementById(sectionDomId(section));
    if (!el) return;
    scrollSyncSkipRef.current = true;
    categoryNavScrollSourceRef.current = "tap";
    setActiveCategorySection(section);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollSyncSkipRef.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    const sections = categoryNavItems.map((c) => c.section);
    if (sections.length === 0) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      if (scrollSyncSkipRef.current) return;
      const line = CATEGORY_STICKY_SCROLL_PAD_PX + 14;
      let current = sections[0]!;
      for (const sec of sections) {
        const el = document.getElementById(sectionDomId(sec));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = sec;
      }
      setActiveCategorySection((p) => (p === current ? p : current));
    };

    const onScrollOrResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    update();
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [categoryNavItems]);

  useEffect(() => {
    if (!activeCategorySection) return;
    const btn = pillRefsRef.current.get(activeCategorySection);
    btn?.scrollIntoView({
      behavior:
        categoryNavScrollSourceRef.current === "tap" ? "smooth" : "auto",
      inline: "center",
      block: "nearest",
    });
    categoryNavScrollSourceRef.current = "scroll";
  }, [activeCategorySection]);

  useEffect(() => {
    return () => {
      if (copyMissingTimerRef.current) clearTimeout(copyMissingTimerRef.current);
    };
  }, []);

  const showStaffNameError =
    !staffName.trim() && (nameBlurred || nameSubmitAttempted);

  const checkedCount = useMemo(
    () => items.filter((i) => i.status !== "unchecked").length,
    [items],
  );

  const counts = useMemo(() => {
    let okC = 0,
      lowC = 0,
      critC = 0,
      unC = 0;
    for (const i of items) {
      if (i.status === "ok") okC++;
      else if (i.status === "low") lowC++;
      else if (i.status === "critical") critC++;
      else unC++;
    }
    return { ok: okC, low: lowC, critical: critC, unchecked: unC };
  }, [items]);

  const attention = useMemo(() => {
    const criticalItems = items.filter((i) => i.status === "critical");
    const lowItems = items.filter((i) => i.status === "low");
    return { criticalItems, lowItems };
  }, [items]);

  /** Dashboard full list: critical first, low second, then OK / not checked. */
  const dashboardOrderedItems = useMemo(() => {
    const rank: Record<StockStatus, number> = {
      critical: 0,
      low: 1,
      ok: 2,
      unchecked: 3,
    };
    return [...items].sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        a.section.localeCompare(b.section) ||
        a.name.localeCompare(b.name),
    );
  }, [items]);

  const missingItemsShareText = useMemo(() => {
    if (!submittedAt) return "";
    return buildMissingItemsShareText(
      submittedAt,
      attention.criticalItems,
      attention.lowItems,
      staffName.trim(),
      dashboardGeneralNotes,
    );
  }, [submittedAt, attention, staffName, dashboardGeneralNotes]);

  const handleCopyMissingItems = useCallback(async () => {
    if (!missingItemsShareText) return;
    try {
      await navigator.clipboard.writeText(missingItemsShareText);
      if (copyMissingTimerRef.current) clearTimeout(copyMissingTimerRef.current);
      setCopyMissingCopied(true);
      copyMissingTimerRef.current = setTimeout(() => {
        setCopyMissingCopied(false);
        copyMissingTimerRef.current = null;
      }, 2000);
    } catch {
      /* ignore */
    }
  }, [missingItemsShareText]);

  function setStatus(id: string, status: StockStatus) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
  }

  function setNote(id: string, note: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, note } : it)));
  }

  function handleSubmit() {
    const name = staffName.trim();
    if (!name) {
      setNameSubmitAttempted(true);
      return;
    }
    setNameSubmitAttempted(false);

    const at = new Date();
    const checked = items.filter((i) => i.status !== "unchecked").length;
    const saved = appendSavedCheck({
      staffName: name,
      submittedAt: at.toISOString(),
      checkedCount: checked,
      totalCount: INVENTORY_TOTAL,
      counts: { ...counts },
      generalNotes: generalNotes.trim(),
      items: items.map((i) => ({
        id: i.id,
        section: i.section,
        name: i.name,
        unit: i.unit,
        status: i.status,
        note: i.note,
      })),
    });

    setDashboardGeneralNotes(saved.generalNotes);
    setSubmittedAt(at);
    setView("dashboard");
  }

  function startNewCheck() {
    setItems(createInitialInventory());
    setStaffName("");
    setNameBlurred(false);
    setNameSubmitAttempted(false);
    setSubmittedAt(null);
    setGeneralNotes("");
    setDashboardGeneralNotes("");
    setShiftNotesOpen(false);
    setCopyMissingCopied(false);
    if (copyMissingTimerRef.current) {
      clearTimeout(copyMissingTimerRef.current);
      copyMissingTimerRef.current = null;
    }
    setView("form");
  }

  function openShiftNotesPanel() {
    setShiftNotesOpen(true);
    queueMicrotask(() => {
      shiftNotesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  if (view === "dashboard" && submittedAt) {
    const submittedLabel = submittedAt.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    return (
      <div className="min-h-dvh pb-8" style={{ backgroundColor: cream }}>
        <main className="relative mx-auto max-w-md px-4 pt-7">
          <div className="pointer-events-none absolute right-4 top-5 z-10 sm:top-6">
            <JkosSystemBadge />
          </div>
          <header className="text-center">
            <h1
              className={`${aceBold.className} text-[1.7rem] leading-[1.15] tracking-tight text-neutral-900 sm:text-[1.85rem]`}
            >
              JK Inventory Report
            </h1>
            <p className="font-poly-neutral mx-auto mt-3 max-w-[20rem] text-[15px] leading-snug text-neutral-600">
              <span className="font-poly-bulky text-neutral-800">
                {staffName.trim()}
              </span>
              <span className="text-neutral-300"> · </span>
              <span className="text-neutral-600">{submittedLabel}</span>
            </p>
          </header>

          <button
            type="button"
            onClick={handleCopyMissingItems}
            className="font-poly-neutral mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200/80 bg-white py-3 text-sm font-medium text-[#0B3328] shadow-[0_2px_12px_rgba(11,51,40,0.05)] transition-[transform,background-color,box-shadow] hover:bg-[#FAFAF8] active:scale-[0.99] active:bg-neutral-100/90"
          >
            <Copy className="size-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
            {copyMissingCopied ? "Copied" : "Copy missing items"}
          </button>

          {dashboardGeneralNotes.trim() ? (
            <section className="mt-5 rounded-2xl border border-neutral-100/80 bg-white p-4 shadow-[0_4px_20px_rgba(11,51,40,0.055)]">
              <h2
                className={`${aceMedium.className} flex items-center gap-2 text-[15px] font-medium leading-snug text-[#0B3328] sm:text-[16px]`}
              >
                <StickyNote
                  className="size-4 shrink-0 text-[#0B3328]/70"
                  strokeWidth={2}
                  aria-hidden
                />
                Notes for next shift
              </h2>
              <p className="font-poly-neutral mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                {dashboardGeneralNotes.trim()}
              </p>
            </section>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
            <DashboardStatPill variant="ok" label="OK" value={counts.ok} />
            <DashboardStatPill variant="low" label="LOW" value={counts.low} />
            <DashboardStatPill
              variant="critical"
              label="CRITICAL"
              value={counts.critical}
            />
            <DashboardStatPill
              variant="unchecked"
              label="NOT CHECKED"
              value={counts.unchecked}
            />
          </div>

          {(attention.criticalItems.length > 0 ||
            attention.lowItems.length > 0) && (
            <section className="mt-6 space-y-3.5">
              {attention.criticalItems.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-red-200/70 bg-gradient-to-b from-red-100/55 via-red-50/50 to-red-50/20 p-4 shadow-[0_8px_32px_rgba(198,40,40,0.16)] ring-1 ring-red-200/35">
                  <div
                    className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[#B71C1C] shadow-[0_0_16px_rgba(183,28,28,0.55)]"
                    aria-hidden
                  />
                  <div className="pl-4">
                    <h3
                      className={`flex items-center gap-2.5 ${dashboardSectionTitleClass}`}
                    >
                      <XCircle
                        className="size-5 shrink-0 text-[#C62828] drop-shadow-[0_2px_6px_rgba(198,40,40,0.4)]"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      CRITICAL ITEMS
                    </h3>
                    <ul className="font-poly-neutral mt-3 space-y-2">
                      {attention.criticalItems.map((it) => (
                        <li
                          key={it.id}
                          className="rounded-xl bg-white/70 px-2.5 py-1.5 ring-1 ring-red-200/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 font-poly-bulky text-[13px] leading-snug text-neutral-900">
                              {it.name}
                            </p>
                            <InventoryUnitPill surface="dashboard" unit={it.unit} />
                          </div>
                          {it.note.trim() ? (
                            <DashboardItemNote text={it.note.trim()} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {attention.lowItems.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/40 bg-gradient-to-b from-amber-50/55 via-amber-50/25 to-white/80 p-3.5 shadow-[0_4px_18px_rgba(200,155,60,0.08)] ring-1 ring-amber-100/35">
                  <div
                    className="absolute inset-y-2 left-0 w-px rounded-full bg-[#D4A84B]/90"
                    aria-hidden
                  />
                  <div className="pl-3">
                    <h3
                      className={`flex items-center gap-2 ${dashboardSectionTitleClass}`}
                    >
                      <AlertTriangle
                        className="size-[18px] shrink-0 text-[#C89B3C]"
                        strokeWidth={2}
                        aria-hidden
                      />
                      LOW ITEMS
                    </h3>
                    <ul className="font-poly-neutral mt-2 space-y-1.5">
                      {attention.lowItems.map((it) => (
                        <li
                          key={it.id}
                          className="rounded-xl bg-white/55 px-2.5 py-1.5 ring-1 ring-amber-100/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 font-poly-bulky text-[13px] leading-snug text-neutral-900">
                              {it.name}
                            </p>
                            <InventoryUnitPill surface="dashboard" unit={it.unit} />
                          </div>
                          {it.note.trim() ? (
                            <DashboardItemNote text={it.note.trim()} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-100/90 bg-white shadow-[0_4px_24px_rgba(11,51,40,0.06)]">
            <div className="border-b border-neutral-100/90 px-4 py-3">
              <h2 className={dashboardSectionTitleClass}>
                All items & notes
              </h2>
            </div>
            <ul className="font-poly-neutral max-h-[46vh] divide-y divide-neutral-100/95 overflow-y-auto overscroll-contain">
              {dashboardOrderedItems.map((it) => (
                <li key={it.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-poly-bulky text-[14px] leading-snug text-neutral-900">
                        {it.name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
                        {it.section}
                      </p>
                      {it.note.trim() ? (
                        <DashboardItemNote text={it.note.trim()} compact />
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-center gap-1 self-stretch pt-0.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <InventoryUnitPill surface="dashboard" unit={it.unit} />
                        <StatusBadge surface="dashboard" status={it.status} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={startNewCheck}
            className="font-poly-bulky mt-8 w-full rounded-2xl py-4 text-base text-white shadow-[0_8px_28px_rgba(11,51,40,0.22)] transition active:scale-[0.99]"
            style={{ backgroundColor: racing }}
          >
            Start new check
          </button>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh pb-24 sm:pb-28"
      style={{ backgroundColor: cream }}
    >
      <header className="mx-auto max-w-md px-4 pb-1 pt-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_12px_rgba(11,51,40,0.06)]"
            aria-hidden
          >
            <Package className="size-6" strokeWidth={1.75} color={racing} />
          </div>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 pt-0.5">
              <h1
                className={`${aceBold.className} text-2xl leading-tight tracking-tight`}
                style={{ color: racing }}
              >
                JK Inventory
              </h1>
              <p
                className="font-poly-bulky mt-0.5 text-[15px]"
                style={{ color: racing }}
              >
                Fast Stock Check
              </p>
              <p className="font-poly-neutral mt-2 text-xs leading-relaxed text-neutral-400">
                Tap to update stock levels, scroll for more.
              </p>
            </div>
            <JkosSystemBadge className="mt-1.5 sm:mt-2" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4">
        <div className="mt-3 rounded-2xl border border-neutral-100/90 bg-white px-4 py-3 shadow-[0_2px_14px_rgba(11,51,40,0.04)]">
          <ul className="flex flex-col gap-2.5">
            <li className="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
              <CheckCircle
                className="mr-2 size-4 shrink-0 text-[#3A7D40]"
                strokeWidth={2}
                aria-hidden
              />
              <span className="font-poly-bulky shrink-0 text-[15px] font-semibold leading-none text-[#2F6B34]">
                OK
              </span>
              <span
                className="font-poly-neutral ml-2.5 min-w-0 flex-1 truncate text-[12.5px] font-normal leading-none text-neutral-600 opacity-75 sm:ml-3"
                title="Enough for two or more nights"
              >
                — Enough for two or more nights
              </span>
            </li>
            <li className="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
              <AlertTriangle
                className="mr-2 size-4 shrink-0 text-[#B8893A]"
                strokeWidth={2}
                aria-hidden
              />
              <span className="font-poly-bulky shrink-0 text-[15px] font-semibold leading-none text-[#9E7228]">
                LOW
              </span>
              <span
                className="font-poly-neutral ml-2.5 min-w-0 flex-1 truncate text-[12.5px] font-normal leading-none text-neutral-600 opacity-75 sm:ml-3"
                title="Enough for one night, reorder soon"
              >
                — Enough for one night, reorder soon
              </span>
            </li>
            <li className="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
              <XCircle
                className="mr-2 size-4 shrink-0 text-[#C25555]"
                strokeWidth={2}
                aria-hidden
              />
              <span className="font-poly-bulky shrink-0 text-[15px] font-semibold leading-none text-[#B54A4A]">
                CRITICAL
              </span>
              <span
                className="font-poly-neutral ml-2.5 min-w-0 flex-1 truncate text-[12.5px] font-normal leading-none text-neutral-600 opacity-75 sm:ml-3"
                title="Not enough for tonight"
              >
                — Not enough for tonight
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(11,51,40,0.055)]">
          <label
            htmlFor="staff-name"
            className="font-poly-bulky text-sm text-neutral-700"
          >
            Staff Name
          </label>
          <input
            id="staff-name"
            name="staffName"
            autoComplete="name"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            onBlur={() => setNameBlurred(true)}
            placeholder="Your name"
            aria-invalid={showStaffNameError}
            className={`${staffInputClass} ${
              showStaffNameError
                ? "border-red-200 focus-visible:border-red-300/80 focus-visible:shadow-[0_0_0_3px_rgba(198,40,40,0.1)]"
                : ""
            }`}
          />
          {showStaffNameError ? (
            <p
              className="font-poly-neutral mt-2 text-sm font-medium text-red-700/85"
              role="alert"
            >
              Please enter your name before submitting.
            </p>
          ) : null}
        </div>

        {categoryNavItems.length > 0 ? (
          <nav
            aria-label="Inventory categories"
            className="sticky z-40 -mx-4 mt-4 border-b border-black/[0.03] bg-[#F6F4EF]/95 px-4 py-2.5 shadow-[0_8px_28px_-18px_rgba(11,51,40,0.12)] backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[#F6F4EF]/80"
            style={{ top: 0 }}
          >
            <div
              ref={categoryScrollRef}
              className={categoryNavScrollerClass}
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {categoryNavItems.map(({ label, section }) => {
                const active = activeCategorySection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    ref={(el) => {
                      if (el) pillRefsRef.current.set(section, el);
                      else pillRefsRef.current.delete(section);
                    }}
                    aria-current={active ? "true" : undefined}
                    onClick={() => scrollToCategorySection(section)}
                    className={
                      active ? categoryPillActiveClass : categoryPillInactiveClass
                    }
                    style={
                      active ? { backgroundColor: categoryNavActivePlum } : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}

        <div
          className={`space-y-4 pb-2 ${categoryNavItems.length > 0 ? "mt-4" : "mt-5"}`}
        >
          {items.map((it, idx) => {
            const showHeading =
              idx === 0 || items[idx - 1]!.section !== it.section;
            return (
              <div
                key={it.id}
                className={
                  showHeading ? (idx > 0 ? "pt-12" : "pt-3") : undefined
                }
              >
                {showHeading ? (
                  <h2
                    id={sectionDomId(it.section)}
                    style={{ scrollMarginTop: CATEGORY_STICKY_SCROLL_PAD_PX }}
                    className={`${aceMedium.className} mb-4 px-0.5 text-[18px] font-medium uppercase leading-snug tracking-[0.05em] text-[#0B3328] sm:text-[20px]`}
                  >
                    {sectionHeading(it.section)}
                  </h2>
                ) : null}
                <article
                  id={itemDomToken(it)}
                  data-testid={`item-${itemDomToken(it)}`}
                  className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(11,51,40,0.055)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 pr-1 font-poly-bulky text-[17px] leading-snug text-neutral-900">
                      {it.name}
                    </h3>
                    <InventoryUnitPill
                      unit={it.unit}
                      data-testid={`unit-${itemDomToken(it)}`}
                    />
                  </div>

                  <div
                    className={`mt-3.5 ${segTrack}`}
                    role="group"
                    aria-label={`${it.name}, ${it.unit}`}
                  >
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        data-testid={`${itemDomToken(it)}-ok`}
                        aria-pressed={it.status === "ok"}
                        aria-label={`${it.name}, ${it.unit}: OK`}
                        className={pickSeg("ok", it.status)}
                        onClick={() => setStatus(it.id, "ok")}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        data-testid={`${itemDomToken(it)}-low`}
                        aria-pressed={it.status === "low"}
                        aria-label={`${it.name}, ${it.unit}: LOW`}
                        className={pickSeg("low", it.status)}
                        onClick={() => setStatus(it.id, "low")}
                      >
                        LOW
                      </button>
                      <button
                        type="button"
                        data-testid={`${itemDomToken(it)}-critical`}
                        aria-pressed={it.status === "critical"}
                        aria-label={`${it.name}, ${it.unit}: CRITICAL`}
                        className={pickSeg("critical", it.status)}
                        onClick={() => setStatus(it.id, "critical")}
                      >
                        CRITICAL
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={it.note}
                    onChange={(e) => setNote(it.id, e.target.value)}
                    placeholder="Add note..."
                    className={noteFieldClass}
                    data-testid={`${itemDomToken(it)}-note`}
                    aria-label={`Note for ${it.name}, ${it.unit}`}
                  />
                </article>
              </div>
            );
          })}
        </div>

        <section
          id="shift-notes-section"
          ref={shiftNotesSectionRef}
          className="mt-8 scroll-mt-28 pb-3"
          aria-label="Notes for next shift"
        >
          {!shiftNotesOpen ? (
            <button
              type="button"
              onClick={openShiftNotesPanel}
              aria-expanded={false}
              className="font-poly-neutral flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3.5 text-left shadow-[0_2px_12px_rgba(11,51,40,0.05)] transition-[transform,background-color,box-shadow] hover:bg-[#FAFAF8] active:scale-[0.99] active:bg-neutral-100/90"
            >
              <span className="min-w-0 flex-1 pr-1">
                <span
                  className={`${aceMedium.className} block text-[15px] font-medium leading-snug text-[#0B3328]`}
                >
                  Notes for next shift
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-neutral-600">
                  {generalNotes.trim()
                    ? "Note added"
                    : "Missing prep, low stock, special notes"}
                </span>
              </span>
              <ChevronDown
                className="size-5 shrink-0 text-neutral-400"
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-[0_2px_14px_rgba(11,51,40,0.06)]">
              <button
                type="button"
                onClick={() => setShiftNotesOpen(false)}
                aria-expanded={true}
                aria-controls="general-shift-notes"
                className="font-poly-neutral flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-1 py-2 text-left transition-colors hover:bg-[#FAFAF8] active:bg-neutral-100/80"
              >
                <span
                  className={`${aceMedium.className} text-[15px] font-medium leading-snug text-[#0B3328]`}
                >
                  Notes for next shift
                </span>
                <ChevronUp
                  className="size-5 shrink-0 text-neutral-500"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              <textarea
                id="general-shift-notes"
                name="generalShiftNotes"
                rows={4}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Add a short note for the next shift…"
                className={`${generalShiftNotesFieldClass} mt-2`}
                aria-label="Notes for next shift"
              />
            </div>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-[22px] border border-neutral-200/50 bg-[rgba(255,255,255,0.94)] px-2.5 py-1.5 shadow-[0_10px_36px_rgba(11,51,40,0.09),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150">
          <button
            type="button"
            onClick={handleSubmit}
            className="font-poly-bulky flex min-h-[46px] min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-[14px] text-white transition active:scale-[0.99] active:opacity-95"
            style={{ backgroundColor: racing }}
          >
            <span className="truncate">Complete Stock Check</span>
          </button>
          <div className="flex h-[46px] shrink-0 items-center rounded-xl bg-[#F4F1EC] px-3 ring-1 ring-[#E8E4DC]/90">
            <span className="font-poly-bulky text-[16px] font-semibold tabular-nums tracking-tight text-[#1A1A1A]">
              {checkedCount} / {INVENTORY_TOTAL}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function dedupeItemsById(items: InventoryItem[]): InventoryItem[] {
  const seen = new Set<string>();
  const out: InventoryItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

/** One line per item; collapses note whitespace for WhatsApp readability. */
function formatShareItemLine(it: InventoryItem): string {
  const name = it.name.trim();
  const note = it.note.trim().replace(/\s+/g, " ");
  const base = `- ${name}`;
  return note ? `${base} (note: ${note})` : base;
}

function buildMissingItemsShareText(
  submittedAt: Date,
  criticalItems: InventoryItem[],
  lowItems: InventoryItem[],
  staffName: string,
  globalShiftNotes: string,
): string {
  const crit = dedupeItemsById(criticalItems);
  const low = dedupeItemsById(lowItems);
  const dateStr = submittedAt.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
  const timeStr = submittedAt.toLocaleTimeString(undefined, {
    timeStyle: "short",
  });
  const blocks: string[] = [
    `JK Inventory · ${dateStr} · ${timeStr} · ${staffName}`,
  ];

  if (crit.length > 0) {
    blocks.push(["🔴 CRITICAL", ...crit.map(formatShareItemLine)].join("\n"));
  }
  if (low.length > 0) {
    blocks.push(["🟡 LOW", ...low.map(formatShareItemLine)].join("\n"));
  }
  if (globalShiftNotes.trim()) {
    blocks.push(
      ["📝 NOTES FOR NEXT SHIFT", globalShiftNotes].join("\n"),
    );
  }

  return blocks.join("\n\n");
}

function DashboardStatPill({
  variant,
  label,
  value,
}: {
  variant: "ok" | "low" | "critical" | "unchecked";
  label: string;
  value: number;
}) {
  const surfaces: Record<typeof variant, string> = {
    ok: "bg-gradient-to-br from-[#2E7D32]/14 via-white to-white ring-1 ring-[#2E7D32]/12",
    low: "bg-gradient-to-br from-[#C89B3C]/16 via-white to-white ring-1 ring-[#C89B3C]/14",
    critical:
      "bg-gradient-to-br from-[#C62828]/12 via-white to-white ring-1 ring-[#C62828]/12",
    unchecked:
      "bg-gradient-to-br from-neutral-200/35 via-white to-white ring-1 ring-neutral-200/60",
  };
  const colors: Record<typeof variant, string> = {
    ok,
    low,
    critical,
    unchecked: "#57534e",
  };

  return (
    <div
      className={`rounded-2xl p-3.5 shadow-[0_4px_18px_rgba(11,51,40,0.055)] ${surfaces[variant]}`}
    >
      <p className="font-poly-neutral text-[10px] font-semibold tracking-[0.06em] text-neutral-500">
        {label}
      </p>
      <p
        className="font-poly-bulky mt-1 text-[1.75rem] leading-none tracking-tight tabular-nums sm:text-[2rem]"
        style={{ color: colors[variant] }}
      >
        {value}
      </p>
    </div>
  );
}

function DashboardItemNote({
  text,
  compact,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-neutral-200/60 bg-neutral-50/90 ${compact ? "mt-1.5 px-2 py-1.5" : "mt-2 px-2.5 py-1.5"}`}
    >
      <p className="font-poly-neutral text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        Note
      </p>
      <p
        className={`font-poly-neutral mt-0.5 text-neutral-700 ${compact ? "text-[12px] leading-snug" : "text-[13px] leading-snug"}`}
      >
        {text}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  surface = "inventory",
}: {
  status: StockStatus;
  surface?: PillSurface;
}) {
  const b = dashboardStatusPillBase;

  if (surface === "dashboard") {
    if (status === "ok")
      return (
        <span
          className={`${b} border-[#2E7D32]/60 bg-[#2E7D32]/18 text-[#0F3D14] ring-1 ring-[#2E7D32]/20 shadow-[0_1px_3px_rgba(46,125,50,0.22)]`}
        >
          OK
        </span>
      );
    if (status === "low")
      return (
        <span
          className={`${b} border-[#C89B3C]/65 bg-[#C89B3C]/22 text-[#5C430A] ring-1 ring-[#C89B3C]/25 shadow-[0_1px_3px_rgba(200,155,60,0.2)]`}
        >
          LOW
        </span>
      );
    if (status === "critical")
      return (
        <span
          className={`${b} border-[#B71C1C]/80 bg-[#C62828]/30 text-[#5C0A0A] ring-1 ring-[#C62828]/35 shadow-[0_2px_8px_rgba(198,40,40,0.32)]`}
        >
          CRITICAL
        </span>
      );
    return (
      <span
        className={`${b} border-neutral-400/70 bg-neutral-100 text-neutral-700 ring-1 ring-neutral-300/50 shadow-[0_1px_2px_rgba(0,0,0,0.06)]`}
      >
        NOT CHECKED
      </span>
    );
  }

  const badgeBase = `${inventoryPillGeometry} font-poly-bulky-badge tracking-[0.01em]`;

  if (status === "ok")
    return (
      <span
        className={`${badgeBase} border-[#2E7D32]/40 bg-[#2E7D32]/16 text-[#1B5E20]`}
      >
        OK
      </span>
    );
  if (status === "low")
    return (
      <span
        className={`${badgeBase} border-[#C89B3C]/45 bg-[#C89B3C]/18 text-[#7A5A1A]`}
      >
        LOW
      </span>
    );
  if (status === "critical")
    return (
      <span
        className={`${badgeBase} border-[#C62828]/45 bg-[#C62828]/18 text-[#B71C1C]`}
      >
        CRITICAL
      </span>
    );
  return (
    <span
      className={`${badgeBase} border-neutral-300/90 bg-neutral-100 text-neutral-600`}
    >
      NOT CHECKED
    </span>
  );
}

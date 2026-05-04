"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Package,
  XCircle,
} from "lucide-react";
import { aceBold, aceMedium } from "@/app/local-fonts";
import {
  createInitialInventory,
  INVENTORY_TOTAL,
  sectionHeading,
  type InventoryItem,
  type StockStatus,
} from "@/lib/inventory-data";

const cream = "#F6F4EF";
const racing = "#0B3328";
const ok = "#2E7D32";
const low = "#C89B3C";
const critical = "#C62828";

const segBase =
  "font-poly-bulky flex-1 rounded-xl py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-all duration-150 active:scale-[0.98]";

const segIdle = `${segBase} text-neutral-600`;

const segOk = `${segBase} text-white bg-[#2E7D32] shadow-[0_0_0_1px_rgba(46,125,50,0.25),0_4px_16px_rgba(46,125,50,0.28)]`;

const segLow = `${segBase} text-white bg-[#C89B3C] shadow-[0_0_0_1px_rgba(200,155,60,0.28),0_4px_16px_rgba(200,155,60,0.3)]`;

const segCrit = `${segBase} text-white bg-[#C62828] shadow-[0_0_0_1px_rgba(198,40,40,0.3),0_6px_18px_rgba(198,40,40,0.35)]`;

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

const staffInputClass =
  "font-poly-neutral mt-2 w-full rounded-2xl border border-neutral-200/80 bg-white px-4 py-3.5 text-base text-neutral-900 placeholder:text-neutral-400 outline-none transition-[box-shadow,border-color] focus-visible:border-[#0B3328]/30 focus-visible:shadow-[0_0_0_3px_rgba(11,51,40,0.1)]";

const noteFieldClass =
  "jk-note-input mt-3 w-full rounded-2xl border border-neutral-200/50 bg-[#EEECE7] px-4 py-3 text-sm text-neutral-900 outline-none transition-[box-shadow,border-color] focus-visible:border-[#0B3328]/25 focus-visible:bg-[#F5F3EE] focus-visible:shadow-[0_0_0_3px_rgba(11,51,40,0.1)]";

export function InventoryApp() {
  const [view, setView] = useState<"form" | "report">("form");
  const [items, setItems] = useState<InventoryItem[]>(() =>
    createInitialInventory(),
  );
  const [staffName, setStaffName] = useState("");
  const [nameBlurred, setNameBlurred] = useState(false);
  const [nameSubmitAttempted, setNameSubmitAttempted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

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
    setSubmittedAt(new Date());
    setView("report");
  }

  function startNewCheck() {
    setItems(createInitialInventory());
    setStaffName("");
    setNameBlurred(false);
    setNameSubmitAttempted(false);
    setSubmittedAt(null);
    setView("form");
  }

  if (view === "report" && submittedAt) {
    return (
      <div className="min-h-dvh pb-8" style={{ backgroundColor: cream }}>
        <main className="mx-auto max-w-md px-4 pt-8">
          <h1
            className={`${aceBold.className} text-center text-2xl leading-tight text-neutral-900`}
          >
            Stock check report
          </h1>
          <p className="font-poly-neutral mt-2 text-center text-sm text-neutral-600">
            {staffName.trim()} ·{" "}
            {submittedAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatPill label="OK" value={counts.ok} color={ok} />
            <StatPill label="LOW" value={counts.low} color={low} />
            <StatPill label="CRITICAL" value={counts.critical} color={critical} />
            <StatPill
              label="Not checked"
              value={counts.unchecked}
              color="#6B7280"
            />
          </div>

          {(attention.criticalItems.length > 0 ||
            attention.lowItems.length > 0) && (
            <section className="mt-6 space-y-4">
              <h2 className="font-poly-bulky text-lg text-neutral-900">
                Needs attention
              </h2>
              {attention.criticalItems.length > 0 && (
                <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(11,51,40,0.06)]">
                  <h3 className="font-poly-bulky flex items-center gap-2 text-sm text-[#C62828]">
                    <XCircle className="size-4 shrink-0" aria-hidden />
                    Critical
                  </h3>
                  <ul className="font-poly-neutral mt-3 space-y-3">
                    {attention.criticalItems.map((it) => (
                      <li key={it.id} className="text-sm">
                        <p className="font-poly-bulky text-neutral-900">
                          {it.name}
                        </p>
                        {it.helper.trim() ? (
                          <p className="text-xs text-neutral-500">
                            {it.helper.trim()}
                          </p>
                        ) : null}
                        {it.note.trim() ? (
                          <p className="font-poly-italic mt-1 text-xs text-neutral-700">
                            {it.note.trim()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {attention.lowItems.length > 0 && (
                <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(11,51,40,0.06)]">
                  <h3 className="font-poly-bulky flex items-center gap-2 text-sm text-[#C89B3C]">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    Low
                  </h3>
                  <ul className="font-poly-neutral mt-3 space-y-3">
                    {attention.lowItems.map((it) => (
                      <li key={it.id} className="text-sm">
                        <p className="font-poly-bulky text-neutral-900">
                          {it.name}
                        </p>
                        {it.helper.trim() ? (
                          <p className="text-xs text-neutral-500">
                            {it.helper.trim()}
                          </p>
                        ) : null}
                        {it.note.trim() ? (
                          <p className="font-poly-italic mt-1 text-xs text-neutral-700">
                            {it.note.trim()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(11,51,40,0.06)]">
            <h2
              className={`${aceMedium.className} text-xs font-medium uppercase tracking-[0.14em] text-[#0B3328]`}
            >
              All items & notes
            </h2>
            <ul className="font-poly-neutral mt-3 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-poly-bulky text-sm text-neutral-900">
                        {it.name}
                      </p>
                      <p className="text-xs text-neutral-500">{it.section}</p>
                    </div>
                    <StatusBadge status={it.status} />
                  </div>
                  {it.note.trim() ? (
                    <p className="font-poly-italic mt-1 text-xs text-neutral-700">
                      {it.note.trim()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={startNewCheck}
            className="font-poly-bulky mt-8 w-full rounded-2xl py-4 text-base text-white shadow-lg transition active:scale-[0.99]"
            style={{ backgroundColor: racing }}
          >
            Start new check
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-36" style={{ backgroundColor: cream }}>
      <header className="mx-auto max-w-md px-4 pb-1 pt-5">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_12px_rgba(11,51,40,0.06)]"
            aria-hidden
          >
            <Package className="size-6" strokeWidth={1.75} color={racing} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h1
              className={`${aceBold.className} text-2xl leading-tight tracking-tight`}
              style={{ color: racing }}
            >
              JK Inventory
            </h1>
            <p className="font-poly-bulky mt-0.5 text-[15px] text-neutral-500">
              Fast Stock Check
            </p>
            <p className="font-poly-neutral mt-2 text-xs leading-relaxed text-neutral-400">
              Tap to update stock levels, scroll for more.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4">
        <div className="mt-3 rounded-2xl border border-neutral-100/90 bg-white px-3 py-2.5 shadow-[0_2px_14px_rgba(11,51,40,0.04)]">
          <ul className="space-y-1.5">
            <li className="flex gap-2 text-[11px] leading-snug text-neutral-600">
              <CheckCircle
                className="mt-0.5 size-3.5 shrink-0 text-[#2E7D32]"
                aria-hidden
              />
              <span className="font-poly-neutral min-w-0">
                <span className="font-poly-bulky text-[#2E7D32]">OK</span>
                {" — "}
                Enough for two or more nights
              </span>
            </li>
            <li className="flex gap-2 text-[11px] leading-snug text-neutral-600">
              <AlertTriangle
                className="mt-0.5 size-3.5 shrink-0 text-[#C89B3C]"
                aria-hidden
              />
              <span className="font-poly-neutral min-w-0">
                <span className="font-poly-bulky text-[#C89B3C]">LOW</span>
                {" — "}
                Enough for one night, reorder soon
              </span>
            </li>
            <li className="flex gap-2 text-[11px] leading-snug text-neutral-600">
              <XCircle
                className="mt-0.5 size-3.5 shrink-0 text-[#C62828]"
                aria-hidden
              />
              <span className="font-poly-neutral min-w-0">
                <span className="font-poly-bulky text-[#C62828]">
                  CRITICAL
                </span>
                {" — "}
                Not enough for tonight
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

        <div className="mt-5 space-y-4 pb-4">
          {items.map((it, idx) => {
            const showHeading =
              idx === 0 || items[idx - 1]!.section !== it.section;
            return (
              <div key={it.id}>
                {showHeading ? (
                  <h2
                    className={`${aceMedium.className} mb-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400`}
                  >
                    {sectionHeading(it.section)}
                  </h2>
                ) : null}
                <article className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(11,51,40,0.055)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-poly-bulky text-[17px] leading-snug text-neutral-900">
                      {it.name}
                    </h3>
                    {it.helper.trim() ? (
                      <span className="font-poly-neutral shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                        {it.helper.trim()}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3.5 rounded-2xl bg-[#E3E1DA] p-1">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        aria-pressed={it.status === "ok"}
                        className={pickSeg("ok", it.status)}
                        onClick={() => setStatus(it.id, "ok")}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        aria-pressed={it.status === "low"}
                        className={pickSeg("low", it.status)}
                        onClick={() => setStatus(it.id, "low")}
                      >
                        LOW
                      </button>
                      <button
                        type="button"
                        aria-pressed={it.status === "critical"}
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
                    aria-label={`Note for ${it.name}`}
                  />
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[22px] border border-neutral-200/50 bg-[rgba(255,255,255,0.92)] px-2.5 py-2 shadow-[0_10px_36px_rgba(11,51,40,0.09),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150">
          <button
            type="button"
            onClick={handleSubmit}
            className="font-poly-bulky flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-[14px] text-white transition active:scale-[0.99] active:opacity-95"
            style={{ backgroundColor: racing }}
          >
            <span className="truncate">Submit Stock Check</span>
          </button>
          <span className="font-poly-neutral shrink-0 pr-1 text-[15px] font-bold tabular-nums text-neutral-800">
            {checkedCount} / {INVENTORY_TOTAL}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(11,51,40,0.06)]">
      <p className="font-poly-neutral text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className="font-poly-bulky mt-1 text-2xl tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: StockStatus }) {
  if (status === "ok")
    return (
      <span className="font-poly-bulky shrink-0 rounded-full bg-[#2E7D32]/12 px-2.5 py-0.5 text-xs text-[#2E7D32]">
        OK
      </span>
    );
  if (status === "low")
    return (
      <span className="font-poly-bulky shrink-0 rounded-full bg-[#C89B3C]/15 px-2.5 py-0.5 text-xs text-[#C89B3C]">
        LOW
      </span>
    );
  if (status === "critical")
    return (
      <span className="font-poly-bulky shrink-0 rounded-full bg-[#C62828]/12 px-2.5 py-0.5 text-xs text-[#C62828]">
        CRITICAL
      </span>
    );
  return (
    <span className="font-poly-neutral shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500">
      Not checked
    </span>
  );
}

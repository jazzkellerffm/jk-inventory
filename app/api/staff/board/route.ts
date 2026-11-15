import { hasSession } from "@/lib/staff/session";
import { publishedShifts } from "@/lib/staff/roster-store";
import { readBarFeed } from "@/lib/staff/sumup";
import { readIncludedDrinks } from "@/lib/staff/included-drinks";
import type { StaffBoard } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

async function readPayments(): Promise<Pick<StaffBoard, "feed" | "feedState">> {
  const merchant = process.env.SUMUP_MERCHANT_CODE;
  const token = process.env.SUMUP_API_KEY;
  if (!merchant || !token) return { feed: null, feedState: "setup" };
  try { return { feed: await readBarFeed(merchant, token), feedState: "ready" }; }
  catch { return { feed: null, feedState: "unavailable" }; }
}

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!(await hasSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const [payments, drinks] = await Promise.all([readPayments(), readIncludedDrinks()]);
  const board: StaffBoard = { ...payments, ...drinks, shifts: [], scheduleError: false };
  try { board.shifts = await publishedShifts(); } catch { board.scheduleError = true; }
  return Response.json(board, { headers });
}

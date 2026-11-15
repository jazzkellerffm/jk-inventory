import { hasSession } from "@/lib/staff/session";
import { upcomingShifts } from "@/lib/staff/schedule";
import { readBarFeed } from "@/lib/staff/sumup";
import type { StaffBoard } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!(await hasSession())) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const board: StaffBoard = { feed: null, feedState: "setup", shifts: [], scheduleError: false };
  try { board.shifts = upcomingShifts(); } catch { board.scheduleError = true; }
  const merchant = process.env.SUMUP_MERCHANT_CODE;
  const token = process.env.SUMUP_API_KEY;
  if (merchant && token) {
    try {
      board.feed = await readBarFeed(merchant, token);
      board.feedState = "ready";
    } catch { board.feedState = "unavailable"; }
  }
  return Response.json(board, { headers });
}

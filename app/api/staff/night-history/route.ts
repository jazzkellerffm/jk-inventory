import { hasSession } from '@/lib/staff/session';
import { readMonthSummary } from '@/lib/staff/tickets';
import { serviceDate } from '@/lib/staff/service-day';
import { validNightMonth } from '@/lib/staff/night-history';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!(await hasSession())) return Response.json({}, { status: 401, headers });
  const month = new URL(request.url).searchParams.get('month') ?? '';
  if (!validNightMonth(month, serviceDate(Date.now()).slice(0, 7))) return Response.json({}, { status: 400, headers });
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) return Response.json({}, { status: 503, headers });
  try { return Response.json({ month, ...await readMonthSummary(key, month) }, { headers }); }
  catch { return Response.json({}, { status: 503, headers }); }
}

import { hasSession } from '@/lib/staff/session';
import { readBookingLead } from '@/lib/staff/tickets';
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!(await hasSession())) return Response.json({}, { status: 401, headers });
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) return Response.json({}, { status: 503, headers });
  try { return Response.json(await readBookingLead(key), { headers }); }
  catch { return Response.json({}, { status: 503, headers }); }
}

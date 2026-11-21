import { hasAdminSession } from '@/lib/staff/admin/session';
import { readAdminSummary } from '@/lib/staff/admin/data';
import { berlinDay } from '@/lib/staff/admin/finance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  try {
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    const month = new URL(request.url).searchParams.get('month') ?? berlinDay(Date.now()).slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '2026-06' || month > berlinDay(Date.now()).slice(0, 7)) {
      return Response.json({}, { status: 400, headers });
    }
    const summary = await readAdminSummary(month);
    // Never release a long-running response after the user locked their session.
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    return Response.json(summary, { headers });
  } catch { return Response.json({ error: 'Auswertung derzeit nicht verfügbar.' }, { status: 503, headers }); }
}

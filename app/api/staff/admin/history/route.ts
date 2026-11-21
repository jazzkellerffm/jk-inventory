import { hasAdminSession } from '@/lib/staff/admin/session';
import { readAdminHistory } from '@/lib/staff/admin/dashboard-data';
import { berlinDay } from '@/lib/staff/admin/finance';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  try {
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    const current = berlinDay(Date.now()).slice(0, 7);
    const before = new URL(request.url).searchParams.get('before') ?? current;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(before) || before < '2000-01' || before > current)
      return Response.json({}, { status: 400, headers });
    const data = await readAdminHistory(before);
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    return Response.json(data, { headers });
  } catch { return Response.json({ error: 'SumUp-Verlauf derzeit nicht verfügbar.' }, { status: 503, headers }); }
}

import { hasAdminSession } from '@/lib/staff/admin/session';
import { readAdminEvening } from '@/lib/staff/admin/dashboard-data';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  try {
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    const data = await readAdminEvening(new URL(request.url).searchParams.get('comparison') === '1');
    if (!await hasAdminSession()) return Response.json({}, { status: 401, headers });
    return Response.json(data, { headers });
  } catch { return Response.json({ error: 'Abendübersicht derzeit nicht verfügbar.' }, { status: 503, headers }); }
}

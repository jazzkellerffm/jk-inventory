import { adminConfigured, hasAdminSession, lockAdmin, unlockAdmin } from '@/lib/staff/admin/session';
import { hasSession } from '@/lib/staff/session';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function GET() {
  if (!await hasSession()) return Response.json({}, { status: 401, headers });
  try { return Response.json({ configured: adminConfigured(), unlocked: await hasAdminSession() }, { headers }); }
  catch { return Response.json({ error: 'Zugang derzeit nicht verfügbar.' }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({}, { status: 403, headers });
  if (!await hasSession()) return Response.json({}, { status: 401, headers });
  if (Number(request.headers.get('content-length')) > 2048) return Response.json({}, { status: 413, headers });
  try {
    const text = await request.text();
    if (text.length > 2048) return Response.json({}, { status: 413, headers });
    const input = JSON.parse(text);
    if (input.action === 'lock') { await lockAdmin(); return Response.json({ unlocked: false }, { headers }); }
    if (input.action !== 'unlock') return Response.json({}, { status: 400, headers });
    const result = await unlockAdmin(input.pin);
    return Response.json({ unlocked: result === 'ready', result }, { status: result === 'ready' ? 200 : result === 'limited' ? 429 : result === 'unavailable' ? 503 : 401, headers });
  } catch { return Response.json({ error: 'Zugang derzeit nicht verfügbar.' }, { status: 503, headers }); }
}

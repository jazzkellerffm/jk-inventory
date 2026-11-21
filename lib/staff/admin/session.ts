import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { hasSession } from '../session';
import { validPinHash, verifyPin } from './pin';

const cookieName = process.env.NODE_ENV === 'production' ? '__Host-jk-admin' : 'jk-admin';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function adminConfigured() {
  return validPinHash(process.env.STAFF_ADMIN_PIN_HASH ?? '') &&
    !!process.env.STAFF_ADMIN_BACKEND_SECRET && !!process.env.INCLUDED_DRINKS_SUPABASE_URL &&
    !!process.env.INCLUDED_DRINKS_PUBLISHABLE_KEY;
}

// Durable, atomic attempts and sessions. A cold start must never reset PIN attempts.
async function rpc(action: string, token = '') {
  const url = new URL('/rest/v1/rpc/jkos_admin_auth', process.env.INCLUDED_DRINKS_SUPABASE_URL!);
  const response = await fetch(url, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000),
    headers: { apikey: process.env.INCLUDED_DRINKS_PUBLISHABLE_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.STAFF_ADMIN_BACKEND_SECRET, action,
      token_hash: token ? digest(token) : '',
      revision: digest((process.env.STAFF_ADMIN_PIN_HASH ?? '') + (process.env.STAFF_ACCESS_KEY ?? '')) }),
  });
  if (!response.ok) throw new Error('Admin session unavailable');
  return (await response.json()) === true;
}

export async function hasAdminSession() {
  if (!adminConfigured() || !await hasSession()) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return rpc('check', token);
}

export async function unlockAdmin(pin: unknown) {
  if (!adminConfigured() || !await hasSession()) return 'unavailable';
  if (!await rpc('attempt')) return 'limited';
  if (!verifyPin(pin, process.env.STAFF_ADMIN_PIN_HASH!)) return 'invalid';
  const token = randomBytes(32).toString('hex');
  if (!await rpc('create', token)) throw new Error('Session unavailable');
  (await cookies()).set(cookieName, token, { httpOnly: true,
    secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 3600 });
  return 'ready';
}

export async function lockAdmin() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  jar.delete(cookieName);
  if (token && adminConfigured()) await rpc('revoke', token);
}

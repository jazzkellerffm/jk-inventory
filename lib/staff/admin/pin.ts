import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new Error('Six digits required');
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function validPinHash(hash: string) {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash);
}

export function verifyPin(pin: unknown, hash: string) {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin) || !validPinHash(hash)) return false;
  const [, salt, expected] = hash.split(':');
  return timingSafeEqual(scryptSync(pin, salt, 32), Buffer.from(expected, 'hex'));
}

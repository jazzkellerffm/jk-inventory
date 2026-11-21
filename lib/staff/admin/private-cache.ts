import 'server-only';
import { createHash } from 'node:crypto';

// Server memory only. Every HTTP route still checks the admin session twice.
// No CDN, browser storage or persistence of the underlying private records.
const entries = new Map<string, { until: number; value: Promise<unknown> }>();
export function privateMemo<T>(key: string, identity: string, ttl: number, read: () => Promise<T>): Promise<T> {
  const id = createHash('sha256').update(identity).digest('hex') + ':' + key;
  const prior = entries.get(id);
  if (prior && prior.until > Date.now()) return prior.value as Promise<T>;
  const entry = { until: Infinity, value: Promise.resolve().then(read) };
  if (entries.size >= 120) entries.delete(entries.keys().next().value!);
  entries.set(id, entry);
  entry.value.then(() => { entry.until = Date.now() + ttl; }, () => {
    if (entries.get(id) === entry) entries.delete(id);
  });
  return entry.value;
}

import { redirect } from 'next/navigation';
import { hasSession } from '@/lib/staff/session';
import { AdminPanel } from '@/components/staff/admin-panel';

export const dynamic = 'force-dynamic';
export default async function Administration() {
  if (!await hasSession()) redirect('/staff');
  return <AdminPanel />;
}

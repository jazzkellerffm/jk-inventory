import Link from "next/link";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { hasSession } from "@/lib/staff/session";
import { StaffDashboard } from "@/components/staff/dashboard";
import { Masthead } from "@/components/staff/masthead";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  if (await hasSession()) return <StaffDashboard />;
  const configured = Boolean(process.env.STAFF_ACCESS_KEY);
  const failed = (await searchParams).login === "error";
  return <div className="staff-shell"><Masthead />
    <main className="staff-login"><LockKeyhole size={24} />
      <h1>Teamzugang</h1>
      <p>{configured ? "Mit dem Team-Passwort zum Dienstplan und an die Bar." : "Der Teamzugang wird eingerichtet. Die Demo zeigt einen Beispielabend."}</p>
      {configured && <form action={login}><label htmlFor="team-access">Team-Passwort</label>
        <input id="team-access" name="access" type="password" autoComplete="current-password" required />
        {failed && <p role="alert">Das Passwort stimmt nicht.</p>}
        <button className="staff-submit">Anmelden</button></form>}
      <Link href="/staff/demo">Demo ansehen <ArrowUpRight size={16}/></Link>
    </main></div>;
}

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/staff/actions";

export function Masthead({ demo = false, signedIn = false }: { demo?: boolean; signedIn?: boolean }) {
  return <header className="staff-mast">
    <Link className="staff-brand" href={demo ? "/staff/demo" : "/staff"}>
      <Image src="/JKOS.png" width={700} height={205} alt="JKOS" priority />
      <span>Staff OS</span>
    </Link>
    <div className="staff-mast-right">
      <span className="staff-venue">Jazzkeller Frankfurt</span>
      {demo && <Link href="/staff" className="staff-demo-badge">Demo <span aria-hidden>↗</span></Link>}
      {signedIn && <form action={logout}><button className="staff-icon-btn" aria-label="Abmelden"><LogOut size={17}/></button></form>}
    </div>
  </header>;
}

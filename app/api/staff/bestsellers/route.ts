import { hasSession } from "@/lib/staff/session";
import { readBestsellers } from "@/lib/staff/sumup";

export async function GET() {
  const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!(await hasSession())) return Response.json({}, {status:401,headers});
  const merchant=process.env.SUMUP_MERCHANT_CODE, key=process.env.SUMUP_API_KEY;
  if (!merchant || !key) return Response.json({state:"setup"},{headers});
  try { return Response.json({feed:await readBestsellers(merchant,key)},{headers}); }
  catch { return Response.json({}, {status:503,headers}); }
}

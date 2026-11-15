import { hasSession } from "@/lib/staff/session";
import { readTicketFeed } from "@/lib/staff/tickets";

export async function GET() {
  const headers = { "Cache-Control":"private, no-store", Vary:"Cookie" };
  if (!(await hasSession())) return Response.json({}, {status:401,headers});
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) return Response.json({state:"setup"},{headers});
  try { return Response.json({state:"ready",feed:await readTicketFeed(key)},{headers}); }
  catch { return Response.json({state:"unavailable"},{status:503,headers}); }
}

import { hasSession } from "@/lib/staff/session";
import { readServicePlan } from "@/lib/staff/tickets";

export async function GET(request: Request) {
  const headers = {"Cache-Control":"private, no-store", Vary:"Cookie"};
  if (!(await hasSession())) return Response.json({}, {status:401, headers});
  const id = new URL(request.url).searchParams.get("event") ?? "";
  if (!/^ev_\d+$/.test(id)) return Response.json({}, {status:400, headers});
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) return Response.json({}, {status:503, headers});
  try { return Response.json(await readServicePlan(key,id), {headers}); }
  catch { return Response.json({}, {status:503, headers}); }
}

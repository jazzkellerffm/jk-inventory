import { hasSession } from "@/lib/staff/session";
import { readBarEvenings } from "@/lib/staff/sumup";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!(await hasSession())) return Response.json({}, { status: 401, headers });
  const merchant = process.env.SUMUP_MERCHANT_CODE?.trim();
  const key = process.env.SUMUP_API_KEY?.trim();
  if (!merchant || !key) return Response.json({}, { status: 503, headers });
  try {
    const day = new URL(request.url).searchParams.get("day");
    return Response.json(await readBarEvenings(merchant, key, day), { headers });
  } catch {
    return Response.json({}, { status: 503, headers });
  }
}

import { hasSession } from "@/lib/staff/session";
import { readBestsellers } from "@/lib/staff/sumup";

export const maxDuration = 300;

export async function GET(request: Request) {
  const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!(await hasSession())) return Response.json({}, {status:401,headers});
  const period = new URL(request.url).searchParams.get("period") ?? "evening";
  if (period !== "evening" && period !== "week" && period !== "month")
    return Response.json({error:"Invalid period"},{status:400,headers});
  const category = new URL(request.url).searchParams.get("category") ?? "all";
  if (category !== "all" && category !== "cocktails") return Response.json({error:"Invalid category"},{status:400,headers});
  const merchant=process.env.SUMUP_MERCHANT_CODE?.trim(), key=process.env.SUMUP_API_KEY?.trim();
  if (!merchant || !key) return Response.json({state:"setup"},{headers});
  try { return Response.json({feed:await readBestsellers(merchant,key,period,category)},{headers}); }
  catch (error) {
    const reason = error instanceof Error ? error.message : "";
    console.warn("Bestseller feed unavailable", /^SumUp HTTP \d{3}$/.test(reason) ? reason : "History request failed");
    return Response.json({}, {status:503,headers});
  }
}

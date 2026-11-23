import { hasSession } from "@/lib/staff/session";
import { readFoodHistory } from "@/lib/staff/food-history";
export const maxDuration=60;
export async function GET(){
  const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
  if(!(await hasSession()))return Response.json({}, {status:401,headers});
  const merchant=process.env.SUMUP_MERCHANT_CODE?.trim(),token=process.env.SUMUP_API_KEY?.trim();
  if(!merchant||!token)return Response.json({error:"SumUp not configured"},{status:503,headers});
  try{return Response.json({history:await readFoodHistory(merchant,token)},{headers});}
  catch{return Response.json({error:"Snack history unavailable"},{status:503,headers});}
}

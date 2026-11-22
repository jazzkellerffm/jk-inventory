import { hasSession } from "@/lib/staff/session";
import { readIncludedRanking } from "@/lib/staff/included-bestsellers";
export const maxDuration=60;
export async function GET(request:Request){
  const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
  if(!(await hasSession()))return Response.json({}, {status:401,headers});
  const period=new URL(request.url).searchParams.get("period")??"evening";
  if(period!=="evening"&&period!=="week"&&period!=="month")return Response.json({error:"Invalid period"},{status:400,headers});
  try{return Response.json({feed:await readIncludedRanking(period)},{headers});}
  catch{return Response.json({error:"Included Drinks history unavailable"},{status:503,headers});}
}

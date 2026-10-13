import { publicEstimate, type InternalEstimate } from "@/lib/estimate-calculator";

import { bucket, ownRequest, response } from "@/lib/server";

import { quoteKey } from "@/lib/official-quote";

export async function GET(request: Request) {

  try {

    const id=new URL(request.url).searchParams.get("id") ?? ""; const row=await ownRequest(request,id);

    if(!row) return response({error:"This request is unavailable or has expired."},404);

    const quote=row.status!=="draft" ? await bucket().head(quoteKey(String(row.id))) : null;

    return response({id:row.id,study:row.study,status:row.status,files:JSON.parse(String(row.files_json)).map(({key,...file}:{key:string;[key:string]:unknown})=>file),scope:row.scope_json ? JSON.parse(String(row.scope_json)) : null,analysis:row.analysis_json ? JSON.parse(String(row.analysis_json)) : null,estimate:row.estimate_json ? publicEstimate(JSON.parse(String(row.estimate_json)) as InternalEstimate) : null,contact:row.contact_json ? JSON.parse(String(row.contact_json)) : null,notification:row.notification_json ? JSON.parse(String(row.notification_json)) : null,quoteAvailable:!!quote,quoteReference:quote?.customMetadata?.reference ?? null});

  } catch { return response({error:"Request storage is temporarily unavailable."},503); }

}

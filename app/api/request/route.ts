import { publicEstimate, type InternalEstimate } from "@/lib/estimate-calculator";

import { bucket, ownRequest, response } from "@/lib/server";

import { quoteKey } from "@/lib/official-quote";
import {drawingPageCount} from "@/lib/drawing-pages";
import {requestStore} from "@/lib/request-store";
import type {Uploaded} from "@/lib/server";

export async function GET(request: Request) {

  try {

    const id=new URL(request.url).searchParams.get("id") ?? ""; const row=await ownRequest(request,id);

    if(!row) return response({error:"This request is unavailable or has expired."},404);
    let files=JSON.parse(String(row.files_json)) as Uploaded[];
    if(row.status!=="uploading"&&files.some(file=>file.pageCount===undefined)){
      files=await Promise.all(files.map(async file=>{
        if(file.pageCount!==undefined)return file;
        try{const object=await bucket().get(file.key);return {...file,pageCount:object?await drawingPageCount(await object.arrayBuffer(),file.type):null};}catch{return {...file,pageCount:null};}
      }));
      await requestStore.patch(id,{files_json:JSON.stringify(files)},{status:row.status,files_json:row.files_json});
    }

    const quote=row.status!=="draft" ? await bucket().head(quoteKey(String(row.id))) : null;

    return response({id:row.id,study:row.study,status:row.status,files:files.map(({key,...file})=>file),scope:row.scope_json ? JSON.parse(String(row.scope_json)) : null,analysis:row.analysis_json ? JSON.parse(String(row.analysis_json)) : null,estimate:row.estimate_json ? publicEstimate(JSON.parse(String(row.estimate_json)) as InternalEstimate) : null,contact:row.contact_json ? JSON.parse(String(row.contact_json)) : null,notification:row.notification_json ? JSON.parse(String(row.notification_json)) : null,quoteAvailable:!!quote,quoteReference:quote?.customMetadata?.reference ?? null});

  } catch { return response({error:"Request storage is temporarily unavailable."},503); }

}

import {requestStore} from "@/lib/request-store";

import { analyzeDocuments } from "@/lib/document-analysis";

import { z } from "zod";

import { ownRequest, response, sameOrigin, Uploaded } from "@/lib/server";

export async function POST(request: Request) {

  if(!sameOrigin(request)) return response({error:"Request origin is not allowed."},403);

  try {

    const body=z.object({id:z.string().uuid(),aiConsent:z.boolean()}).parse(await request.json()); const row=await ownRequest(request,body.id);

    if(!row) return response({error:"Request unavailable."},404);

    if(row.analysis_json) return response({analysis:JSON.parse(String(row.analysis_json))});

    if(body.aiConsent!==true) return response({analysis:{mode:"guided",summary:"Your files are attached. I’ll ask a few questions to estimate the work. The drawings have not been sent for AI reading.",evidence:[],missing:[]}});

    const analysis=await analyzeDocuments(JSON.parse(String(row.files_json)) as Uploaded[],String(row.study));

    await requestStore.patch(body.id,{analysis_json:JSON.stringify(analysis)},{status:"draft"});

    return response({analysis});

  } catch { return response({analysis:{mode:"guided",summary:"Automatic reading is unavailable. Your documents are saved, and you can confirm the scope or request an engineer’s review.",evidence:[],missing:[]}}); }

}

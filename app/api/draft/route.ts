import {requestStore} from "@/lib/request-store";

import { z } from "zod";

import { ScopeSchema } from "@/lib/quote-engine";

import { ownRequest, response, sameOrigin } from "@/lib/server";



const DraftSchema=ScopeSchema.innerType().extend({

  projectName:z.string().trim().max(140),location:z.string().trim().max(140),confirmed:z.literal(false),

  chatStage:z.enum(["documents","name","location","services","buses","scenarios","buildings","pages","density","dimensions","readiness","summary","building-basis","ventilation","requirements"])

});

export async function POST(request:Request) {

  if(!sameOrigin(request)) return response({error:"Request origin is not allowed."},403);

  try {

    const body=z.object({id:z.string().uuid(),scope:DraftSchema}).parse(await request.json());

    const row=await ownRequest(request,body.id);

    if(!row) return response({error:"Request unavailable."},404);

    if(row.status!=="draft") return response({error:"This request is already saved."},409);

    if(row.study!==body.scope.study) return response({error:"Study type does not match your drawings."},400);

    await requestStore.patch(body.id,{scope_json:JSON.stringify(body.scope),estimate_json:null},{status:"draft"});

    return response({saved:true});

  } catch {return response({error:"Couldn’t save your progress. Your answers are still here."},400);}

}

import {requestStore} from "@/lib/request-store";

import { ScopeSchema } from "@/lib/quote-engine";

import { calculateEstimate, publicEstimate } from "@/lib/estimate-calculator";

import { z } from "zod";

import { capCents, ownRequest, response, sameOrigin, type Uploaded } from "@/lib/server";

import { validateQuoteBasis } from "@/lib/quote-basis";

export async function POST(request: Request) {

  if(!sameOrigin(request)) return response({error:"Request origin is not allowed."},403);

  try {

    const body=z.object({id:z.string().uuid(),scope:z.unknown()}).parse(await request.json()); const row=await ownRequest(request,body.id);

    if(!row) return response({error:"This request is unavailable or has expired. Please start again."},404);

    if(row.status!=="draft") return response({error:"This estimate has already been saved."},409);

    const scope=ScopeSchema.parse(body.scope);

    if(scope.study!==row.study) return response({error:"The selected study type does not match your upload."},400);

    try{validateQuoteBasis(scope,JSON.parse(String(row.files_json)) as Uploaded[]);}catch(error){return response({error:error instanceof Error ? error.message : "Confirm the source drawings."},400);}

    const estimate=calculateEstimate(scope,capCents());

    const updated=await requestStore.patch(body.id,{scope_json:JSON.stringify(scope),estimate_json:JSON.stringify(estimate)},{status:"draft"});

    if(!updated)return response({error:"This quote changed while calculating. Please try again."},409);

    return response({estimate:publicEstimate(estimate)});

  } catch(error) { return response({error:error instanceof Error && error.name==="ZodError" ? "Please check the project name, location, study selections, and quantities." : "We couldn’t calculate the estimate. Please try again."},400); }

}

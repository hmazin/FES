import {requestStore} from "@/lib/request-store";

import { ScopeSchema } from "@/lib/quote-engine";

import { calculateEstimate, publicEstimate } from "@/lib/estimate-calculator";

import { z } from "zod";

import { capCents, ownRequest, response, sameOrigin, type Uploaded } from "@/lib/server";

import { validateQuoteBasis } from "@/lib/quote-basis";
import { PricingConfigurationError } from "@/lib/pricing-config";

export async function POST(request: Request) {

  if(!sameOrigin(request)) return response({error:"Request origin is not allowed."},403);

  try {

    const body=z.object({id:z.string().uuid(),scope:z.unknown()}).parse(await request.json()); const row=await ownRequest(request,body.id);

    if(!row) return response({error:"This request is unavailable or has expired. Please start again."},404);

    if(row.status!=="draft") return response({error:"This estimate has already been saved."},409);

    const scope=ScopeSchema.parse(body.scope);

    if(scope.study!==row.study) return response({error:"The selected study type does not match your upload."},400);

    try{validateQuoteBasis(scope,JSON.parse(String(row.files_json)) as Uploaded[]);}catch(error){return response({error:error instanceof Error ? error.message : "Confirm the source drawings."},400);}

    const scopeJson=JSON.stringify(scope);
    // Retain confirmed project details even when the private price settings are temporarily unavailable.
    if(!await requestStore.patch(body.id,{scope_json:scopeJson,estimate_json:null},{status:"draft"}))return response({error:"This quote changed while calculating. Please try again."},409);

    const estimate=calculateEstimate(scope,capCents());

    const updated=await requestStore.patch(body.id,{estimate_json:JSON.stringify(estimate)},{status:"draft",scope_json:scopeJson});

    if(!updated)return response({error:"This quote changed while calculating. Please try again."},409);

    return response({estimate:publicEstimate(estimate)});

  } catch(error) {
    if(error instanceof PricingConfigurationError){
      console.error("FES estimate unavailable: private pricing configuration is missing or invalid.");
      return response({code:"QUOTE_UNAVAILABLE",error:"Instant quoting is temporarily unavailable. Please contact Power-Link for a quotation."},503);
    }
    if(error instanceof Error&&error.name==="ZodError")return response({error:"Please check the project name, location, study selections, and quantities."},400);
    console.error("FES estimate failed unexpectedly.");
    return response({error:"We couldn’t calculate your quotation. Please contact Power-Link for assistance."},503);
  }

}

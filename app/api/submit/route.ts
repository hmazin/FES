import {requestStore} from "@/lib/request-store";

import { z } from "zod";

import { bucket, capCents, ownRequest, response, sameOrigin, type Uploaded } from "@/lib/server";

import { ScopeSchema } from "@/lib/quote-engine";

import { calculateEstimate, publicEstimate, type InternalEstimate } from "@/lib/estimate-calculator";

import { validateQuoteBasis } from "@/lib/quote-basis";

import { buildOfficialQuote, canIssueQuote, quoteKey, quoteReference, type QuoteContact } from "@/lib/official-quote";

const Contact=z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(250),company:z.string().trim().max(140),consent:z.literal(true)});

export async function POST(request: Request) {

  if(!sameOrigin(request)) return response({error:"Request origin is not allowed."},403);

  try {

    const body=z.object({id:z.string().uuid(),contact:Contact}).parse(await request.json());const row=await ownRequest(request,body.id);

    if(!row || !row.estimate_json || !row.scope_json) return response({error:"Generate your estimate before requesting a quote."},400);

    const scope=ScopeSchema.parse(JSON.parse(String(row.scope_json)));

    const files=JSON.parse(String(row.files_json)) as Uploaded[];

    validateQuoteBasis(scope,files);

    if(!scope.confirmed) return response({error:"Confirm the current scope and calculate the estimate before requesting a quote."},409);

    const stored=JSON.parse(String(row.estimate_json)) as InternalEstimate;

    const fresh=calculateEstimate(scope,capCents());

    if(stored.totalCents!==fresh.totalCents || stored.pricingVersion!==fresh.pricingVersion) return response({error:"Please calculate a new estimate for the current scope."},409);

    const eligible=canIssueQuote(scope,fresh);

    let contact:QuoteContact=body.contact;

    let notification=row.notification_json ? JSON.parse(String(row.notification_json)) : {customer:"pending",sales:"pending"};

    if(row.status==="draft") {

      notification={customer:"pending",sales:"pending",quoteIssuedAt:new Date().toISOString()};

      const updated=await requestStore.patch(body.id,{status:"preview_saved",contact_json:JSON.stringify(contact),notification_json:JSON.stringify(notification)},{status:"draft",scope_json:row.scope_json,estimate_json:row.estimate_json});

      if(!updated) return response({error:"The scope changed while saving. Please check it and try again."},409);

    } else contact=JSON.parse(String(row.contact_json)) as QuoteContact;

    const issued=new Date(notification.quoteIssuedAt ?? Number(row.created_at));

    let quoteAvailable=false;

    if(eligible) {

      const key=quoteKey(body.id);const existing=await bucket().head(key);

      if(!existing) {

        const sources=[];

        for(const file of files) {const original=await bucket().get(file.key);if(!original) throw new Error(`The attached source ${file.name} is unavailable. Please contact PLT.`);sources.push({...file,bytes:new Uint8Array(await original.arrayBuffer())});}

        const quote=await buildOfficialQuote({id:body.id,scope,estimate:fresh,contact,sources,issued});

        await bucket().put(key,quote.bytes,{httpMetadata:{contentType:"application/pdf"},customMetadata:{reference:quote.reference,issuedAt:issued.toISOString()}});

      }

      quoteAvailable=true;

    }

    if(quoteAvailable)await requestStore.patch(body.id,{quote_key:quoteKey(body.id)});
    notification={...notification,customer:"not_configured",sales:"dashboard"};

    await requestStore.patch(body.id,{notification_json:JSON.stringify(notification)});

    return response({id:body.id,notification,quoteAvailable,quoteReference:eligible ? quoteReference(body.id,issued) : null});

  } catch(error) {

    const message=error instanceof Error && error.name==="ZodError" ? "Enter your name and a valid email, and confirm that PLT may contact you." : error instanceof Error && /source|drawing|scope|building|P&ID/i.test(error.message) ? error.message : "We couldn’t submit your request. Please try again.";

    return response({error:message},400);

  }

}

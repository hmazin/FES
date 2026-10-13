import { bucket, ownRequest, response, reviewer } from "@/lib/server";

import {localStorageEnabled} from "@/lib/request-store";

import { quoteKey } from "@/lib/official-quote";

export async function GET(request:Request) {

  const id=new URL(request.url).searchParams.get("id") ?? "";

  if(!/^[a-f0-9-]{36}$/.test(id)) return response({error:"This quote is unavailable."},404);

  const row=await ownRequest(request,id);

  if(!row && !reviewer(request)) return response({error:"This quote is unavailable."},404);

  const key=quoteKey(id);

  if(!localStorageEnabled()){const metadata=await bucket().head(key);if(!metadata)return response({error:"The quotation is not available yet."},404);return new Response(null,{status:302,headers:{Location:await bucket().downloadUrl(key,`${metadata.customMetadata?.reference ?? "PLT-Quotation"}_Rev-A.pdf`),"Cache-Control":"private, no-store"}});}

  const file=await bucket().get(key);

  if(!file) return response({error:"PLT is reviewing this request before issuing the quote."},404);

  return new Response(file.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${file.customMetadata?.reference ?? "PLT-Quotation"}_Rev-A.pdf"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});

}

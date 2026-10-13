import {bucket,response,reviewer,type Uploaded} from "@/lib/server";

import {requestStore,localStorageEnabled} from "@/lib/request-store";

export async function GET(request:Request){

  if(!reviewer(request))return response({error:"Reviewer sign-in required."},401);

  try{const url=new URL(request.url),id=url.searchParams.get("id")||"",index=Number(url.searchParams.get("index"));if(!/^[a-f0-9-]{36}$/.test(id)||!Number.isInteger(index)||index<0||index>5)return response({error:"Document unavailable."},404);const row=await requestStore.get(id);if(!row)return response({error:"Document unavailable."},404);const file=(JSON.parse(row.files_json) as Uploaded[])[index];if(!file||!await bucket().head(file.key))return response({error:"Document unavailable."},404);

  if(!localStorageEnabled())return new Response(null,{status:302,headers:{Location:await bucket().downloadUrl(file.key,file.name),"Cache-Control":"private, no-store"}});

  const object=await bucket().get(file.key);if(!object)return response({error:"Document unavailable."},404);return new Response(object.body,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,"X-Content-Type-Options":"nosniff","Cache-Control":"no-store"}});

  }catch{return response({error:"Document storage is temporarily unavailable."},503);}

}

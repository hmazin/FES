import {bucket,ownRequest,response,sameOrigin,type Uploaded} from "@/lib/server";
import {localStorageEnabled} from "@/lib/request-store";
export async function POST(request:Request){
  if(!localStorageEnabled())return response({error:"Not found."},404);
  if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);
  const url=new URL(request.url),id=url.searchParams.get("id")||"",index=Number(url.searchParams.get("index"));
  const row=await ownRequest(request,id);
  if(!row||row.status!=="uploading"||!Number.isInteger(index)||index<0||index>5)return response({error:"Upload unavailable."},404);
  const file=(JSON.parse(row.files_json) as Uploaded[])[index];if(!file)return response({error:"Upload unavailable."},404);
  if(Number(request.headers.get("content-length"))!==file.size)return response({error:"Upload size does not match."},400);
  const bytes=await request.arrayBuffer();if(bytes.byteLength!==file.size)return response({error:"Upload size does not match."},400);
  await bucket().put(file.key,bytes,{httpMetadata:{contentType:file.type}});return response({uploaded:true});
}

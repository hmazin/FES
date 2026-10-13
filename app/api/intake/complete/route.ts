import {z} from "zod";
import {bucket,ownRequest,response,sameOrigin,type Uploaded} from "@/lib/server";
import {requestStore} from "@/lib/request-store";
export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:Request){
  if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);
  try{
    const {id}=z.object({id:z.string().uuid()}).parse(await request.json()),row=await ownRequest(request,id);
    if(!row)return response({error:"This upload session is unavailable."},404);
    if(row.status==="draft")return response({id,files:(JSON.parse(row.files_json) as Uploaded[]).map(({key,...file})=>file)});
    if(row.status!=="uploading")return response({error:"This request is already finalized."},409);
    const verified:Uploaded[]=[];
    for(const file of JSON.parse(row.files_json) as Uploaded[]){
      const metadata=await bucket().head(file.key);
      if(!metadata||metadata.size!==file.size||metadata.size>10*1024*1024)return response({error:`The upload for ${file.name} is incomplete. Please retry the drawing upload.`},400);
      const object=await bucket().get(file.key);if(!object)throw new Error("Drawing unavailable.");
      const bytes=await object.arrayBuffer(),head=new Uint8Array(bytes).slice(0,8);
      const valid=file.type==="application/pdf" ? new TextDecoder().decode(head).startsWith("%PDF-") : file.type==="image/png" ? head[0]===137&&head[1]===80&&head[2]===78 : head[0]===255&&head[1]===216;
      if(!valid)return response({error:`${file.name} is unreadable. Please export it again.`},400);
      const digest=await crypto.subtle.digest("SHA-256",bytes);
      // Signed upload policies can still be valid after confirmation. Keep the accepted source under a different key.
      const retainedKey=file.key.replace("/uploads/","/originals/");
      await bucket().put(retainedKey,bytes,{httpMetadata:{contentType:file.type}});
      verified.push({...file,key:retainedKey,hash:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")});
    }
    const updated=await requestStore.patch(id,{status:"draft",files_json:JSON.stringify(verified)},{status:"uploading"});
    if(!updated)return response({error:"The upload changed while being finalized. Please retry."},409);
    return response({id,files:verified.map(({key,...file})=>file)});
  }catch{return response({error:"We couldn’t verify your drawings. Your upload record is retained; please try again."},503);}
}

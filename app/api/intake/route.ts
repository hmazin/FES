import {z} from "zod";

import {bucket,hash,response,sameOrigin,sessionHash,sessionToken,sessionCookie,ownRequest,type Uploaded} from "@/lib/server";

import {requestStore,localStorageEnabled} from "@/lib/request-store";

const formats:Record<string,string>={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg"};

const Intake=z.object({study:z.literal("fes"),id:z.string().uuid().optional(),files:z.array(z.object({name:z.string().min(1).max(200),size:z.number().int().positive().max(10*1024*1024)})).min(1).max(6)});

export const runtime="nodejs";

export async function POST(request:Request){

  if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);

  if(Number(request.headers.get("content-length")??0)>16000)return response({error:"Upload metadata is too large."},413);

  let phase="validation";
  try{

    const input=Intake.parse(await request.json());
    const existing=input.id?await ownRequest(request,input.id):null;
    if(input.id&&(!existing||existing.status!=="draft"))return response({error:"This request cannot accept more drawings. Please start a new estimate."},409);
    const previous:Uploaded[]=existing?JSON.parse(existing.files_json):[];

    if(previous.length+input.files.length>6||[...previous,...input.files].reduce((sum,f)=>sum+f.size,0)>20*1024*1024)return response({error:"Keep your drawings to six files and 20 MB in total."},400);

    if(input.files.some(f=>!formats[f.name.split(".").pop()?.toLowerCase()??""]))return response({error:"Use PDF, PNG or JPEG drawings."},400);

    let secret:string|null=null,session=await sessionHash(request);

    if(!session){secret=sessionToken();session=await hash(secret);}

    phase="database";
    if(!existing&&!await requestStore.reserve(session))return response({error:"You have reached today’s quote request limit. Please try again tomorrow."},429);

    const id=existing?.id??crypto.randomUUID(),files:Uploaded[]=input.files.map(file=>{const extension=file.name.split(".").pop()!.toLowerCase();return {name:file.name.replace(/[\x00-\x1f]/g,"").slice(0,200),size:file.size,type:formats[extension],key:`requests/${id}/uploads/${crypto.randomUUID()}.${extension}`,hash:"",aiReadable:true};});

    const uploads=[];

    phase="upload policy";
    for(const [index,file] of files.entries())uploads.push(localStorageEnabled()?{url:`/api/upload-local?id=${id}&index=${previous.length+index}`,method:"PUT_LOCAL",fields:{}}:{...await bucket().uploadPolicy(file.key,file.type,file.size),method:"POST"});

    phase="save request";
    if(existing){
      if(!await requestStore.patch(id,{status:"uploading",files_json:JSON.stringify([...previous,...files]),estimate_json:null},{status:"draft",files_json:existing.files_json}))return response({error:"Your drawings changed while uploading. Please try again."},409);
    }else await requestStore.create({id,session_hash:session,created_at:Date.now(),status:"uploading",study:"fes",files_json:JSON.stringify(files)});

    const result=response({id,uploads});if(secret)sessionCookie(result,secret,request);return result;

  }catch(error){
    if(error instanceof Error&&error.name==="ZodError")return response({error:"Use 1–6 PDF or image drawings, up to 10 MB each."},400);
    // Log only the failure stage and message, never request bodies, cookies or signed upload fields.
    console.error("FES intake failed",{phase,message:error instanceof Error?error.message.slice(0,500):"Unknown cloud failure"});
    return response({error:"Drawing storage is not ready. Please contact Power-Link or try again later."},503);
  }

}

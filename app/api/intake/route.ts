import {z} from "zod";

import {bucket,hash,response,sameOrigin,sessionHash,sessionToken,sessionCookie,type Uploaded} from "@/lib/server";

import {requestStore,localStorageEnabled} from "@/lib/request-store";

const formats:Record<string,string>={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg"};

const Intake=z.object({study:z.literal("fes"),files:z.array(z.object({name:z.string().min(1).max(200),size:z.number().int().positive().max(10*1024*1024)})).min(1).max(6)});

export const runtime="nodejs";

export async function POST(request:Request){

  if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);

  if(Number(request.headers.get("content-length")??0)>16000)return response({error:"Upload metadata is too large."},413);

  try{

    const input=Intake.parse(await request.json());

    if(input.files.reduce((sum,f)=>sum+f.size,0)>20*1024*1024)return response({error:"Keep the combined drawings under 20 MB."},400);

    if(input.files.some(f=>!formats[f.name.split(".").pop()?.toLowerCase()??""]))return response({error:"Use PDF, PNG or JPEG drawings."},400);

    let secret:string|null=null,session=await sessionHash(request);

    if(!session){secret=sessionToken();session=await hash(secret);}

    if(!await requestStore.reserve(session))return response({error:"You have reached today’s quote request limit. Please try again tomorrow."},429);

    const id=crypto.randomUUID(),files:Uploaded[]=input.files.map(file=>{const extension=file.name.split(".").pop()!.toLowerCase();return {name:file.name.replace(/[\x00-\x1f]/g,"").slice(0,200),size:file.size,type:formats[extension],key:`requests/${id}/uploads/${crypto.randomUUID()}.${extension}`,hash:"",aiReadable:true};});

    const uploads=[];

    for(const [index,file] of files.entries())uploads.push(localStorageEnabled()?{url:`/api/upload-local?id=${id}&index=${index}`,method:"PUT_LOCAL",fields:{}}:{...await bucket().uploadPolicy(file.key,file.type,file.size),method:"POST"});

    await requestStore.create({id,session_hash:session,created_at:Date.now(),status:"uploading",study:"fes",files_json:JSON.stringify(files)});

    const result=response({id,uploads});if(secret)sessionCookie(result,secret,request);return result;

  }catch(error){return response({error:error instanceof Error&&error.name==="ZodError"?"Use 1–6 PDF or image drawings, up to 10 MB each.":"Drawing storage is not ready. Please contact Power-Link or try again later."},400);}

}

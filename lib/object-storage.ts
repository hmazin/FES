import {mkdir,readFile,writeFile,stat} from "node:fs/promises";
import path from "node:path";
import {cloudBucket} from "./cloud";
import {localStorageEnabled} from "./request-store";
type Metadata={httpMetadata?:{contentType:string};customMetadata?:Record<string,string>};
function objectPath(key:string){if(!/^requests\/[a-f0-9-]{36}\/[a-zA-Z0-9/_.-]+$/.test(key)||key.includes(".."))throw new Error("Invalid document key.");return path.join(process.cwd(),".local-data","objects",key);}
export const objects={
  async put(key:string,data:ArrayBuffer|Uint8Array,metadata:Metadata={}){objectPath(key);if(localStorageEnabled()){const target=objectPath(key);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data));await writeFile(target+".json",JSON.stringify(metadata));return;}await cloudBucket().file(key).save(Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data),{resumable:false,metadata:{contentType:metadata.httpMetadata?.contentType ?? "application/octet-stream",metadata:metadata.customMetadata}});},
  async head(key:string){objectPath(key);if(localStorageEnabled()){try{const info=await stat(objectPath(key));let meta:Metadata={};try{meta=JSON.parse(await readFile(objectPath(key)+".json","utf8"));}catch{}return {size:info.size,customMetadata:meta.customMetadata ?? {}};}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e;}}try{const [meta]=await cloudBucket().file(key).getMetadata();return {size:Number(meta.size),customMetadata:meta.metadata as Record<string,string> ?? {}};}catch(e){if((e as {code:number}).code===404)return null;throw e;}},
  async get(key:string){const meta=await this.head(key);if(!meta)return null;const bytes=localStorageEnabled() ? await readFile(objectPath(key)) : (await cloudBucket().file(key).download())[0];const data=Uint8Array.from(bytes);return {...meta,body:data as BodyInit,arrayBuffer:async()=>data.buffer};},
  async uploadPolicy(key:string,type:string,size:number){objectPath(key);const [policy]=await cloudBucket().file(key).generateSignedPostPolicyV4({expires:Date.now()+10*60000,fields:{"Content-Type":type,"success_action_status":"201"},conditions:[["content-length-range",size,size]]});return {url:policy.url,fields:policy.fields};},
  async downloadUrl(key:string,name:string){objectPath(key);const [url]=await cloudBucket().file(key).getSignedUrl({version:"v4",action:"read",expires:Date.now()+5*60000,responseDisposition:`attachment; filename*=UTF-8''${encodeURIComponent(name)}`});return url;},
};

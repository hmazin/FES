import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {firestore} from "./cloud";

export type RequestRow={id:string;session_hash:string;created_at:number;status:string;study:"fes";files_json:string;quote_key?:string;scope_json?:string|null;estimate_json?:string|null;analysis_json?:string|null;contact_json?:string|null;notification_json?:string|null};
export function localStorageEnabled() {return process.env.FES_LOCAL_STORAGE==="1" && !process.env.VERCEL;}
const localDirectory=()=>path.join(process.cwd(),".local-data");
let lock:Promise<unknown>=Promise.resolve();
async function locally<T>(operation:()=>Promise<T>):Promise<T>{const next=lock.then(operation,operation);lock=next.catch(()=>{});return next;}
async function readRows():Promise<Record<string,RequestRow>>{try{return JSON.parse(await readFile(path.join(localDirectory(),"requests.json"),"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return {};throw e;}}
async function writeRows(rows:Record<string,RequestRow>){await mkdir(localDirectory(),{recursive:true});const target=path.join(localDirectory(),"requests.json"),temporary=target+".tmp";await writeFile(temporary,JSON.stringify(rows));await rename(temporary,target);}
const collection=()=>firestore().collection("fes_requests");
function validId(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error("Invalid request identifier.");}
export const requestStore={
  async get(id:string):Promise<RequestRow|null>{validId(id);if(localStorageEnabled())return (await readRows())[id] ?? null;const doc=await collection().doc(id).get();return doc.exists ? doc.data() as RequestRow : null;},
  async create(row:RequestRow){validId(row.id);if(localStorageEnabled())return locally(async()=>{const rows=await readRows();if(rows[row.id])throw new Error("Request already exists.");rows[row.id]=row;await writeRows(rows);});await collection().doc(row.id).create(row);},
  async patch(id:string,patch:Partial<RequestRow>,expected:Partial<RequestRow>={}):Promise<boolean>{
    validId(id);const matches=(row:RequestRow)=>Object.entries(expected).every(([key,value])=>row[key as keyof RequestRow]===value);
    if(localStorageEnabled())return locally(async()=>{const rows=await readRows(),row=rows[id];if(!row||!matches(row))return false;rows[id]={...row,...patch,id:row.id,session_hash:row.session_hash};await writeRows(rows);return true;});
    return firestore().runTransaction(async transaction=>{const ref=collection().doc(id),doc=await transaction.get(ref);if(!doc.exists||!matches(doc.data() as RequestRow))return false;transaction.update(ref,patch);return true;});
  },
  async reserve(session:string):Promise<boolean>{
    const day=new Date().toISOString().slice(0,10),id=`${day}-${session}`;
    if(localStorageEnabled())return locally(async()=>{const rows=await readRows();return Object.values(rows).filter(row=>row.session_hash===session&&row.created_at>Date.now()-86400000).length<15;});
    const ref=firestore().collection("fes_intake_limits").doc(id);
    return firestore().runTransaction(async transaction=>{const doc=await transaction.get(ref),count=Number(doc.data()?.count ?? 0);if(count>=15)return false;transaction.set(ref,{count:count+1,day});return true;});
  },
  async list():Promise<RequestRow[]>{if(localStorageEnabled())return Object.values(await readRows()).sort((a,b)=>b.created_at-a.created_at).slice(0,100);return (await collection().orderBy("created_at","desc").limit(100).get()).docs.map(doc=>doc.data() as RequestRow);},
};

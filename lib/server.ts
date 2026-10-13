import {automaticCapCents} from "./pricing-config";
import {requestStore} from "./request-store";

import {objects} from "./object-storage";

import {isReviewer} from "./reviewer-auth";

export const runtime=()=>process.env;

export const bucket=()=>objects;

export function response(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}

export function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin || origin===new URL(request.url).origin;}

export async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");}

export function sessionToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");}

export async function sessionHash(request:Request){const value=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("plt_request_session="))?.slice(20);return value&&/^[a-f0-9]{64}$/.test(value)?hash(value):null;}

export async function ownRequest(request:Request,id:string){if(!/^[a-f0-9-]{36}$/.test(id))return null;const session=await sessionHash(request);if(!session)return null;const row=await requestStore.get(id);return row&&row.session_hash===session&&row.created_at>Date.now()-7*86400000?row:null;}

export const capCents=automaticCapCents;
export const reviewer=(request:Request)=>isReviewer(request.headers);

export type Uploaded={name:string;key:string;size:number;type:string;hash:string;aiReadable:boolean};

export function sessionCookie(result:Response,secret:string,request:Request){result.headers.set("Set-Cookie",`plt_request_session=${secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${new URL(request.url).protocol==="https:"?"; Secure":""}`);}

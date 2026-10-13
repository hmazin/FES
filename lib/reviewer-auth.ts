import {createHmac,timingSafeEqual} from "node:crypto";
const secret=()=>process.env.FES_ADMIN_PASSWORD;
function equal(a:string,b:string){const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);}
export function adminConfigured(){return !!process.env.FES_ADMIN_USER&&!!secret()&&secret()!.length>=16;}
export function verifyLogin(user:string,password:string){return adminConfigured()&&equal(user,process.env.FES_ADMIN_USER!)&&equal(password,secret()!);}
export function adminToken(){if(!adminConfigured())throw new Error("Dashboard login is not configured.");const payload=Buffer.from(JSON.stringify({expires:Date.now()+8*3600000})).toString("base64url");return `${payload}.${createHmac("sha256",secret()!).update(payload).digest("hex")}`;}
export function isReviewer(headers:Headers){
  if(!adminConfigured())return false;
  const token=headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("fes_admin="))?.slice(10);
  if(!token)return false;const [payload,signature]=token.split(".");if(!payload||!signature||!equal(signature,createHmac("sha256",secret()!).update(payload).digest("hex")))return false;
  try{return Number(JSON.parse(Buffer.from(payload,"base64url").toString("utf8")).expires)>Date.now();}catch{return false;}
}

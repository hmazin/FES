import {adminToken,adminConfigured,verifyLogin} from "@/lib/reviewer-auth";
import {response,sameOrigin} from "@/lib/server";
export async function POST(request:Request){
  if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);
  if(!adminConfigured())return response({error:"The owner dashboard has not been configured yet."},503);
  const form=await request.formData();
  if(!verifyLogin(String(form.get("username")||""),String(form.get("password")||"")))return new Response(null,{status:303,headers:{Location:"/dashboard/login?error=1","Cache-Control":"no-store"}});
  return new Response(null,{status:303,headers:{Location:"/dashboard","Cache-Control":"no-store","Set-Cookie":`fes_admin=${adminToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol==="https:"?"; Secure":""}`}});
}

import {response,sameOrigin} from "@/lib/server";
export async function POST(request:Request){if(!sameOrigin(request))return response({error:"Request origin is not allowed."},403);return new Response(null,{status:303,headers:{Location:"/dashboard/login","Set-Cookie":"fes_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"}});}

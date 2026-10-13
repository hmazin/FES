import {NextResponse,type NextRequest} from "next/server";
import {isReviewer} from "./lib/reviewer-auth";
export function proxy(request:NextRequest){if(!isReviewer(request.headers)){if(request.nextUrl.pathname.startsWith("/api/"))return NextResponse.json({error:"Dashboard login required."},{status:401,headers:{"Cache-Control":"no-store"}});return NextResponse.redirect(new URL("/dashboard/login",request.url));}return NextResponse.next();}
export const config={matcher:["/dashboard","/review/:path*","/api/review-file"]};

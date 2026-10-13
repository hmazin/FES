import DashboardLogin from "@/components/dashboard-login";
import {adminConfigured} from "@/lib/reviewer-auth";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const params=await searchParams;return <main className="login-main"><a className="brand" href="/"><img src="/plt-logo.svg" width="190" height="48" alt="Power-Link Technologies"/></a><div className="login-card"><p className="eyebrow">FES OWNER DASHBOARD</p><h1>Your project records.</h1><p>Sign in to review requests, drawings and quotations.</p>{adminConfigured()?<DashboardLogin initialError={!!params.error}/>:<p className="error-note">Dashboard login is awaiting owner setup.</p>}<a className="text-button" href="/">Back to the website</a></div></main>;}

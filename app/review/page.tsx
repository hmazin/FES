import {headers} from "next/headers";

import {isReviewer} from "@/lib/reviewer-auth";

import {requestStore} from "@/lib/request-store";

import {type Scope,money} from "@/lib/quote-engine";

import {publicEstimate,type InternalEstimate} from "@/lib/estimate-calculator";

export const dynamic="force-dynamic";

export default async function Review(){

  if(!isReviewer(await headers()))return <main className="container section"><h1>Reviewer sign-in required.</h1></main>;

  const rows=await requestStore.list();

  const issued=rows.filter(row=>!!row.quote_key).length,review=rows.filter(row=>row.estimate_json&&JSON.parse(row.estimate_json).route==="sales_review").length,drawings=rows.reduce((sum,row)=>sum+JSON.parse(row.files_json).length,0);

  return <main className="container section dashboard-main"><div className="dashboard-heading"><div><p className="eyebrow">PRIVATE FES RECORDS</p><h1>Drawings and quotation records.</h1></div><form action="/api/admin/logout" method="post"><button className="btn white">Log out</button></form></div><div className="dashboard-metrics">{[[rows.length,"Requests"],[issued,"PDF quotes issued"],[review,"Scopes for review"],[drawings,"Drawings retained"]].map(([count,label])=><div key={String(label)}><strong>{count}</strong><span>{label}</span></div>)}</div><p>Latest 100 requests. Original drawings and generated PDF quotations remain in Google Cloud; visitor session expiry does not delete them.</p><div className="review-list">{rows.map(row=>{const scope=row.scope_json?JSON.parse(row.scope_json) as Scope:null,estimate=row.estimate_json?publicEstimate(JSON.parse(row.estimate_json) as InternalEstimate):null,contact=row.contact_json?JSON.parse(row.contact_json) as {name:string;email:string;company:string}:null,files=JSON.parse(row.files_json) as {name:string}[];return <article key={row.id}><p className="eyebrow">{new Intl.DateTimeFormat("en-CA",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Toronto"}).format(row.created_at)} · {row.status.replaceAll("_"," ")}</p><p className="request-reference">{row.id}</p><h2>{scope?.projectName||"Drawing upload in progress"}</h2><p>{scope?.location} {estimate?`· ${money(estimate.totalCents)} CAD · ${estimate.route}`:""}</p>{contact&&<p>{contact.name} · {contact.company} · {contact.email}</p>}<div>{files.map((file,i)=><p key={i}><a href={`/api/review-file?id=${row.id}&index=${i}`}>{file.name}</a></p>)}</div>{row.quote_key&&<p><a href={`/api/quote?id=${row.id}`}>Download saved PDF quotation</a></p>}{scope?.notes&&<p>{scope.notes}</p>}</article>;})}</div><a href="/">Return to FES website</a></main>;

}

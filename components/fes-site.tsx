"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, FileText, LoaderCircle, Mail, Phone, Plus, ShieldCheck, Upload, Wind, X } from "lucide-react";

import { type Scope, type Estimate } from "@/lib/quote-engine";
import EstimateSummary from "./estimate-summary";

type Source = { name: string; hash: string; type: string; size: number };

type Analysis = { mode: string; summary: string; evidence: string[]; densityReason?: string; [key: string]: unknown };

type Contact = { name: string; email: string; company: string; consent: boolean };

type Result = { uploads?: {url:string;method:string;fields:Record<string,string>}[]; error?: string; id: string; files: Source[]; scope?: Scope; estimate?: Estimate; analysis?: Analysis; status?: string; contact?: Contact; quoteAvailable?: boolean; quoteReference?: string; notification?: { customer: string; sales: string } };

type Step = "upload" | "scope" | "result";

const initial: Scope = { study: "fes", projectName: "", location: "", services: [], buses: null, scenarios: 1, buildings: 1, pidSheets: null, complexity: "unsure", buildingLength: null, buildingWidth: null, buildingHeight: null, dimensionUnit: "ft", louverCount: null, pidFileHashes: [], buildingFileHashes: [], dataReady: false, rush: false, notes: "", confirmed: false };



function Building() {

  return <div className="drawing-board">

    <div className="drawing-title"><span><i /> PROCESS BUILDING</span><span>FES / 01</span></div>

    <svg viewBox="0 0 620 350" role="img" aria-label="Concept illustration of process equipment and building ventilation paths">

      <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#497080" strokeWidth=".5" opacity=".2" /></pattern><marker id="flow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#91ded3" /></marker></defs>

      <rect width="620" height="350" fill="url(#grid)" />

      <g fill="none" stroke="#6895a8" strokeWidth="1.4" strokeLinejoin="round"><path d="M105 143 304 64 506 143 304 222Z M105 143V238L304 316V222 M304 316 506 238V143" /><path d="M105 238 304 158 506 238 M304 64V158" opacity=".45" strokeDasharray="4 5" /><path d="m116 155 188 73 190-75 M116 155v76l188 74 190-76v-76" opacity=".35" />

      <path d="m190 203 72 28v45l-72-28z m72 28 40-16v45l-40 16 m-72-73 40-16 72 28 M318 217l52 20v39l-52-20z m52 20 37-15v39l-37 15 m-52-59 37-15 52 20" /><ellipse cx="240" cy="179" rx="17" ry="8" /><path d="M223 179v25c0 11 34 11 34 0v-25 M240 170v-28l52-21 48 19v37 M335 191l20 8v-22l-20-8z m20 8 20-8v-22l-20 8 m-20-8 20-8 20 8 M153 181l28 11v25l-28-11z m0 6 28 11 m-28-4 28 11 m-28-4 28 11 M440 175l30-12v28l-30 12z m0 7 30-12 m-30 19 30-12 m-30 19 30-12" /></g>

      <g fill="none" stroke="#91ded3" strokeWidth="2.2" markerEnd="url(#flow)"><path d="M49 192h67l50 19 M281 245l38 14 24-9 M383 230l71-31 23-13h70" /></g>

      <g fill="#91ded3"><circle cx="256" cy="218" r="4" /><circle cx="347" cy="211" r="4" /><circle cx="239" cy="150" r="3" /></g><g fill="none" stroke="#91ded3" opacity=".55"><circle cx="256" cy="218" r="11" /><circle cx="347" cy="211" r="11" /><path d="m256 207-2-65h-63 M347 200l35-78h83" /></g>

      <g fill="#b7cccf" fontFamily="monospace" fontSize="9" letterSpacing="1"><text x="36" y="177">SUPPLY AIR</text><text x="482" y="174">EXHAUST</text><text x="111" y="134">LEAK SOURCES</text><text x="391" y="114">VENTILATION</text></g>

    </svg><div className="drawing-footer"><span><i /> P&ID REVIEW</span><span><i /> BUILDING BASIS</span><span><i /> AIRFLOW ASSESSMENT</span></div><span className="drawing-caption">Concept illustration · not a study result</span>

  </div>;

}



export default function FesSite() {

  const [step, setStep] = useState<Step>("upload"), [scope, setScope] = useState<Scope>(initial);

  const [files, setFiles] = useState<File[]>([]), [sources, setSources] = useState<Source[]>([]), [id, setId] = useState("");

  const [analysis, setAnalysis] = useState<Analysis | null>(null), [estimate, setEstimate] = useState<Estimate | null>(null);

  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [dragging, setDragging] = useState(false), [restoring, setRestoring] = useState(false);

  const [saved, setSaved] = useState(false);

  const [config, setConfig] = useState({ aiEnabled: false, emailEnabled: false });

  const [aiConsent, setAiConsent] = useState(false), [contact, setContact] = useState<Contact>({ name: "", email: "", company: "", consent: false });

  const input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null), navigated = useRef(false);

  async function post(path: string, body: unknown): Promise<Result> {

    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const data = await response.json() as Result; if (!response.ok) throw new Error(data.error || "Please try again."); return data;

  }

  useEffect(() => {

    let mounted = true;

    fetch("/api/config").then(r => r.json() as Promise<{aiEnabled:boolean;emailEnabled:boolean}>).then(data => { if (mounted) setConfig(data); }).catch(() => {});

    const requestId = new URLSearchParams(window.location.search).get("request");

    if (requestId) {

      setRestoring(true);

      fetch(`/api/request?id=${encodeURIComponent(requestId)}`).then(async r => {

        const data = await r.json() as Result; if (!r.ok) throw new Error(data.error || "Your request could not be restored."); if (!mounted) return;

        if(data.status==="uploading")throw new Error("This earlier upload was not completed. Please select your drawings again.");

        setId(data.id); setSources(data.files); setAnalysis(data.analysis ?? null); setScope({ ...initial, ...data.scope, study: "fes" });

        setEstimate(data.estimate ?? null); setStep(data.estimate ? "result" : "scope"); setSaved(data.status !== "draft"); if (data.contact) setContact(data.contact);

      }).catch(e => { if (mounted) setError(e.message); }).finally(() => { if (mounted) setRestoring(false); });

    }

    return () => { mounted = false; };

  }, []);

  useEffect(() => { if (navigated.current) heading.current?.focus({ preventScroll: true }); }, [step]);

  function move(next: Step) { navigated.current = true; setStep(next); setError(""); }

  function patch(value: Partial<Scope>) { setScope(s => ({ ...s, ...value, confirmed: false })); }

  function addFiles(incoming: File[]) {

    if (busy || restoring) return;

    if (incoming.some(f => !/\.(pdf|png|jpe?g)$/i.test(f.name))) return setError("Please use PDF, PNG or JPEG drawings.");

    if (incoming.some(f => !f.size || f.size > 10 * 1024 * 1024)) return setError("Each drawing must be non-empty and no larger than 10 MB.");

    const combined = [...files, ...incoming].filter((f, i, all) => all.findIndex(other => other.name === f.name && other.size === f.size && other.lastModified === f.lastModified) === i);

    if (combined.length > 6 || combined.reduce((sum, f) => sum + f.size, 0) > 20 * 1024 * 1024) return setError("Please use up to six files, with no more than 20 MB combined.");

    setFiles(combined); setError("");

  }

  async function upload() {

    setBusy(aiConsent && config.aiEnabled ? "Uploading and reading your drawings…" : "Uploading your drawings…"); setError("");

    try {

      const prepared=await post("/api/intake",{study:"fes",files:files.map(file=>({name:file.name,size:file.size}))});

      if(!prepared.uploads||prepared.uploads.length!==files.length)throw new Error("Upload preparation failed. Please try again.");

      for(const [index,target] of prepared.uploads.entries()){

        const file=files[index];let uploaded:Response;

        if(target.method==="PUT_LOCAL")uploaded=await fetch(target.url,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});

        else {const body=new FormData();Object.entries(target.fields).forEach(([key,value])=>body.append(key,value));body.append("file",file);uploaded=await fetch(target.url,{method:"POST",body});}

        if(!uploaded.ok)throw new Error(`Could not upload ${file.name}. Please try again.`);

      }

      const data=await post("/api/intake/complete",{id:prepared.id});

      setId(data.id); setSources(data.files); window.history.replaceState(null, "", `?request=${encodeURIComponent(data.id)}#get-quote`);

      let suggestion: Analysis | undefined;

      try { suggestion = (await post("/api/analyze", { id: data.id, aiConsent: aiConsent && config.aiEnabled })).analysis; } catch { /* Manual confirmation stays available. */ }

      setAnalysis(suggestion ?? null);

      const allowed = ["projectName", "location", "buildings", "pidSheets", "scenarios", "complexity", "buildingLength", "buildingWidth", "buildingHeight", "dimensionUnit", "louverCount"];

      const updated = { ...initial, ...Object.fromEntries(Object.entries(suggestion ?? {}).filter(([key, value]) => allowed.includes(key) && value !== null && value !== undefined)) } as Scope;

      setScope(updated); move("scope");

    } catch (e) { setError(e instanceof Error ? e.message : "Your drawing could not be uploaded. Please try again."); } finally { setBusy(""); }

  }

  function setRole(hash: string, role: string) {

    patch({ pidFileHashes: [...scope.pidFileHashes.filter(h => h !== hash), ...(["pid", "both"].includes(role) ? [hash] : [])], buildingFileHashes: [...scope.buildingFileHashes.filter(h => h !== hash), ...(["building", "both"].includes(role) ? [hash] : [])] });

  }

  async function calculate(event: React.FormEvent) {

    event.preventDefault(); setBusy("Calculating your study price…"); setError("");

    try { const confirmed = { ...scope, confirmed: true }; const result = await post("/api/estimate", { id, scope: confirmed }); setScope(confirmed); setEstimate(result.estimate ?? null); move("result"); }

    catch (e) { setError(e instanceof Error ? e.message : "We couldn’t calculate your price. Please try again."); } finally { setBusy(""); }

  }

  async function save(event: React.FormEvent) {

    event.preventDefault(); setBusy("Submitting your request…"); setError("");

    try { await post("/api/submit", { id, contact }); setSaved(true); }

    catch (e) { setError(e instanceof Error ? e.message : "Your request could not be submitted. Please try again."); } finally { setBusy(""); }

  }

  function startAgain() { window.history.replaceState(null, "", "/#get-quote"); setId(""); setSources([]); setFiles([]); setScope(initial); setAnalysis(null); setEstimate(null); setSaved(false); setContact({ name: "", email: "", company: "", consent: false }); move("upload"); }

  const dimensions = !!(scope.buildingLength && scope.buildingWidth && scope.buildingHeight), current = step === "upload" ? 0 : step === "scope" ? 1 : 2;

  const unique = sources.filter((s, i) => sources.findIndex(other => other.hash === s.hash) === i), incomplete = scope.pidSheets === null || scope.buildings === null || scope.scenarios === null;

  const faq = [

    ["What do I need for an instant quote?", "Your P&IDs, unique P&ID page count, project name and location, and a building basis. Supply a building drawing or enter the length, width and height. Confirm drawing density and study requirements to calculate your price."],

    ["Can I quote a study without building drawings?", "Yes. Enter the building length, width and height and select the units. Those dimensions form part of the quotation basis. Changed dimensions or drawings may require a revised quotation."],

    ["Do I need gas composition before getting a quote?", "Gas composition is optional for quotation. The study itself requires a confirmed process and gas-data basis, which our team will establish before completing the engineering work."],

    ["Will the website read my P&IDs automatically?", config.aiEnabled ? "With your consent, the reader suggests page counts, density and printed building dimensions. You confirm the suggestions before pricing." : "The quote uses the drawing details you confirm. Automatic drawing reading is prepared but is not connected yet. Upload your P&IDs and confirm the page count and density to get an immediate scope-based price."],

    ["What happens if my scope needs review?", "Multiple buildings, extra ventilation cases, incomplete quantities, unusual requirements and expedited schedules need scope review. Contact Power-Link with your reference number so we can confirm the final scope and price."],

    ["Does this include full hazardous-area classification?", "The standard scope covers process-building fugitive leakage and ventilation assessment. Full hazardous-area classification, abnormal-release modelling, site visits and remediation design are separate scopes."],

    ["How do I get an official quotation?", "Contact Power-Link with the reference number shown beside your preliminary estimate. We’ll confirm the final scope, price, schedule and terms, then provide your official quotation."]

  ];

  return <>

    <a className="skip-link" href="#main">Skip to content</a><div className="preview-banner"><span>FUGITIVE EMISSION STUDIES</span> Power-Link Technologies</div>

    <header className="site-header"><div className="container header-inner"><a className="brand" href="#" aria-label="Power-Link Fugitive Emission Studies home"><img src="/plt-logo.svg" width="190" height="48" alt="Power-Link Technologies" /><span>FUGITIVE EMISSION STUDIES</span></a><nav aria-label="Main navigation"><a href="#expertise">Our expertise</a><a href="#process">How it works</a><a href="#questions">FAQs</a><a className="nav-cta" href="#get-quote">Get an instant quote <ArrowUpRight size={16} /></a></nav></div></header>

    <main id="main"><section className="hero"><div className="container hero-grid"><div className="hero-copy"><p className="eyebrow light"><span /> ENGINEERING, WITH A CLEAR STARTING POINT</p><h1>Upload your P&IDs.<br />Get your <em>study quote.</em></h1><p className="hero-description">Fugitive emission studies for process buildings. Share your drawings, confirm a few project details, and see your price right here.</p><div className="hero-actions"><a className="btn mint" href="#get-quote">Quote my study <ArrowUpRight size={19} /></a><a className="hero-secondary" href="#expertise">Explore the study <ArrowDown size={16} /></a></div><div className="hero-notes"><span><Check size={15} /> CAD pricing</span><span><Check size={15} /> No email needed to see your price</span></div></div><Building /></div><div className="container hero-bottom"><span>FROM PROCESS DRAWINGS TO A DEFINED STUDY SCOPE</span><span>Leakage sources <i /> Ventilation <i /> Engineering report</span></div></section>

    <section className="process-strip" id="process"><div className="container process-grid">{[["01", "Share your drawings", "Upload P&IDs and any building drawings."], ["02", "Confirm the scope", "Check page count, building basis and requirements."], ["03", "See your price", "See your preliminary estimate and reference number."]].map(([n, title, text]) => <div className="process-item" key={n}><span>{n}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div></section>

    <section className="quote-section section" id="get-quote"><div className="container"><div className="section-intro"><div><p className="eyebrow">YOUR PROJECT. YOUR PRICE.</p><h2>Start with your drawings.</h2></div><p>A clear scope makes a useful quote.<br />We’ll help you define both.</p></div><div className="quote-shell">

      <aside className="quote-sidebar"><span className="sidebar-label">INSTANT STUDY QUOTE</span><ol className="step-list">{["Upload drawings", "Confirm your scope", "Your study estimate"].map((title, i) => <li key={title} className={`${i === current ? "active" : ""} ${i < current ? "complete" : ""}`} aria-current={i === current ? "step" : undefined}><span>{i < current ? <Check size={17} /> : i + 1}</span><div>{title}<small>{["P&IDs + building basis", "A few project details", "Price + reference number"][i]}</small></div></li>)}</ol><div className="sidebar-scope"><Wind size={24} /><h3>A focused engineering study</h3><p>Process-building leakage, ventilation assessment and a documented engineering report.</p><a href="#expertise">What’s included <ArrowRight size={14} /></a></div><div className="sidebar-help"><span>Have a more complex project?</span><a href="tel:+14033414702"><Phone size={14} /> +1 403 341 4702</a><a href="mailto:info@powerlinktec.com"><Mail size={14} /> Talk to Power-Link</a></div></aside>

      <div className="quote-content" aria-busy={!!busy || restoring}>{restoring ? <div className="loading"><LoaderCircle className="spin" size={25} /><p>Restoring your project…</p></div> : <><div className="form-heading"><span className="eyebrow">STEP {current + 1} OF 3</span><h3 ref={heading} tabIndex={-1}>{step === "upload" ? "Let’s see your P&IDs." : step === "scope" ? "A few details. A clear scope." : "Your study estimate."}</h3><p>{step === "upload" ? "Add your process drawings. Include building drawings if you have them; dimensions work too." : step === "scope" ? "Identify your drawings and confirm the details to use for pricing." : "Based on the drawings and project details you confirmed."}</p></div>

      {step === "upload" && <><div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}><div className="upload-symbol"><Upload size={27} strokeWidth={1.5} /></div><h4>Drop your drawings here</h4><p>or choose files from your computer</p><button className="btn white" onClick={() => input.current?.click()} disabled={!!busy}><Plus size={17} /> Choose drawings</button><span>PDF, PNG or JPEG · up to 6 files<br />10 MB per file · 20 MB total</span><input ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="sr-only" aria-label="Choose P&ID and building drawings" disabled={!!busy} onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} /></div>{files.length > 0 && <ul className="upload-list">{files.map((f, i) => <li key={`${f.name}-${i}`}><FileText size={21} /><div><strong>{f.name}</strong><span>{(f.size / 1024 / 1024).toFixed(2)} MB</span></div><button disabled={!!busy} aria-label={`Remove ${f.name}`} onClick={() => setFiles(all => all.filter((_, j) => j !== i))}><X size={17} /></button></li>)}</ul>}<div className="upload-note"><ShieldCheck size={19} /><p>Your drawings define the study scope and the basis for your estimate.</p></div>{config.aiEnabled ? <label className="check-row"><input type="checkbox" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)} disabled={!!busy} /><span>Use AI to suggest project details. I agree to send these drawings to OpenAI for reading and will confirm the findings before pricing.</span></label> : <p className="help-text">You’ll confirm drawing details in the next step. Automatic drawing reading is not connected yet.</p>}<div className="form-bottom"><span>No contact details required at this step.</span><button className="btn blue" disabled={!files.length || !!busy} onClick={upload}>Continue with drawings <ArrowRight size={17} /></button></div></>}

      {step === "scope" && <form onSubmit={calculate}>{analysis?.mode === "ai" && <div className="analysis-note"><CheckCircle2 size={20} /><div><strong>Suggested from your drawings</strong><p>{analysis.summary}</p><p>Check the suggested details before pricing.</p>{analysis.evidence?.length > 0 && <details><summary>View source references</summary><ul>{analysis.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}</div></div>}

        <fieldset disabled={!!busy}><legend className="field-section-title">01 <span>Identify your drawings</span></legend><div className="source-list">{unique.map(f => { const pid = scope.pidFileHashes.includes(f.hash), building = scope.buildingFileHashes.includes(f.hash); return <div className="source-row" key={f.hash}><FileText size={19} /><span title={f.name}>{f.name}</span><label className="sr-only" htmlFor={`role-${f.hash}`}>Drawing type for {f.name}</label><select id={`role-${f.hash}`} value={pid && building ? "both" : pid ? "pid" : building ? "building" : "other"} onChange={e => setRole(f.hash, e.target.value)}><option value="other">Choose type / supporting</option><option value="pid">P&ID drawing</option><option value="building">Building drawing</option><option value="both">P&ID + building drawings</option></select></div>; })}</div><p className="help-text">Identify at least one P&ID. Combined packages can contain both P&IDs and building drawings. Exact duplicates are counted once.</p></fieldset>

        <fieldset disabled={!!busy}><legend className="field-section-title">02 <span>Project and drawing scope</span></legend><div className="fields-grid"><label>Project name <span className="required">*</span><input required minLength={2} maxLength={140} value={scope.projectName} placeholder="e.g. Compressor building study" onChange={e => patch({ projectName: e.target.value })} /></label><label>Site location <span className="required">*</span><input required minLength={2} maxLength={140} value={scope.location} placeholder="Site name and province / region" onChange={e => patch({ location: e.target.value })} /></label><label>Unique P&ID pages<input type="number" min="1" max="1000" step="1" value={scope.pidSheets ?? ""} placeholder="Leave blank if unsure" onChange={e => patch({ pidSheets: e.target.value === "" ? null : Number(e.target.value) })} /><small>Exclude covers, building sheets and duplicate revisions.</small></label><label>Process buildings<input type="number" min="1" max="100" step="1" value={scope.buildings ?? ""} placeholder="Leave blank if unsure" onChange={e => patch({ buildings: e.target.value === "" ? null : Number(e.target.value) })} /></label><label>P&ID density<select value={scope.complexity} onChange={e => patch({ complexity: e.target.value as Scope["complexity"] })}><option value="unsure">I’m not sure — please review</option><option value="standard">Standard — clear, limited process paths</option><option value="dense">Dense — many components and branches</option><option value="complex">Unusual scope — engineer review</option></select></label><label>Ventilation cases<input type="number" min="1" max="100" step="1" value={scope.scenarios ?? ""} placeholder="Leave blank if unsure" onChange={e => patch({ scenarios: e.target.value === "" ? null : Number(e.target.value) })} /><small>One case is one ventilation arrangement to assess.</small></label></div>{analysis?.mode === "ai" && analysis.densityReason && <p className="help-text">Drawing density suggestion: {analysis.densityReason}</p>}</fieldset>

        <fieldset disabled={!!busy}><legend className="field-section-title">03 <span>Building basis</span></legend><p className="field-description">{scope.buildingFileHashes.length ? "We’ll use the building drawings you identified. Add dimensions if you want to make the basis explicit." : "Without a building drawing, provide building length, width and height for the quote."}</p><div className="dimension-grid"><label>Units<select value={scope.dimensionUnit} onChange={e => patch({ dimensionUnit: e.target.value as "ft" | "m" })}><option value="ft">Feet (ft)</option><option value="m">Metres (m)</option></select></label>{(["buildingLength", "buildingWidth", "buildingHeight"] as const).map((field, i) => <label key={field}>{["Length", "Width", "Height"][i]}{!scope.buildingFileHashes.length && <span className="required"> *</span>}<input type="number" min="0.01" max="100000" step="any" required={!scope.buildingFileHashes.length} value={scope[field] ?? ""} placeholder={scope.buildingFileHashes.length ? "Optional" : "Required"} onChange={e => patch({ [field]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}</div><div className="fields-grid compact"><label>Louver count (optional)<input type="number" min="0" max="1000" step="1" value={scope.louverCount ?? ""} placeholder="If known" onChange={e => patch({ louverCount: e.target.value === "" ? null : Number(e.target.value) })} /></label></div></fieldset>

        <fieldset disabled={!!busy}><legend className="field-section-title">04 <span>Requirements and confirmation</span></legend><label className="full-label">Anything else we should know?<textarea maxLength={3000} value={scope.notes} placeholder="Special requirements, missing details or additional study scope…" onChange={e => patch({ notes: e.target.value })} rows={3} /></label><label className="check-row"><input type="checkbox" checked={scope.rush} onChange={e => patch({ rush: e.target.checked })} /><span>I need an expedited schedule (subject to team availability).</span></label><label className="check-row"><input type="checkbox" checked={scope.dataReady} onChange={e => patch({ dataReady: e.target.checked })} /><span>P&IDs and the building / ventilation basis are available for quotation. Gas composition can be confirmed during the study.</span></label><label className="check-row scope-confirm"><input type="checkbox" required checked={scope.confirmed} onChange={e => setScope(s => ({ ...s, confirmed: e.target.checked }))} /><span>I confirm these drawings and details define the scope to be quoted. Changed inputs may require a revised quote.</span></label></fieldset><div className="form-bottom"><button type="button" className="text-button" disabled={!!busy} onClick={startAgain}><ChevronLeft size={15} /> Change drawings</button><button className="btn blue" type="submit" disabled={!!busy || !scope.pidFileHashes.length || (!scope.buildingFileHashes.length && !dimensions)}>Calculate my price <ArrowRight size={17} /></button></div>

      </form>}

      {step === "result" && estimate && <>
        <div className="result-basis"><div><span>Project</span><strong>{scope.projectName}</strong></div><div><span>Location</span><strong>{scope.location}</strong></div><div><span>Scope</span><strong>{scope.buildings ?? "Unconfirmed"} building(s) · {scope.pidSheets ?? "Unconfirmed"} P&ID pages · {scope.scenarios ?? "Unconfirmed"} case(s)</strong></div><div><span>Building basis</span><strong>{dimensions ? `${scope.buildingLength} × ${scope.buildingWidth} × ${scope.buildingHeight} ${scope.dimensionUnit}` : "Attached building drawings"}</strong></div></div>
        {estimate.reasons.length>0&&<div className="review-note"><strong>This project needs a tailored quotation.</strong><ul>{estimate.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul><p>Power-Link will confirm the final scope and price in your official quotation.</p></div>}
        <div className="included-scope"><h4>Included in the study</h4><ul>{estimate.inclusions.map(item=><li key={item}><Check size={16}/> {item}</li>)}</ul><details><summary>Scope exclusions and quote basis</summary><ul>{estimate.excludes.map(item=><li key={item}>{item}</li>)}</ul><p>Includes the confirmed drawings and written building basis. Site work, design changes and additional scope require separate agreement. An estimate does not authorize work.</p></details></div>
        {!saved?<>
          <button className="text-button revise" disabled={!!busy} onClick={()=>{patch({confirmed:false});move("scope");}}><ChevronLeft size={15}/> Revise project details</button>
          <form className="contact-form" onSubmit={save}><h4>Your contact details</h4><p>Add your details so Power-Link can follow up about this study.</p><fieldset disabled={!!busy}><div className="fields-grid"><label>Your name <span className="required">*</span><input required minLength={2} maxLength={100} autoComplete="name" value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))}/></label><label>Email <span className="required">*</span><input type="email" required maxLength={250} autoComplete="email" value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))}/></label><label>Company (optional)<input maxLength={140} autoComplete="organization" value={contact.company} onChange={e=>setContact(c=>({...c,company:e.target.value}))}/></label></div><label className="check-row"><input required type="checkbox" checked={contact.consent} onChange={e=>setContact(c=>({...c,consent:e.target.checked}))}/><span>Power-Link may contact me about this quotation request.</span></label><button className="btn blue" type="submit" disabled={!!busy||!contact.consent}>Submit my request <ArrowRight size={17}/></button></fieldset></form>
        </>:<p className="request-confirmation" role="status"><CheckCircle2 size={22}/> Thank you. Your request has been received.</p>}
        <EstimateSummary estimate={estimate} reference={id.slice(0,8).toUpperCase()} incomplete={incomplete} onStartAgain={startAgain}/>
      </>}

      </>}{busy && <div className="busy-note" role="status"><LoaderCircle size={17} className="spin" />{busy}</div>}{error && <div className="error-note" role="alert">{error}</div>}</div></div><p className="quote-footnote">Online prices are preliminary estimates. Final scope, price and schedule are confirmed in your official quotation.</p></div></section>

      <section className="expertise-section section" id="expertise"><div className="container expertise-grid"><div className="expertise-intro"><p className="eyebrow">THE ENGINEERING BEHIND THE QUOTE</p><h2>From potential leaks<br />to a documented<br /><em>ventilation basis.</em></h2><p>A fugitive emission study connects the process equipment inside a building with the ventilation available to dilute routine leakage.</p><p>Power-Link’s study scope brings together P&ID review, building information, leakage calculations and clear engineering reporting.</p><a className="text-link" href="#get-quote">Define your study scope <ArrowUpRight size={17} /></a></div><div className="expertise-list">{[["01", "Process and leakage review", "Review the P&IDs, identify relevant potential leakage components, and establish the process and gas-data basis for the study."], ["02", "Building and ventilation assessment", "Bring together building geometry, ventilation information and the agreed operating case to evaluate dilution airflow and air changes."], ["03", "A report you can work with", "Receive calculations, stated assumptions, findings and engineering recommendations in a documented report, with professional review and stamping where applicable."]].map(([n, title, text]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={21} /></article>)}</div></div></section>

      <section className="deliverables-section section"><div className="container deliverables-grid"><div><p className="eyebrow">A DEFINED SCOPE, FROM THE START</p><h2>Know what you’re<br />quoting before you commit.</h2><p>Your official quotation sets out the agreed scope, price and project inputs after confirmation with Power-Link.</p></div><div className="deliverables-paper"><div className="paper-top"><FileText size={24} /><span>YOUR QUOTATION PACKAGE</span></div><ul>{["Confirmed study scope and CAD price", "Source drawing register and exact attachments", "Building dimensions or drawing basis", "Assumptions, exclusions and payment terms"].map((item, i) => <li key={item}><span>0{i + 1}</span>{item}<Check size={17} /></li>)}</ul><div className="paper-bottom">Official quotation <ArrowRight size={16} /><span>Contact Power-Link with your reference</span></div></div></div></section>

      <section className="faq-section section" id="questions"><div className="container faq-grid"><div><p className="eyebrow">BEFORE YOU UPLOAD</p><h2>A few useful answers.</h2><p>Need to discuss a particular scope?<br /><a href="mailto:info@powerlinktec.com">Talk to Power-Link <ArrowUpRight size={15} /></a></p></div><div className="faq-list">{faq.map(([q, a]) => <details key={q}><summary>{q}<Plus size={18} /></summary><p>{a}</p></details>)}</div></div></section>

      <section className="closing-cta"><div className="container"><div><p className="eyebrow light">START WITH WHAT YOU HAVE</p><h2>Your next step is a drawing.</h2></div><a className="btn mint" href="#get-quote">Get my study quote <ArrowUpRight size={19} /></a></div></section>

    </main><footer className="site-footer"><div className="container"><div><strong>Power-Link Technologies</strong><span>Fugitive Emission Studies</span></div><p>Process-building leakage and ventilation assessment.</p><div className="footer-links"><a href="https://www.powerlinktec.com/" target="_blank" rel="noopener noreferrer">Power-Link website <ArrowUpRight size={13} /></a><a href="mailto:info@powerlinktec.com">Contact our team</a></div></div><div className="container footer-bottom"><span>© 2026 Power-Link Technologies</span><span>CAD estimates · Official quotations on request</span></div></footer>

  </>;

}

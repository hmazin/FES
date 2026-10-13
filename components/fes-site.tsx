import {ArrowDown,ArrowRight,ArrowUpRight,Check,FileText,Plus} from "lucide-react";
import FesAssistant from "./fes-assistant";

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

  const faq = [

    ["What do I need for an instant quote?", "Start with your process drawings. The FES assistant explains which documents to upload, counts PDF pages and guides you through one question at a time. You can use explicit preliminary allowances when an answer needs confirmation."],

    ["Can I quote a study without building drawings?", "Yes. Enter dimensions if you know them, or choose “I don’t know yet”. You can still see a preliminary estimate. Power-Link will confirm the building and ventilation information before an official quotation."],

    ["Do I need gas composition before getting a quote?", "Gas composition is optional for quotation. The study itself requires a confirmed process and gas-data basis, which our team will establish before completing the engineering work."],

    ["Will the website read my P&IDs automatically?", "The assistant counts physical PDF pages automatically, then helps you identify process sheets and exclude covers or repeated revisions. Optional AI drawing suggestions are offered only when available and with your consent. You confirm the estimate basis before pricing."],

    ["What happens if my scope needs review?", "The assistant explains any allowances before you see a price. Your result lists the details Power-Link will confirm for an official quotation. Contact us with the reference number; additional buildings, alternatives or special requirements may need a tailored quote."],

    ["Does this include full hazardous-area classification?", "The standard scope covers process-building fugitive leakage and ventilation assessment. Full hazardous-area classification, abnormal-release modelling, site visits and remediation design are separate scopes."],

    ["How do I get an official quotation?", "Contact Power-Link with the reference number shown beside your preliminary estimate. We’ll confirm the final scope, price, schedule and terms, then provide your official quotation."]

  ];

  return <>

    <a className="skip-link" href="#main">Skip to content</a><div className="preview-banner"><span>FUGITIVE EMISSION STUDIES</span> Power-Link Technologies</div>

    <header className="site-header"><div className="container header-inner"><a className="brand" href="#" aria-label="Power-Link Fugitive Emission Studies home"><img src="/plt-logo.svg" width="190" height="48" alt="Power-Link Technologies" /><span>FUGITIVE EMISSION STUDIES</span></a><nav aria-label="Main navigation"><a href="#expertise">Our expertise</a><a href="#process">How it works</a><a href="#questions">FAQs</a><a className="nav-cta" href="#get-quote">Get an instant quote <ArrowUpRight size={16} /></a></nav></div></header>

    <main id="main"><section className="hero"><div className="container hero-grid"><div className="hero-copy"><p className="eyebrow light"><span /> ENGINEERING, WITH A CLEAR STARTING POINT</p><h1>Upload your P&IDs.<br />Get your <em>study quote.</em></h1><p className="hero-description">Fugitive emission studies for process buildings. Our FES assistant helps you choose the right drawings, guides you one question at a time, and gives you a preliminary price and reference number.</p><div className="hero-actions"><a className="btn mint" href="#get-quote">Quote my study <ArrowUpRight size={19} /></a><a className="hero-secondary" href="#expertise">Explore the study <ArrowDown size={16} /></a></div><div className="hero-notes"><span><Check size={15} /> CAD pricing</span><span><Check size={15} /> No email needed to see your price</span></div></div><Building /></div><div className="container hero-bottom"><span>FROM PROCESS DRAWINGS TO A DEFINED STUDY SCOPE</span><span>Leakage sources <i /> Ventilation <i /> Engineering report</span></div></section>

    <section className="process-strip" id="process"><div className="container process-grid">{[["01", "Share your drawings", "Upload P&IDs and any building drawings."], ["02", "Work through it together", "Helpful questions, quick replies and clear estimate allowances."], ["03", "See your price", "See your preliminary estimate and reference number."]].map(([n, title, text]) => <div className="process-item" key={n}><span>{n}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div></section>

    <section className="quote-section section" id="get-quote"><div className="container"><div className="section-intro"><div><p className="eyebrow">YOUR PROJECT. ONE QUESTION AT A TIME.</p><h2>Let’s work through it together.</h2></div><p>Start with a conversation.<br/>We’ll guide you from drawings to an estimate.</p></div><FesAssistant/><p className="quote-footnote">Online prices are preliminary estimates. Final scope, price and schedule are confirmed in your official quotation.</p></div></section>

      <section className="expertise-section section" id="expertise"><div className="container expertise-grid"><div className="expertise-intro"><p className="eyebrow">THE ENGINEERING BEHIND THE QUOTE</p><h2>From potential leaks<br />to a documented<br /><em>ventilation basis.</em></h2><p>A fugitive emission study connects the process equipment inside a building with the ventilation available to dilute routine leakage.</p><p>Power-Link’s study scope brings together P&ID review, building information, leakage calculations and clear engineering reporting.</p><a className="text-link" href="#get-quote">Define your study scope <ArrowUpRight size={17} /></a></div><div className="expertise-list">{[["01", "Process and leakage review", "Review the P&IDs, identify relevant potential leakage components, and establish the process and gas-data basis for the study."], ["02", "Building and ventilation assessment", "Bring together building geometry, ventilation information and the agreed operating case to evaluate dilution airflow and air changes."], ["03", "A report you can work with", "Receive calculations, stated assumptions, findings and engineering recommendations in a documented report, with professional review and stamping where applicable."]].map(([n, title, text]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={21} /></article>)}</div></div></section>

      <section className="deliverables-section section"><div className="container deliverables-grid"><div><p className="eyebrow">A DEFINED SCOPE, FROM THE START</p><h2>Know what you’re<br />quoting before you commit.</h2><p>Your official quotation sets out the agreed scope, price and project inputs after confirmation with Power-Link.</p></div><div className="deliverables-paper"><div className="paper-top"><FileText size={24} /><span>YOUR QUOTATION PACKAGE</span></div><ul>{["Confirmed study scope and CAD price", "Source drawing register and exact attachments", "Building dimensions or drawing basis", "Assumptions, exclusions and payment terms"].map((item, i) => <li key={item}><span>0{i + 1}</span>{item}<Check size={17} /></li>)}</ul><div className="paper-bottom">Official quotation <ArrowRight size={16} /><span>Contact Power-Link with your reference</span></div></div></div></section>

      <section className="faq-section section" id="questions"><div className="container faq-grid"><div><p className="eyebrow">BEFORE YOU UPLOAD</p><h2>A few useful answers.</h2><p>Need to discuss a particular scope?<br /><a href="mailto:info@powerlinktec.com">Talk to Power-Link <ArrowUpRight size={15} /></a></p></div><div className="faq-list">{faq.map(([q, a]) => <details key={q}><summary>{q}<Plus size={18} /></summary><p>{a}</p></details>)}</div></div></section>

      <section className="closing-cta"><div className="container"><div><p className="eyebrow light">START WITH WHAT YOU HAVE</p><h2>Your next step is a drawing.</h2></div><a className="btn mint" href="#get-quote">Get my study quote <ArrowUpRight size={19} /></a></div></section>

    </main><footer className="site-footer"><div className="container"><div><strong>Power-Link Technologies</strong><span>Fugitive Emission Studies</span></div><p>Process-building leakage and ventilation assessment.</p><div className="footer-links"><a href="https://www.powerlinktec.com/" target="_blank" rel="noopener noreferrer">Power-Link website <ArrowUpRight size={13} /></a><a href="mailto:info@powerlinktec.com">Contact our team</a></div></div><div className="container footer-bottom"><span>© 2026 Power-Link Technologies</span><span>CAD estimates · Official quotations on request</span></div></footer>

  </>;

}

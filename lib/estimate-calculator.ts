import {fesPricing,automaticCapCents} from "./pricing-config.ts";
import { ScopeSchema, type Estimate } from "./quote-engine.ts";



export type Line = { label: string; quantity: number; unitCents: number; totalCents: number };



export type Hours = { hourlyRateCents: number; baseHours: number; revisionHours: number; totalHours: number; revisionPercent: number; additionalPageHours: number };

export type InternalEstimate = { lines: Line[]; totalCents: number; capCents: number; currency: "CAD"; route: "automatic" | "sales_review"; reasons: string[]; sample: true; pricingVersion: string; hours?: Hours; excludes: string[]; inclusions: string[] };

// Private rate card. Customer responses expose only the total, scope and routing.

export function calculateEstimate(input: unknown, capCents = automaticCapCents()): InternalEstimate {

  const s = ScopeSchema.parse(input);

  if (!Number.isSafeInteger(capCents) || capCents < 10000 || capCents > 10000000) throw new Error("Invalid automatic quote cap.");

  const lines: Line[] = [];

  const add = (label: string, quantity: number, unitCents: number) => lines.push({label, quantity, unitCents, totalCents: Math.round(quantity*unitCents)});

  const reasons: string[] = [];

  let hours: Hours | undefined;

  if(s.study!=="fes")throw new Error("This website quotes fugitive emission studies only.");
  {
    const p = fesPricing();

    const additionalPageHours = s.complexity === "dense" || s.complexity === "complex" ? p.densePageHours : p.standardPageHours;

    if (s.pidSheets !== null) {

      add("First P&ID page", p.firstPageHours, p.hourlyRateCents);

      if (s.pidSheets > 1) add(`Additional P&ID pages (${s.pidSheets - 1} × ${additionalPageHours} h)`, (s.pidSheets - 1) * additionalPageHours, p.hourlyRateCents);

    } else reasons.push("The P&ID page count needs confirmation.");

    add("Building review, calculations and report", p.reportHours, p.hourlyRateCents);

    add("Engineering review and stamping", p.reviewHours, p.hourlyRateCents);

    add("Project setup and administration", p.setupHours, p.hourlyRateCents);

    const baseHours = lines.reduce((sum, line) => sum + line.quantity, 0);

    const revisionHours = Math.round(baseHours * p.revisionPercent) / 100;

    add("Revision allowance", revisionHours, p.hourlyRateCents);

    hours = { hourlyRateCents: p.hourlyRateCents, baseHours, revisionHours, totalHours: baseHours + revisionHours, revisionPercent: p.revisionPercent, additionalPageHours };

    if (s.buildings === null) reasons.push("The number of process buildings needs confirmation.");

    else if (s.buildings !== 1) reasons.push("This scope covers one building; additional buildings need a tailored quote.");

    if (s.scenarios === null) reasons.push("The ventilation cases need confirmation.");

    else if (s.scenarios !== 1) reasons.push("This scope covers one ventilation case; additional cases need a tailored quote.");

  }

  if(s.notes.split("\n").some(line=>line.startsWith("Estimate basis: ")))reasons.push("The preliminary allowances listed in your scope will be confirmed with Power-Link.");
  if(s.notes.split("\n").some(line=>line.trim()&&!line.startsWith("Estimate basis: ")))reasons.push("Your additional requirements will be confirmed with Power-Link.");

  if(s.rush) reasons.push("Expedited delivery needs availability confirmation.");

  if(s.complexity === "complex") reasons.push("The special process scope needs an engineer’s review.");
  if(s.complexity === "unsure") reasons.push("Drawing density will be confirmed before the official quotation.");

  const buildingBasis=!!(s.buildingFileHashes.length||(s.buildingLength&&s.buildingWidth&&s.buildingHeight));
  if(!s.dataReady&&buildingBasis)reasons.push("The remaining source details will be confirmed with Power-Link.");
  if(!buildingBasis)reasons.push("Building dimensions will be confirmed before the official quotation.");

  if(!s.confirmed) reasons.push("The client has not confirmed the scope.");

  const totalCents = lines.reduce((sum,l)=>sum+l.totalCents,0);

  // The user said BELOW the cap: exactly equal goes to review.

  if(totalCents >= capCents) reasons.push("The estimate meets or exceeds the automatic quote limit.");

  const inclusions=s.study === "fes" ? ["Review of the attached P&IDs and the confirmed building basis", "Process-building fugitive leakage and ventilation assessment", "A PLT engineering report, review and professional stamping where applicable"] : [];

  return {inclusions,lines,totalCents,capCents,currency:"CAD",route:reasons.length ? "sales_review" : "automatic",reasons,sample:true,pricingVersion:s.study === "fes" ? "fes-hours-v1" : "illustrative-v1",...(hours ? {hours} : {}),excludes:["Taxes", "Site visits and field measurements", "Equipment changes or remediation", s.study === "fes" ? "Full hazardous-area classification and abnormal-release modelling" : "Field labelling, testing, and commissioning"]};

}



// Explicit allowlist: no pricing coefficients, internal lines, hours, thresholds or revision factors leave the server.

export function publicEstimate(value:InternalEstimate):Estimate {

  return {totalCents:value.totalCents,currency:"CAD",route:value.route,reasons:value.reasons.map(reason=>/hour|revision allowance|formula|\d+%/i.test(reason) ? "This scope needs PLT review." : reason.includes("automatic quote limit") ? "This project needs a sales quotation." : reason),sample:true,excludes:value.excludes,inclusions:value.inclusions ?? ["Engineering study within the confirmed scope"]};

}

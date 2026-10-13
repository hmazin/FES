import { z } from "zod";



export const SERVICES = {

  short_circuit: { label: "Short-circuit study" },

  coordination: { label: "Protection coordination" },

  arc_flash: { label: "Arc flash assessment" },

  load_flow: { label: "Load flow / reactive power" },

  harmonics: { label: "Harmonic study" },

  cable_ampacity: { label: "Cable ampacity study" },

  grounding: { label: "Grounding assessment" },

} as const;

export const ScopeSchema = z.object({

  study: z.enum(["power", "fes"]),

  projectName: z.string().trim().min(2).max(140),

  location: z.string().trim().min(2).max(140),

  services: z.array(z.enum(Object.keys(SERVICES) as [keyof typeof SERVICES, ...Array<keyof typeof SERVICES>])).max(7),

  buses: z.number().int().min(1).max(2000).nullable(),

  scenarios: z.number().int().min(1).max(100).nullable(),

  buildings: z.number().int().min(1).max(100).nullable(),

  pidSheets: z.number().int().min(1).max(1000).nullable(),

  complexity: z.enum(["standard", "dense", "complex", "unsure"]),

  buildingLength: z.number().positive().max(100000).nullable().default(null),

  buildingWidth: z.number().positive().max(100000).nullable().default(null),

  buildingHeight: z.number().positive().max(100000).nullable().default(null),

  dimensionUnit: z.enum(["ft", "m"]).default("ft"),

  louverCount: z.number().int().min(0).max(1000).nullable().default(null),

  pidFileHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(6).default([]),

  buildingFileHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(6).default([]),

  dataReady: z.boolean(),

  rush: z.boolean(),

  notes: z.string().trim().max(3000),

  confirmed: z.boolean(),

}).superRefine((s,ctx) => {

  if (new Set(s.services).size !== s.services.length) ctx.addIssue({ code: "custom", message: "Select each study only once." });

  if (s.study === "power" && s.services.length === 0) ctx.addIssue({ code: "custom", message: "Select at least one power study." });

});

export type Scope = z.infer<typeof ScopeSchema>;

export type Estimate = {totalCents:number;currency:"CAD";route:"automatic"|"sales_review";reasons:string[];sample:true;excludes:string[];inclusions:string[]};

export function money(cents: number) { return new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(cents/100); }

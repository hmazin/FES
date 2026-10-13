import {z} from "zod";
const Pricing=z.object({hourlyRateCents:z.number().int().positive(),firstPageHours:z.number().positive(),standardPageHours:z.number().positive(),densePageHours:z.number().positive(),reportHours:z.number().nonnegative(),reviewHours:z.number().nonnegative(),setupHours:z.number().nonnegative(),revisionPercent:z.number().min(0).max(100)});
export function fesPricing(){if(!process.env.FES_PRICING_JSON)throw new Error("The private FES price profile is not configured.");return Pricing.parse(JSON.parse(process.env.FES_PRICING_JSON));}
export function automaticCapCents(){const value=Number(process.env.QUOTE_CAP_CAD);if(!Number.isFinite(value)||value<100||value>100000)throw new Error("The automatic quote limit is not configured.");return Math.round(value*100);}

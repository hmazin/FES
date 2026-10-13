import assert from "node:assert/strict";
import {calculateEstimate,publicEstimate} from "../lib/estimate-calculator.ts";
import {PricingConfigurationError,fesPricing,automaticCapCents} from "../lib/pricing-config.ts";
// Fictional testing profile; not the approved production rate card.
process.env.FES_PRICING_JSON=JSON.stringify({hourlyRateCents:10000,firstPageHours:4,standardPageHours:1.5,densePageHours:3,reportHours:2,reviewHours:2,setupHours:1,revisionPercent:20});
process.env.QUOTE_CAP_CAD="10000";
const scope={study:"fes",projectName:"Synthetic facility",location:"Alberta",services:[],buses:null,scenarios:1,buildings:1,pidSheets:2,complexity:"standard",buildingLength:30,buildingWidth:20,buildingHeight:12,dataReady:true,rush:false,notes:"",confirmed:true};
const normal=calculateEstimate(scope);assert.equal(normal.totalCents,126000);assert.equal(normal.route,"automatic");
assert.equal(calculateEstimate({...scope,complexity:"dense"}).totalCents,144000);
assert.equal(calculateEstimate({...scope,pidSheets:1}).totalCents,108000);
for(const patch of [{buildings:null},{buildings:2},{pidSheets:null},{dataReady:false},{confirmed:false},{rush:true},{complexity:"unsure"},{scenarios:null},{scenarios:2},{notes:"Additional classification requested"}])assert.equal(calculateEstimate({...scope,...patch}).route,"sales_review");
const unknownGeometry=calculateEstimate({...scope,buildingHeight:null});assert.equal(unknownGeometry.totalCents,normal.totalCents);assert.equal(unknownGeometry.route,'sales_review');assert(unknownGeometry.reasons.some(reason=>reason.includes('Building dimensions')));
assert.equal(calculateEstimate(scope,normal.totalCents).route,"sales_review");assert.equal(calculateEstimate(scope,normal.totalCents+1).route,"automatic");
assert.throws(()=>calculateEstimate({...scope,pidSheets:0}));assert.throws(()=>calculateEstimate({...scope,pidSheets:1.5}));assert.throws(()=>calculateEstimate({...scope,study:"power"}));
const visible=publicEstimate(normal);assert(!/hour|rate|revisionPercent|unitCents|pricingVersion|capCents/i.test(JSON.stringify(visible)));
const allowances=publicEstimate(calculateEstimate({...scope,notes:'Estimate basis: Page count subject to confirmation.'}));assert(allowances.reasons.some(reason=>reason.includes('preliminary allowances')),'Visible estimate assumptions must not be masked by the private-rate filter.');assert(!/hourlyRate|unitCents|revisionPercent|pricingVersion|capCents/.test(JSON.stringify(allowances)));
delete process.env.FES_PRICING_JSON;assert.throws(()=>calculateEstimate(scope),PricingConfigurationError);
for(const invalid of ['{invalid JSON}','{"hourlyRateCents":"invalid"}']){process.env.FES_PRICING_JSON=invalid;assert.throws(()=>fesPricing(),PricingConfigurationError);}
for(const invalid of ['', 'not a number', '0']){process.env.QUOTE_CAP_CAD=invalid;assert.throws(()=>automaticCapCents(),PricingConfigurationError);}
console.log("PASS: fictional prices, strict limit, review rules, invalid quantities, FES-only scope, private browser response and missing-price configuration.");

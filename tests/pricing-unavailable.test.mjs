import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
const origin=process.env.TEST_ORIGIN??'http://127.0.0.1:5173';
const pdf=await PDFDocument.create();pdf.addPage([792,612]).drawText('SYNTHETIC FES CONFIGURATION VERIFICATION - NOT A CLIENT DRAWING');
const bytes=await pdf.save();
const prepare=await fetch(origin+'/api/intake',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({study:'fes',files:[{name:'synthetic-configuration-verification.pdf',size:bytes.length}]})});
assert.equal(prepare.status,200);
const cookie=prepare.headers.get('set-cookie').split(';')[0],data=await prepare.json(),target=data.uploads[0];
let uploaded;
if(target.method==='PUT_LOCAL')uploaded=await fetch(origin+target.url,{method:'POST',headers:{cookie,origin,'Content-Type':'application/pdf'},body:bytes});
else{const form=new FormData();for(const [key,value]of Object.entries(target.fields))form.set(key,value);form.set('file',new Blob([bytes],{type:'application/pdf'}),'synthetic-configuration-verification.pdf');uploaded=await fetch(target.url,{method:'POST',headers:{origin},body:form});}
assert(uploaded.ok);
async function post(path,body){return fetch(origin+path,{method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
const complete=await post('/api/intake/complete',{id:data.id});assert.equal(complete.status,200);const saved=await complete.json();
const scope={study:'fes',projectName:'Synthetic pricing configuration verification',location:'Alberta',services:[],buses:null,scenarios:1,buildings:1,pidSheets:1,complexity:'standard',buildingLength:22,buildingWidth:16,buildingHeight:10.5,dimensionUnit:'ft',louverCount:2,pidFileHashes:[saved.files[0].hash],buildingFileHashes:[],dataReady:true,rush:false,notes:'',confirmed:true};
const result=await post('/api/estimate',{id:data.id,scope});assert.equal(result.status,503,'Run this check against an environment without configured private pricing.');
const error=await result.json();assert.equal(error.code,'QUOTE_UNAVAILABLE');assert(error.error.includes('drawings and project details are saved'));assert(!error.error.includes('try again'));assert(!/FES_PRICING|QUOTE_CAP|hourlyRate|Vercel/.test(JSON.stringify(error)));
const restored=await fetch(origin+'/api/request?id='+data.id,{headers:{cookie}});assert.equal(restored.status,200);const record=await restored.json();assert.equal(record.scope.projectName,scope.projectName);assert.equal(record.scope.pidFileHashes[0],saved.files[0].hash);assert(!record.estimate);assert.equal(record.quoteAvailable,false);
assert.equal((await fetch(origin+'/api/request?id='+data.id)).status,404);
console.log('PASS: missing private pricing returns a clear service-unavailable message, retains confirmed scope and drawings, issues no false quote, and exposes no private settings. Synthetic request only.');

"use client";

import {useEffect,useRef,useState} from "react";
import {ArrowRight,Check,CheckCircle2,ChevronLeft,FileText,HelpCircle,LoaderCircle,MessageCircle,Paperclip,Phone,Send,Upload,X} from "lucide-react";
import {type Estimate,type Scope} from "@/lib/quote-engine";
import {addAllowance,countedPages,initialScope,readDimensions,readQuantity,resumeStage,uniqueDrawings,type DrawingSource,type GuideStage} from "@/lib/intake-guidance";
import EstimateSummary from "./estimate-summary";
import "./fes-assistant.css";

type Analysis={mode:string;summary:string;densityReason?:string;documents?:{filename:string;kind:string;confidence:string}[];[key:string]:unknown};
type Contact={name:string;email:string;company:string;consent:boolean};
type ApiResult={id:string;files:DrawingSource[];uploads?:{url:string;method:string;fields:Record<string,string>}[];scope?:Scope;analysis?:Analysis;estimate?:Estimate;status?:string;contact?:Contact;error?:string};
type Message={question:string;answer:string};
const savedStages=["documents","pages","buildings","building-basis","dimensions","density","ventilation","name","location","requirements","summary"];
const prompts:Record<GuideStage,string>={welcome:"Let’s work out your study estimate together.",upload:"Start with your process drawings.",documents:"Let’s identify this drawing together.",pages:"I’ll help you with the page count.",buildings:"How many process buildings are we looking at?","building-basis":"What do you have for the building?",dimensions:"What are the building’s length, width and height?",density:"Which description looks closest to your drawings?",ventilation:"Are we checking the current ventilation, or comparing alternatives?",name:"What should we call this project?",location:"Where is the project located?",requirements:"Any special requirements or timing to allow for?",summary:"Here’s what we’ve worked out together.",estimate:"Your study estimate.","contact-name":"Who should we contact?","contact-email":"Which email should we use?","contact-consent":"May Power-Link follow up about this study?"};
const help:Partial<Record<GuideStage,string>>={
  upload:"A P&ID is a piping and instrumentation diagram. It shows process equipment connected by pipes, with valves and instrument tags. Ask your designer or facility team for the current P&IDs for the building. A site photo or electrical single-line diagram is not a P&ID. A building layout is useful too, but you can add it later.",
  documents:"Process drawings show pipes, valves and equipment connections. Building drawings show walls, floor plans, dimensions, louvers or fans. If your PDF contains both, choose ‘Both in one package’. Supporting sheets can stay attached without affecting the P&ID count.",
  pages:"Count the drawing sheets that show process piping. Leave out cover pages, building layouts and repeated or old revisions. I’ve counted the physical pages for you; you can use that count, select the relevant pages, or enter a known count. A preliminary allowance is available if the final count still needs checking.",
  buildings:"A process building is an enclosed structure containing the equipment being studied. Several pieces of equipment inside the same building still count as one building. If the boundary is not clear yet, we can explicitly start with one building for the preliminary estimate.",
  "building-basis":"A floor plan and elevation often contain the dimensions and ventilation details. If you don’t have them yet, that’s okay: building size does not change the current page-based pricing. We can give a preliminary estimate and confirm the building information before an official quotation.",
  dimensions:"Use the building enclosure dimensions, rather than an individual equipment skid. Enter length × width × height, for example ‘30 x 20 x 12 ft’ or ‘9 x 6 x 3.5 m’. If the height is unclear, choose ‘I don’t know yet’ and we’ll confirm it later.",
  density:"This is about how much process piping appears on the drawing. Choose the first option for a few clear process paths, and the second for tightly packed equipment, many branches or repeated process trains. You don’t need to count valves. If unsure, use the standard allowance and Power-Link will confirm it.",
  ventilation:"One arrangement means assessing the building’s current or proposed ventilation. Comparing the current layout with another fan/louver arrangement means two cases. If you just want the building assessed, choose ‘Just the current arrangement’.",
  name:"A short nickname is enough, such as ‘North compressor building’. It helps identify your estimate and does not need to be a formal job number.",location:"A town and province or region is enough. A street address is not required for this estimate.",requirements:"You can leave this at ‘Nothing else’. Choose expedited delivery only if you need a shorter schedule. Unusual requirements are included in the scope summary for Power-Link to confirm.",summary:"Every estimate basis is shown here. Use ‘Change’ beside an answer to correct it. The online estimate is preliminary; Power-Link confirms the final scope, price and schedule in the official quotation."
};

function Choice({title,description,onClick,disabled=false}:{title:string;description?:string;onClick:()=>void;disabled?:boolean}){
  return <button type="button" className="guide-choice" onClick={onClick} disabled={disabled}><span><strong>{title}</strong>{description&&<small>{description}</small>}</span><ArrowRight size={17}/></button>;
}

export default function FesAssistant(){
  const [stage,setStage]=useState<GuideStage>("welcome"),[scope,setScope]=useState<Scope>(initialScope);
  const [id,setId]=useState(""),[sources,setSources]=useState<DrawingSource[]>([]),[files,setFiles]=useState<File[]>([]);
  const [analysis,setAnalysis]=useState<Analysis|null>(null),[aiEnabled,setAiEnabled]=useState(false),[aiConsent,setAiConsent]=useState(false);
  const [history,setHistory]=useState<Message[]>([]),[draft,setDraft]=useState(""),[helpOpen,setHelpOpen]=useState(false);
  const [error,setError]=useState(""),[busy,setBusy]=useState(""),[restoring,setRestoring]=useState(false),[dragging,setDragging]=useState(false);
  const [estimate,setEstimate]=useState<Estimate|null>(null),[saved,setSaved]=useState(false),[editing,setEditing]=useState(false);
  const [documentIndex,setDocumentIndex]=useState(0),[pagePicker,setPagePicker]=useState(false),[selectedPages,setSelectedPages]=useState<string[]>([]);
  const [adding,setAdding]=useState(false),[manualQuantity,setManualQuantity]=useState(false),[unit,setUnit]=useState<"ft"|"m">("ft");
  const [contact,setContact]=useState<Contact>({name:"",email:"",company:"",consent:false});
  const input=useRef<HTMLInputElement>(null),question=useRef<HTMLHeadingElement>(null),prompt=useRef<HTMLDivElement>(null),interacted=useRef(false);
  const persistence=useRef<Promise<unknown>>(Promise.resolve());
  const pendingUpload=useRef<{prepared:ApiResult;files:File[];completed:Set<number>}|null>(null);
  const drawings=uniqueDrawings(sources),currentDrawing=drawings[documentIndex],pages=countedPages(sources,scope);
  const phase=["welcome","upload","documents"].includes(stage)?0:stage==="estimate"||stage.startsWith("contact-")?2:1;
  const quantitiesComplete=scope.pidSheets!==null&&scope.buildings!==null&&scope.scenarios!==null;

  async function post(path:string,body:unknown):Promise<ApiResult>{
    const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json() as ApiResult;
    if(!response.ok)throw new Error(data.error||"The connection paused. Please try this step again.");
    return data;
  }
  useEffect(()=>{
    let active=true;
    fetch("/api/config").then(response=>response.json()).then(data=>{if(active)setAiEnabled(!!data.aiEnabled);}).catch(()=>{});
    const requestId=new URLSearchParams(window.location.search).get("request");
    if(requestId){
      setRestoring(true);
      fetch(`/api/request?id=${encodeURIComponent(requestId)}`).then(async response=>{
        const data=await response.json() as ApiResult;
        if(!response.ok)throw new Error(data.error||"Let’s start a new estimate.");
        if(!active)return;
        if(data.status==="uploading")throw new Error("The earlier upload did not finish. Choose your drawings again and we’ll continue.");
        const restored={...initialScope,...data.scope,study:"fes" as const};
        setId(data.id);setSources(data.files);setScope(restored);setAnalysis(data.analysis??null);setEstimate(data.estimate??null);setSaved(data.status!=="draft");
        setStage(resumeStage(restored,!!data.estimate));setHistory([{question:"Welcome back.",answer:"Continue my estimate"}]);
        if(data.contact)setContact(data.contact);
      }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Let’s try again.");}).finally(()=>{if(active)setRestoring(false);});
    }
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!interacted.current)return;
    question.current?.focus({preventScroll:true});
    prompt.current?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  },[stage,documentIndex]);

  function go(next:GuideStage){interacted.current=true;setStage(next);setDraft(next==="name"?scope.projectName:next==="location"?scope.location:next==="contact-name"?contact.name:next==="contact-email"?contact.email:"");setHelpOpen(false);setError("");setManualQuantity(false);setPagePicker(false);}
  function persist(updated:Scope,next:GuideStage){
    if(!id||!savedStages.includes(next))return;
    persistence.current=persistence.current.catch(()=>{}).then(()=>post("/api/draft",{id,scope:{...updated,confirmed:false,chatStage:next}}));
    // An interrupted progress write does not prevent the next answer or the full-scope estimate request.
    void persistence.current.catch(()=>{});
  }
  function answer(text:string,next:GuideStage,patch:Partial<Scope>={}){
    if(busy)return;
    const updated={...scope,...patch,confirmed:false};
    if(patch.notes===undefined){
      const replaced=[...(patch.pidSheets!==undefined?[/P&ID pages/]:[]),...(patch.buildings!==undefined?[/study boundary/]:[]),...(patch.scenarios!==undefined?[/ventilation arrangement/]:[]),...(patch.complexity!==undefined?[/drawing (?:effort|density)/]:[]),...(patch.buildingLength!==undefined||patch.buildingFileHashes!==undefined?[/Building dimensions/]:[])];
      updated.notes=updated.notes.split("\n").filter(line=>!line.startsWith("Estimate basis: ")||!replaced.some(pattern=>pattern.test(line))).join("\n");
    }
    const destination=editing?"summary":next;
    setHistory(previous=>[...previous,{question:prompts[stage],answer:text}]);setScope(updated);persist(updated,destination);setEditing(false);go(destination);
  }
  function edit(next:GuideStage){setEstimate(null);setEditing(true);go(next);}
  function addFiles(incoming:File[]){
    if(busy)return;
    const supported=incoming.filter(file=>/\.(pdf|png|jpe?g)$/i.test(file.name));
    const accepted=supported.filter(file=>file.size>0&&file.size<=10*1024*1024);
    const combined=[...files,...accepted].filter((file,index,all)=>all.findIndex(other=>other.name===file.name&&other.size===file.size&&other.lastModified===file.lastModified)===index);
    if(combined.length+(adding?sources.length:0)>6||combined.reduce((sum,file)=>sum+file.size,0)+(adding?sources.reduce((sum,file)=>sum+file.size,0):0)>20*1024*1024){setError("This would exceed six drawings or 20 MB. Remove an unnecessary file or use a smaller PDF, then try again.");return;}
    setFiles(combined);setError(accepted.length!==incoming.length?"I can use PDF, PNG or JPEG drawings up to 10 MB each. Supported files are still attached; export the other drawings to PDF and add them here.":"");
  }
  async function upload(){
    if(!files.length){setError("Choose your P&ID drawings first. The ‘What should I upload?’ help explains what to look for.");return;}
    setBusy("Uploading your drawings and counting the pages…");setError("");
    try{
      await persistence.current.catch(()=>{});
      const prepared=pendingUpload.current?.prepared??await post("/api/intake",{study:"fes",...(adding?{id}:{}),files:files.map(file=>({name:file.name,size:file.size}))});
      if(!prepared.uploads||prepared.uploads.length!==files.length)throw new Error("I couldn’t prepare that upload. Please try again.");
      pendingUpload.current??={prepared,files,completed:new Set()};
      for(const [index,target]of prepared.uploads.entries()){
        if(pendingUpload.current.completed.has(index))continue;
        const file=files[index];let response:Response;
        if(target.method==="PUT_LOCAL")response=await fetch(target.url,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});
        else{const body=new FormData();for(const [key,value]of Object.entries(target.fields))body.set(key,value);body.set("file",file);response=await fetch(target.url,{method:"POST",body});}
        if(!response.ok)throw new Error(`The upload for ${file.name} paused. Your selected files are still here. Try ‘Continue with these drawings’ again.`);
        pendingUpload.current.completed.add(index);
      }
      const completed=await post("/api/intake/complete",{id:prepared.id});
      pendingUpload.current=null;setId(completed.id);setSources(completed.files);setFiles([]);
      window.history.replaceState(null,"",`?request=${encodeURIComponent(completed.id)}#get-quote`);
      let suggestion:Analysis|undefined;
      if(aiEnabled&&aiConsent){setBusy("Reading the drawing details you agreed to share…");try{suggestion=(await post("/api/analyze",{id:completed.id,aiConsent:true})).analysis;}catch{}}
      setAnalysis(suggestion??null);
      const allowed=["projectName","location","buildings","pidSheets","scenarios","complexity","buildingLength","buildingWidth","buildingHeight","dimensionUnit","louverCount"];
      const updated={...(adding?scope:initialScope),...Object.fromEntries(Object.entries(suggestion??{}).filter(([key,value])=>allowed.includes(key)&&value!==null&&value!==undefined)),confirmed:false} as Scope;
      setScope(updated);setHistory(previous=>[...previous,{question:prompts.upload,answer:`Attached ${completed.files.length} drawing file${completed.files.length===1?"":"s"}.`}]);
      setDocumentIndex(adding?drawings.length:0);go("documents");
    }catch(reason){setError(reason instanceof Error?reason.message:"The upload paused. Please try again.");}finally{setBusy("");}
  }
  function identify(role:"pid"|"building"|"both"|"other"){
    if(!currentDrawing)return;
    const hash=currentDrawing.hash;
    const updated={...scope,pidFileHashes:[...scope.pidFileHashes.filter(value=>value!==hash),...(["pid","both"].includes(role)?[hash]:[])],buildingFileHashes:[...scope.buildingFileHashes.filter(value=>value!==hash),...(["building","both"].includes(role)?[hash]:[])],confirmed:false};
    setScope(updated);setHistory(previous=>[...previous,{question:`What is ${currentDrawing.name}?`,answer:role==="pid"?"Process drawing (P&ID)":role==="building"?"Building drawing":role==="both"?"Both in one package":"Supporting document"}]);setHelpOpen(false);
    if(documentIndex<drawings.length-1){setDocumentIndex(documentIndex+1);return;}
    if(!updated.pidFileHashes.length){setError("We still need a process drawing to estimate the study. Add the P&ID when you have it, or contact Power-Link for help finding the right drawing.");return;}
    const next=adding&&updated.pidSheets!==null&&!(["pid","both"].includes(role))?"building-basis":"pages";
    setAdding(false);persist(updated,next);go(next);
  }
  function choosePageCount(count:number,allowance=false){
    if(count>1000){setError("This package is larger than the instant estimator supports. Select the P&ID pages for one building, or contact Power-Link with your reference for the complete scope.");return;}
    answer(`${count} P&ID page${count===1?"":"s"}${allowance?" as a preliminary allowance":""}`,"buildings",{pidSheets:count,...(allowance?{notes:addAllowance(scope.notes,`Use ${count} P&ID pages as a preliminary allowance; relevant sheets and revisions need confirmation.`)}:{})});
  }
  function submitText(event:React.FormEvent){
    event.preventDefault();const text=draft.trim();
    if(stage==="name"||stage==="location"){
      if(text.length<2||text.length>140){setError(stage==="name"?"A short project nickname of at least two characters is enough.":"A town and province or region is enough. Please enter at least two characters.");return;}
      answer(text,stage==="name"?"location":"requirements",stage==="name"?{projectName:text}:{location:text});
    }else if(stage==="pages"||stage==="buildings"||stage==="ventilation"){
      const number=readQuantity(text,stage==="pages"?1000:100);
      if(number===null){setError("Try a whole number such as ‘2’ or ‘two’. If you’re unsure, use the guided options below.");return;}
      if(stage==="pages")choosePageCount(number);else answer(text,stage==="buildings"?"building-basis":"name",stage==="buildings"?{buildings:number}:{scenarios:number});
    }else if(stage==="dimensions"){
      const dimensions=readDimensions(text,unit);
      if(!dimensions){setError("Enter three sizes in order: length × width × height, for example ‘30 x 20 x 12 ft’. Or choose ‘I don’t know yet’. Nothing is lost.");return;}
      answer(`${dimensions.buildingLength} × ${dimensions.buildingWidth} × ${dimensions.buildingHeight} ${dimensions.dimensionUnit}`,"density",dimensions);
    }else if(stage==="requirements")answer(text||"No special requirements","summary",{notes:[scope.notes,text].filter(Boolean).join("\n").slice(0,3000)});
    else if(stage==="contact-name"){
      if(text.length<2||text.length>100){setError("Please enter the name Power-Link should use, between 2 and 100 characters.");return;}
      setContact(previous=>({...previous,name:text}));setHistory(previous=>[...previous,{question:prompts[stage],answer:text}]);go("contact-email");
    }else if(stage==="contact-email"){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)||text.length>250){setError("That email looks incomplete. Use a format like name@company.com, or go back to your estimate.");return;}
      setContact(previous=>({...previous,email:text}));setHistory(previous=>[...previous,{question:prompts[stage],answer:text}]);go("contact-consent");
    }
  }
  async function calculate(){
    const next=resumeStage(scope,false);
    if(!scope.pidFileHashes.length||!quantitiesComplete){go(next);setError("Let’s finish this detail together before calculating.");return;}
    if(scope.projectName.trim().length<2||scope.location.trim().length<2){go(scope.projectName.trim().length<2?"name":"location");setError("Just one more detail so we can identify your estimate.");return;}
    setBusy("Calculating your preliminary study estimate…");setError("");
    try{
      await persistence.current.catch(()=>{});
      const confirmed={...scope,confirmed:true,dataReady:!!(scope.buildingFileHashes.length||(scope.buildingLength&&scope.buildingWidth&&scope.buildingHeight))};
      const result=await post("/api/estimate",{id,scope:confirmed});
      if(!result.estimate)throw new Error("The estimate did not arrive. Please try again.");
      setScope(confirmed);setEstimate(result.estimate);setHistory(previous=>[...previous,{question:prompts.summary,answer:"Use this basis for my preliminary estimate."}]);go("estimate");
    }catch(reason){setError(reason instanceof Error?reason.message:"The connection paused. Your answers are still here.");}finally{setBusy("");}
  }
  async function submitContact(){
    setBusy("Submitting your follow-up request…");setError("");
    try{await post("/api/submit",{id,contact:{...contact,consent:true}});setContact(previous=>({...previous,consent:true}));setSaved(true);go("estimate");}
    catch(reason){setError(reason instanceof Error?reason.message:"Please try again.");}finally{setBusy("");}
  }
  function startAgain(){setId("");setSources([]);setFiles([]);setScope(initialScope);setHistory([]);setEstimate(null);setSaved(false);setEditing(false);setAdding(false);setDocumentIndex(0);setSelectedPages([]);setContact({name:"",email:"",company:"",consent:false});pendingUpload.current=null;window.history.replaceState(null,"","/#get-quote");go("welcome");}

  // The active question is kept separate from earlier answers so clients never face a long form.
  return <section className="fes-guide" aria-label="Fugitive emission quote conversation" onDragOver={event=>{if(stage==="upload"){event.preventDefault();setDragging(true);}}} onDragLeave={()=>setDragging(false)} onDrop={event=>{if(stage==="upload"){event.preventDefault();setDragging(false);addFiles(Array.from(event.dataTransfer.files));}}}>
    <header className="guide-header"><span className="guide-avatar"><MessageCircle size={23}/></span><div><strong>Power-Link FES assistant</strong><span>Let’s take it one question at a time.</span></div><a href="tel:+14033414702" aria-label="Call Power-Link for help"><Phone size={18}/><span>Talk to us</span></a></header>
    <ol className="guide-progress" aria-label="Estimate progress">{["Your drawings","Your project","Your estimate"].map((label,index)=><li className={index===phase?"active":index<phase?"complete":""} aria-current={index===phase?"step":undefined} key={label}><span>{index<phase?<Check size={14}/>:index+1}</span>{label}</li>)}</ol>
    {restoring?<div className="guide-loading" role="status"><LoaderCircle className="spin"/>Picking up your conversation…</div>:<>
      {history.length>0&&<div className="guide-history" aria-label="Your earlier answers">
        {history.length>2&&<details><summary>Earlier answers ({history.length-2})</summary><div className="guide-older">{history.slice(0,-2).map((message,index)=><div className="guide-exchange" key={index}><p className="guide-assistant-message"><span>PLT</span>{message.question}</p><p className="guide-client-message"><span>You</span>{message.answer}</p></div>)}</div></details>}
        <div role="log" aria-label="Recent conversation" aria-live="polite">{history.slice(-2).map((message,index)=><div className="guide-exchange" key={`${history.length}-${index}`}><p className="guide-assistant-message"><span>PLT</span>{message.question}</p><p className="guide-client-message"><span>You</span>{message.answer}</p></div>)}</div>
      </div>}
      <div className="guide-question" ref={prompt}>
        <div className="guide-question-label"><MessageCircle size={15}/>{stage==="estimate"?"YOUR RESULT":"LET’S WORK THROUGH IT"}</div>
        <h3 ref={question} tabIndex={-1}>{prompts[stage]}</h3>
        {error&&<div className="guide-inline-help" id="guide-error" role="alert"><HelpCircle size={20}/><p>{error}</p></div>}
        {helpOpen&&<div className="guide-help" role="region" aria-label="Help with this question"><strong>Let me help.</strong><p>{help[stage]??help.upload}</p>{stage==="welcome"&&<p>You can start once you have a process drawing. If you need help obtaining one, <a href="mailto:info@powerlinktec.com">contact Power-Link</a>.</p>}</div>}
        <fieldset className="guide-controls" disabled={!!busy}>
          {stage==="welcome"&&<><p className="guide-intro">Hi, I’ll help you get a fugitive emission study estimate. We’ll start with your drawings, work through the details together, and finish with a price and reference number.</p><p className="guide-reassurance">You don’t need to know all the answers. No contact details needed to see your estimate.</p><div className="guide-choices"><Choice title="I have my drawings — let’s start" description="PDFs or images of your process drawings." onClick={()=>answer("I have my drawings","upload")}/><Choice title="Help me find the right documents" description="I’m not sure what a P&ID is or what I should upload." onClick={()=>setHelpOpen(true)}/></div></>}
          {stage==="upload"&&<><p className="guide-intro">Look for the piping and instrumentation diagrams, usually titled “P&ID”. They show the pipes, valves and equipment inside your process building.{adding?" Add the building drawing here; your other answers stay in place.":" If you have a building layout too, you can include it. Otherwise we’ll help with that later."}</p><div className={`guide-upload ${dragging?"dragging":""}`}><Upload size={26}/><strong>Drop drawings here, or choose files</strong><button type="button" className="btn white" onClick={()=>input.current?.click()}><Paperclip size={16}/> Choose drawings</button><span>PDF, PNG or JPEG · up to 6 files<br/>10 MB per file · 20 MB total</span><input className="sr-only" ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" aria-label="Choose P&ID and building drawings" onChange={event=>{addFiles(Array.from(event.target.files??[]));event.target.value="";}}/></div>{files.length>0&&<ul className="guide-files">{files.map((file,index)=><li key={`${file.name}-${index}`}><FileText size={18}/><span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>{setFiles(previous=>previous.filter((_,position)=>position!==index));pendingUpload.current=null;}}><X size={17}/></button></li>)}</ul>}{aiEnabled&&<label className="check-row"><input type="checkbox" checked={aiConsent} onChange={event=>setAiConsent(event.target.checked)}/><span>Also use AI to suggest drawing details. I agree to send these drawings to OpenAI for reading; I’ll check the suggestions.</span></label>}<button type="button" className="btn blue guide-main-action" onClick={upload}>Continue with these drawings <ArrowRight size={17}/></button></>}
          {stage==="documents"&&(currentDrawing?<><p className="guide-intro">I’ll use your answer to separate process pages from building layouts. It’s okay if several drawing types are in the same PDF.</p><div className="guide-drawing"><FileText size={24}/><div><strong>{currentDrawing.name}</strong><span>{currentDrawing.pageCount?`${currentDrawing.pageCount} physical page${currentDrawing.pageCount===1?"":"s"} counted automatically`:"We’ll work out the page allowance together."} · Drawing {documentIndex+1} of {drawings.length}</span></div></div><div className="guide-choices"><Choice title="Process drawing (P&ID)" description="Pipes connecting equipment, valves and instrument tags." onClick={()=>identify("pid")}/><Choice title="Building drawing" description="Floor plan, building dimensions, louvers or ventilation." onClick={()=>identify("building")}/><Choice title="Both in one package" description="This PDF includes process drawings and building layouts." onClick={()=>identify("both")}/><Choice title="Supporting document" description="Useful background, but not a process or building drawing." onClick={()=>identify("other")}/></div>{!scope.pidFileHashes.length&&documentIndex===drawings.length-1&&<button type="button" className="text-button guide-secondary" onClick={()=>{setAdding(true);setFiles([]);go("upload");}}>Add a P&ID drawing <Paperclip size={16}/></button>}</>:<><p className="guide-intro">The exact duplicate drawing is already attached and is counted once.</p><button type="button" className="btn blue" onClick={()=>{setAdding(false);go(scope.pidFileHashes.length?"building-basis":"upload");}}>Continue <ArrowRight size={17}/></button></>)}
          {stage==="pages"&&<><p className="guide-intro">{pages.exact?`I counted ${pages.count} physical page${pages.count===1?"":"s"} in the process drawing files. `:"Some PDF pages couldn’t be counted automatically. We can still use an explicit starting allowance. "}Only process drawing sheets belong in the estimate; leave out covers, building layouts and repeated revisions.</p>{pages.exact&&<div className="guide-finding"><CheckCircle2 size={20}/><span>{pages.count} pages found · exact duplicate files counted once</span></div>}<div className="guide-choices"><Choice title={pages.exact&&!pages.mixed?`Yes, all ${pages.count} ${pages.count===1?"page is a process drawing":"pages are process drawings"}`:`Use ${pages.count} ${pages.count===1?"page":"pages"} as a preliminary allowance`} description={pages.exact&&!pages.mixed?"Use the counted pages for this estimate.":"The final P&ID count will be confirmed in the official quote."} onClick={()=>choosePageCount(pages.count,!pages.exact||pages.mixed)}/>{pages.exact&&pages.count<=200&&<Choice title="Let me select the process pages" description="Helpful for PDFs containing covers or building layouts." onClick={()=>{setPagePicker(true);setManualQuantity(false);}}/>}<Choice title="I know the correct P&ID page count" description="Enter the number after excluding covers and duplicate revisions." onClick={()=>{setManualQuantity(true);setPagePicker(false);}}/></div>{pagePicker&&<div className="guide-page-picker"><p>Select the P&ID sheets in each file.</p>{drawings.filter(file=>scope.pidFileHashes.includes(file.hash)).map(file=><fieldset key={file.hash}><legend>{file.name}</legend><div>{Array.from({length:file.pageCount??0},(_,index)=>{const key=`${file.hash}:${index+1}`;return <label key={key}><input type="checkbox" checked={selectedPages.includes(key)} onChange={event=>setSelectedPages(previous=>event.target.checked?[...previous,key]:previous.filter(value=>value!==key))}/>Page {index+1}</label>;})}</div></fieldset>)}<button type="button" className="btn blue" onClick={()=>selectedPages.length?choosePageCount(selectedPages.length):setError("Select at least one process page, or use the preliminary allowance above.")}>Use {selectedPages.length} selected {selectedPages.length===1?"page":"pages"} <ArrowRight size={16}/></button></div>}</>}
          {stage==="buildings"&&<><p className="guide-intro">Several pieces of equipment inside one enclosure still count as one building.</p><div className="guide-choices"><Choice title="One process building" description="The usual starting scope for this study." onClick={()=>answer("One process building","building-basis",{buildings:1})}/><Choice title="More than one building" description="I’ll tell you the number, and Power-Link can confirm the wider scope." onClick={()=>setManualQuantity(true)}/><Choice title="I’m not sure — start with one building" description="Show a preliminary allowance for one building, with the boundary to be confirmed." onClick={()=>answer("One building as a preliminary allowance","building-basis",{buildings:1,notes:addAllowance(scope.notes,"One process building allowed; the study boundary will be confirmed.")})}/></div></>}
          {stage==="building-basis"&&<><p className="guide-intro">A building drawing or its length, width and height helps define the study. If you don’t have that information yet, we can still give a preliminary estimate and confirm it later.</p><div className="guide-choices">{scope.buildingFileHashes.length>0&&<Choice title="Use the building drawing I attached" description="Power-Link can confirm dimensions and ventilation details from it." onClick={()=>answer("Use my attached building drawing","density")}/>}<Choice title="I know the building dimensions" description="Enter length × width × height in feet or metres." onClick={()=>go("dimensions")}/><Choice title="I have a building drawing to add" description="Attach it here; your process drawings and answers stay in place." onClick={()=>{setAdding(true);setFiles([]);go("upload");}}/><Choice title="I don’t know yet — continue with an estimate" description="We’ll clearly mark the building information for confirmation before the official quote." onClick={()=>answer("Building information to be confirmed","density",{buildingLength:null,buildingWidth:null,buildingHeight:null,notes:addAllowance(scope.notes,"Building dimensions and ventilation information to be confirmed before the official quotation.")})}/></div></>}
          {stage==="dimensions"&&<><p className="guide-intro">Use the size of the building enclosure. You can type it naturally, for example <strong>30 x 20 x 12 ft</strong>. If you’re missing a size, you can continue with a preliminary estimate.</p><div className="guide-dimension-example" aria-label="Building dimensions example"><svg viewBox="0 0 320 130" role="img" aria-label="Building box showing length, width and height"><g fill="#eef7f4" stroke="#6b9995" strokeWidth="1.5"><path d="M62 48 167 14 267 47 161 83Z M62 48v45l99 33V83 M161 126l106-34V47"/></g><g fill="#3b686f" fontSize="12"><text x="94" y="115">Length</text><text x="215" y="113">Width</text><text x="274" y="77">Height</text></g></svg></div><label className="guide-unit">Units if not included in your answer<select value={unit} onChange={event=>setUnit(event.target.value as "ft"|"m")}><option value="ft">Feet (ft)</option><option value="m">Metres (m)</option></select></label></>}
          {stage==="density"&&<><p className="guide-intro">You don’t need to count valves or assess engineering complexity. Pick the closest visual description, or let Power-Link confirm it later.</p>{analysis?.mode==="ai"&&analysis.densityReason&&<div className="guide-finding"><FileText size={20}/><span>Drawing reader suggestion: {analysis.densityReason}</span></div>}<div className="guide-choices"><Choice title="A few clear process paths" description="Equipment and piping are easy to follow, with limited branching." onClick={()=>answer("Standard drawing detail","ventilation",{complexity:"standard"})}/><Choice title="Lots of equipment and branches" description="Tightly packed piping, many branches or repeated process trains." onClick={()=>answer("Dense drawing detail","ventilation",{complexity:"dense"})}/><Choice title="I’m not sure — use a standard allowance" description="You’ll still see a preliminary price. Power-Link will confirm the drawing effort." onClick={()=>answer("Standard effort allowance, subject to confirmation","ventilation",{complexity:"unsure",notes:addAllowance(scope.notes,"Standard drawing effort allowed; Power-Link will confirm the drawing density.")})}/></div></>}
          {stage==="ventilation"&&<><p className="guide-intro">If you just want the process building assessed, the current ventilation arrangement is a good starting point.</p><div className="guide-choices"><Choice title="Just the current arrangement" description="One ventilation case for the preliminary estimate." onClick={()=>answer("One current ventilation arrangement","name",{scenarios:1})}/><Choice title="Compare different arrangements" description="For example, the current layout and a proposed fan or louver change." onClick={()=>setManualQuantity(true)}/><Choice title="I’m not sure — use the current arrangement" description="Power-Link will confirm whether any additional cases are needed." onClick={()=>answer("One current arrangement as an allowance","name",{scenarios:1,notes:addAllowance(scope.notes,"One current ventilation arrangement allowed; additional cases will be confirmed.")})}/></div></>}
          {stage==="name"&&<p className="guide-intro">A short nickname is enough, such as “North compressor building”. You don’t need a formal project number.</p>}
          {stage==="location"&&<p className="guide-intro">A town and province or region is enough. You don’t need to enter a street address.</p>}
          {stage==="requirements"&&<><p className="guide-intro">The price is preliminary. We’ll confirm the delivery schedule with you before an official quotation.</p><div className="guide-choices"><Choice title="Nothing else — standard schedule" description="Continue to the scope summary." onClick={()=>answer("No special requirements; standard schedule","summary",{rush:false})}/><Choice title="I need an expedited schedule" description="You’ll still see the estimate; availability needs confirmation." onClick={()=>answer("Expedited schedule requested","summary",{rush:true})}/></div><p className="guide-small">Or tell us about a particular requirement below.</p></>}
          {(["name","location","dimensions","requirements","contact-name","contact-email"].includes(stage)||manualQuantity)&&<form className="guide-answer-form" onSubmit={submitText}><label htmlFor="guide-answer">{stage==="name"?"Project name":stage==="location"?"Project location":stage==="dimensions"?"Length × width × height":stage==="contact-name"?"Your name":stage==="contact-email"?"Your email":stage==="requirements"?"Special requirements (optional)":stage==="pages"?"Number of P&ID pages":stage==="buildings"?"Number of process buildings":"Number of ventilation arrangements"}</label><div><input id="guide-answer" value={draft} onChange={event=>{setDraft(event.target.value);setError("");}} placeholder={stage==="dimensions"?"e.g. 30 x 20 x 12 ft":stage==="contact-email"?"name@company.com":stage==="name"?scope.projectName||"e.g. North compressor building":stage==="location"?scope.location||"e.g. Red Deer, Alberta":manualQuantity?"e.g. 2 or two":"Type your answer…"} type={stage==="contact-email"?"email":"text"} inputMode={manualQuantity?"numeric":stage==="contact-email"?"email":"text"} autoComplete={stage==="contact-name"?"name":stage==="contact-email"?"email":"off"} maxLength={stage==="requirements"?1800:250} aria-describedby={error?"guide-error":undefined}/><button type="submit" className="btn blue">Continue <Send size={16}/></button></div></form>}
          {stage==="dimensions"&&<button type="button" className="text-button guide-secondary" onClick={()=>answer("Building dimensions to be confirmed","density",{buildingLength:null,buildingWidth:null,buildingHeight:null,notes:addAllowance(scope.notes,"Building dimensions to be confirmed before the official quotation.")})}>I don’t know yet — continue with an estimate <ArrowRight size={15}/></button>}
          {stage==="summary"&&<><p className="guide-intro">Check the answers below. You can change any detail here. Everything marked as an allowance will be confirmed before the official quotation.</p><dl className="guide-summary">{[
            ["Project",scope.projectName||"Add a project nickname","name"],["Location",scope.location||"Add a location","location"],["P&ID pages",scope.pidSheets===null?"Let’s confirm the page allowance":String(scope.pidSheets),"pages"],["Process buildings",scope.buildings===null?"Let’s confirm the building allowance":String(scope.buildings),"buildings"],["Building basis",scope.buildingLength&&scope.buildingWidth&&scope.buildingHeight?`${scope.buildingLength} × ${scope.buildingWidth} × ${scope.buildingHeight} ${scope.dimensionUnit}`:scope.buildingFileHashes.length?"Attached building drawing":"To be confirmed before official quotation","building-basis"],["Drawing effort",scope.complexity==="dense"?"Dense":scope.complexity==="standard"?"Standard":"Standard allowance; confirmation needed","density"],["Ventilation",scope.scenarios===null?"Let’s confirm the arrangement":`${scope.scenarios} arrangement${scope.scenarios===1?"":"s"}`,"ventilation"]
          ].map(([label,value,next])=><div key={label}><dt>{label}</dt><dd>{value}</dd><button type="button" onClick={()=>edit(next as GuideStage)} aria-label={`Change ${label.toLowerCase()}`}>Change</button></div>)}</dl>{scope.notes&&<div className="guide-basis"><strong>Estimate basis and things to confirm</strong><ul>{scope.notes.split("\n").filter(Boolean).map((note,index)=><li key={index}>{note.replace(/^Estimate basis: /,"")}</li>)}</ul></div>}{(scope.buildings!==1||scope.scenarios!==1)&&<p className="guide-basis">The displayed amount will be an allowance for one building and one ventilation arrangement. Power-Link will price the additional scope in your official quotation.</p>}<button type="button" className="btn blue guide-main-action" onClick={calculate}>Use this basis and see my estimate <ArrowRight size={17}/></button><p className="guide-small">This calculates a preliminary estimate. It does not authorize work.</p></>}
          {stage==="estimate"&&estimate&&<><p className="guide-intro">Based on the drawings and answers we worked through together. Your price and reference number are at the end of this summary.</p><div className="result-basis"><div><span>Project</span><strong>{scope.projectName}</strong></div><div><span>Location</span><strong>{scope.location}</strong></div><div><span>Scope</span><strong>{scope.buildings} building(s) · {scope.pidSheets} P&ID pages · {scope.scenarios} ventilation arrangement(s)</strong></div><div><span>Building basis</span><strong>{scope.buildingLength&&scope.buildingWidth&&scope.buildingHeight?`${scope.buildingLength} × ${scope.buildingWidth} × ${scope.buildingHeight} ${scope.dimensionUnit}`:scope.buildingFileHashes.length?"Attached building drawing":"To be confirmed"}</strong></div></div>{estimate.reasons.length>0&&<div className="guide-basis"><strong>To confirm for your official quotation</strong><p>Your preliminary estimate is below. Power-Link will confirm these items with you:</p><ul>{estimate.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></div>}<div className="included-scope"><h4>Included in the study</h4><ul>{estimate.inclusions.map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul><details><summary>Scope exclusions and quote basis</summary><ul>{estimate.excludes.map(item=><li key={item}>{item}</li>)}</ul><p>The estimate uses the confirmed page allowance and project answers. Site work, design changes and additional scope require separate agreement.</p></details></div>{saved?<p className="request-confirmation" role="status"><CheckCircle2 size={22}/>Thank you. Your request has been received.</p>:<div className="guide-result-actions"><button type="button" className="text-button" onClick={()=>edit("summary")}><ChevronLeft size={15}/> Change my answers</button><button type="button" className="btn white" onClick={()=>go("contact-name")}>Ask Power-Link to follow up <ArrowRight size={16}/></button></div>}<EstimateSummary estimate={estimate} reference={id.slice(0,8).toUpperCase()} incomplete={!quantitiesComplete} basisLabel={scope.buildings!==1||scope.scenarios!==1?"ONE BUILDING · ONE VENTILATION CASE":undefined} onStartAgain={startAgain}/></>}
          {stage==="contact-name"&&<p className="guide-intro">This is optional. Your estimate is already available. Add your details if you’d like Power-Link to follow up about an official quotation.</p>}
          {stage==="contact-email"&&<p className="guide-intro">Thanks, {contact.name}. We’ll use this address only to follow up about your study request.</p>}
          {stage==="contact-consent"&&<><p className="guide-intro">Power-Link may contact <strong>{contact.name}</strong> at <strong>{contact.email}</strong> about this study and an official quotation.</p><div className="guide-choices"><Choice title="Yes — submit my follow-up request" description="Power-Link may contact me about this quotation request." onClick={submitContact}/><Choice title="Change my email" onClick={()=>go("contact-email")}/><Choice title="Just return to my estimate" description="I’ll contact Power-Link myself using the reference number." onClick={()=>go("estimate")}/></div></>}
        </fieldset>
        {busy&&<p className="guide-status" role="status"><LoaderCircle size={19} className="spin"/>{busy}</p>}
        {!busy&&stage!=="estimate"&&<div className="guide-question-footer">{help[stage]&&<button type="button" className="text-button" onClick={()=>setHelpOpen(previous=>!previous)}><HelpCircle size={16}/>{stage==="upload"?"What should I upload?":stage==="pages"?"Help me choose the right pages":"Help with this question"}</button>}{stage.startsWith("contact-")&&<button type="button" className="text-button" onClick={()=>go("estimate")}><ChevronLeft size={15}/> Back to my estimate</button>}</div>}
      </div>
    </>}
    <footer className="guide-footer"><span>Fugitive emission studies · CAD preliminary estimates</span><a href="mailto:info@powerlinktec.com">Need a person? Contact Power-Link <ArrowRight size={13}/></a></footer>
  </section>;
}

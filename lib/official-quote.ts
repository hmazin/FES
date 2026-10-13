import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { quoteTemplate, quotePlacements, plexRegular, plexBold } from "./quote-template.ts";
import type { Scope } from "./quote-engine";
import type { InternalEstimate } from "./estimate-calculator";
import type { Uploaded } from "./server";

export type QuoteContact = {name:string;email:string;company:string};
export type QuoteSource = Uploaded & {bytes:Uint8Array};
export function quoteReference(id:string,date:Date) { return `Q-${date.getUTCFullYear()}-${id.replaceAll("-","").slice(0,12).toUpperCase()}`; }
export function quoteKey(id:string) { return `requests/${id}/quote/Rev-A.pdf`; }
export function canIssueQuote(scope:Scope,estimate:InternalEstimate) { return scope.study==="fes" && scope.confirmed && estimate.route==="automatic" && estimate.pricingVersion==="fes-hours-v1"; }
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const ink=rgb(31/255,41/255,51/255),blue=rgb(11/255,83/255,148/255),muted=rgb(91/255,101/255,115/255);
const clean=(s:string)=>s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"");
function wrap(value:string,font:PDFFont,size:number,width:number):string[] {
  const result:string[]=[];
  for(const paragraph of clean(value).split("\n")) {
    let line="";
    for(const word of paragraph.split(/\s+/)) {
      if(!word) continue;
      if(line && font.widthOfTextAtSize(`${line} ${word}`,size)>width) {result.push(line);line="";}
      // Filenames, hashes and unbroken client text must fit inside the page.
      let segment="";
      for(const char of Array.from(word)) {
        if(segment && font.widthOfTextAtSize(segment+char,size)>width) {if(line){result.push(line);line="";}result.push(segment);segment="";}
        segment+=char;
      }
      line=line ? `${line} ${segment}` : segment;
    }
    result.push(line);
  }
  return result;
}

/** Fill the compiled PLT template; preserve the submitted sources as visible pages and original embedded files. */
export async function buildOfficialQuote(input:{id:string;scope:Scope;estimate:InternalEstimate;contact:QuoteContact;sources:QuoteSource[];issued:Date}) {
  const {id,scope,estimate,contact,sources,issued}=input;
  if(!canIssueQuote(scope,estimate)) throw new Error("PLT needs to review this scope before issuing an official quotation.");
  const pdf=await PDFDocument.load(decode(quoteTemplate));pdf.registerFontkit(fontkit);
  const regular=await pdf.embedFont(decode(plexRegular),{subset:true});const bold=await pdf.embedFont(decode(plexBold),{subset:true});
  const reference=quoteReference(id,issued);
  const issuedText=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",month:"short",day:"numeric",year:"numeric"}).format(issued);
  const amount=new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(estimate.totalCents/100);
  const fields:Record<string,string>={QUOTE_REFERENCE:reference,ISSUE_DATE:issuedText,CLIENT_NAME:contact.name,CLIENT_COMPANY:contact.company || "Individual client",CLIENT_EMAIL:contact.email,PROJECT_NAME:scope.projectName,PROJECT_LOCATION:scope.location,PRICE:amount};
  function fillPage(page:PDFPage,originalIndex:number) {
    for(const field of quotePlacements.filter(f=>f.page===originalIndex)) {
      const text=clean(fields[field.key] ?? "");const font=field.bold ? bold : regular;
      let size=field.size;
      while(size>6 && font.widthOfTextAtSize(text,size)>field.maxWidth) size-=0.2;
      const value=font.widthOfTextAtSize(text,size)<=field.maxWidth ? text : (()=>{let shortened=text;while(shortened.length && font.widthOfTextAtSize(shortened+"…",size)>field.maxWidth) shortened=shortened.slice(0,-1);return shortened+"…";})();
      const color=rgb(((field.color>>16)&255)/255,((field.color>>8)&255)/255,(field.color&255)/255);
      page.drawText(value,{x:field.right ? field.rightX-font.widthOfTextAtSize(value,size) : field.x,y:field.y,size,font,color});
    }
  }
  pdf.getPages().forEach((page,index)=>fillPage(page,index));
  // Copy the template before adding basis text, to retain the verified PLT header and footer.
  const chrome=await PDFDocument.create();const [chromePage]=await chrome.copyPages(pdf,[1]);chrome.addPage(chromePage);
  const prepared:Array<{file:QuoteSource;document?:PDFDocument;image?:Awaited<ReturnType<PDFDocument["embedPng"]>>;count:number}>=[];
  let totalSourcePages=0;
  for(const file of sources) {
    const digest=await crypto.subtle.digest("SHA-256",new Uint8Array(file.bytes).buffer);
    const actual=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
    if(actual!==file.hash) throw new Error(`The stored source ${file.name} has changed. PLT must review the quotation basis.`);
    let document:PDFDocument|undefined;let image:Awaited<ReturnType<PDFDocument["embedPng"]>>|undefined;
    try {
      if(file.type==="application/pdf") {document=await PDFDocument.load(file.bytes);if(!document.getPageCount()) throw new Error("No pages");}
      if(file.type==="image/png") image=await pdf.embedPng(file.bytes);
      if(file.type==="image/jpeg") image=await pdf.embedJpg(file.bytes);
    } catch {throw new Error(`The drawing ${file.name} could not be included. Please provide an unlocked, readable PDF or image.`);}
    const count=document?.getPageCount() ?? (image ? 1 : 0);totalSourcePages+=count;
    if(totalSourcePages>100) throw new Error("This drawing package needs PLT review before issuing the quotation.");
    prepared.push({file,document,image,count});
  }
  let page=pdf.getPage(1);let y=495; // Starts below the template's pricing summary.
  async function nextPage() {
    const [copy]=await pdf.copyPages(chrome,[0]);pdf.addPage(copy);page=copy;
    page.drawRectangle({x:38,y:60,width:536,height:630,color:rgb(1,1,1)});y=665;
  }
  async function paragraph(text:string,heading=false,size=9.5) {
    const font=heading ? bold : regular;const lines=wrap(text,font,size,532);const height=lines.length*(size+3.5)+7;
    if(heading && y-Math.min(height,35)<65) await nextPage();
    for(const line of lines) {if(y-(size+3.5)<65) await nextPage();page.drawText(line,{x:40,y,size,font,color:heading ? blue : ink});y-=size+3.5;}
    y-=7;
  }
  await paragraph("Appendix A — Confirmed quotation basis",true,12);
  await paragraph(`Project: ${scope.projectName}\nLocation: ${scope.location}`);
  await paragraph(`Client: ${contact.name}${contact.company ? `, ${contact.company}` : ""}\nEmail: ${contact.email}`);
  await paragraph(`Scope: ${scope.buildings} building; ${scope.pidSheets} unique P&ID pages; ${scope.scenarios} ventilation case. The client confirmed the scope and identified the attached P&IDs.`);
  const dims=[scope.buildingLength,scope.buildingWidth,scope.buildingHeight];
  await paragraph(dims.every(n=>n!==null) ? `Client-provided dimensions (length × width × height): ${dims.join(" × ")} ${scope.dimensionUnit}.${scope.buildingFileHashes.length ? " To be checked against the attached building drawings." : " No building drawing was provided; these written dimensions define the quotation basis."}` : "Building geometry is based on the identified building drawing(s) below. Dimensions will be verified during the engineering review.");
  await paragraph(`Louver count: ${scope.louverCount===null ? "not specified; to be confirmed from the building information" : `${scope.louverCount}, supplied by the client`}. Gas composition: to be confirmed during the engineering study.`);
  if(scope.notes) {await paragraph("Client requirements and stated assumptions",true);await paragraph(scope.notes);}
  // Keep the source register readable and avoid separating a filename from its fingerprint.
  if(y<330) await nextPage();
  await paragraph("Submitted source register",true,11);
  await paragraph("Drawing numbers and revisions have not been independently verified. The filenames and SHA-256 fingerprints below identify the exact supplied files. Full original files are embedded in this PDF; PDF and image drawings are also reproduced as pages after this register.");
  for(let index=0;index<prepared.length;index++) {
    const {file,count}=prepared[index];const roles=[scope.pidFileHashes.includes(file.hash) ? "P&ID" : "",scope.buildingFileHashes.includes(file.hash) ? "Building drawing" : ""].filter(Boolean).join(" / ") || "Supporting information";
    const blockHeight=wrap(`${index+1}. ${file.name}`,bold,9.5,532).length*13+wrap(`${roles}\nSHA-256: ${file.hash}`,regular,8.5,532).length*12+25;
    if(y-blockHeight<65) await nextPage();
    await paragraph(`${index+1}. ${file.name}`,true);
    await paragraph(`${roles} · ${count ? `${count} source page${count===1 ? "" : "s"} reproduced in attachment order` : "Original file embedded; not reproduced as pages"}\nSHA-256: ${file.hash}`,false,8.5);
  }
  await paragraph("The attached documents and stated inputs govern this price. Subsequent changes require PLT's written scope and price confirmation before affected work proceeds.");
  const quotationPages=pdf.getPageCount();
  for(let index=0;index<quotationPages;index++) {
    const target=pdf.getPage(index);const label=`Page ${index+1} of ${quotationPages}`;
    target.drawText(label,{x:(target.getWidth()-regular.widthOfTextAtSize(label,7))/2,y:30,size:7,font:regular,color:muted});
  }
  // Attachment pages retain the client's original title blocks and page size.
  for(let index=0;index<prepared.length;index++) {
    const {file,document,image}=prepared[index];
    await pdf.attach(file.bytes,`${String(index+1).padStart(2,"0")}_${file.name}`,{mimeType:file.type,description:`Original submitted source; SHA-256 ${file.hash}`,creationDate:issued,modificationDate:issued});
    if(document) for(const original of await pdf.copyPages(document,document.getPageIndices())) pdf.addPage(original);
    else if(image) {const target=pdf.addPage(image.width>image.height ? [792,612] : [612,792]);const scale=Math.min((target.getWidth()-72)/image.width,(target.getHeight()-72)/image.height);target.drawImage(image,{x:(target.getWidth()-image.width*scale)/2,y:(target.getHeight()-image.height*scale)/2,width:image.width*scale,height:image.height*scale});}
  }
  pdf.setTitle(`${reference} — ${scope.projectName}`);pdf.setAuthor("Power-Link Technologies Ltd.");pdf.setSubject("Fugitive emission study quotation with confirmed source documents");pdf.setCreationDate(issued);pdf.setModificationDate(issued);
  return {bytes:await pdf.save(),reference,quotationPages,sourcePages:totalSourcePages};
}

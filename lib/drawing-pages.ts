import {PDFDocument} from "pdf-lib";

// Physical pages are an intake aid. The client still identifies P&IDs, covers and building sheets.
export async function drawingPageCount(bytes:ArrayBuffer|Uint8Array,type:string):Promise<number|null>{
  if(type.startsWith("image/"))return 1;
  if(type!=="application/pdf")return null;
  try{
    const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
    const count=pdf.getPageCount();
    return count>0&&count<=1000?count:null;
  }catch{return null;}
}

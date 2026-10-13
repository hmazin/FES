import type {Scope} from "./quote-engine";

export type GuideStage="welcome"|"upload"|"documents"|"pages"|"buildings"|"building-basis"|"dimensions"|"density"|"ventilation"|"name"|"location"|"requirements"|"summary"|"estimate"|"contact-name"|"contact-email"|"contact-consent";
export type DrawingSource={name:string;hash:string;type:string;size:number;pageCount?:number|null};
export const initialScope:Scope={study:"fes",projectName:"",location:"",services:[],buses:null,scenarios:1,buildings:1,pidSheets:null,complexity:"unsure",buildingLength:null,buildingWidth:null,buildingHeight:null,dimensionUnit:"ft",louverCount:null,pidFileHashes:[],buildingFileHashes:[],dataReady:false,rush:false,notes:"",confirmed:false};
const words:Record<string,number>={one:1,single:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
export function readQuantity(text:string,max:number):number|null{
  const value=text.trim().toLowerCase();
  const match=value.match(/^(\d+|one|single|two|three|four|five|six|seven|eight|nine|ten)(?:\s+(?:pages?|sheets?|buildings?|cases?|arrangements?))?$/);
  if(!match)return null;
  const count=words[match[1]]??Number(match[1]);
  return Number.isInteger(count)&&count>=1&&count<=max?count:null;
}
export function readDimensions(text:string,unit:"ft"|"m"){
  const match=text.trim().match(/^(\d+(?:\.\d+)?)\s*(?:×|x|,|by)\s*(\d+(?:\.\d+)?)\s*(?:×|x|,|by)\s*(\d+(?:\.\d+)?)(?:\s*(ft|feet|foot|m|metres|meters))?$/i);
  if(!match)return null;
  const values=match.slice(1,4).map(Number);
  if(values.some(value=>value<=0||value>100000))return null;
  return {buildingLength:values[0],buildingWidth:values[1],buildingHeight:values[2],dimensionUnit:match[4]?(/^(m|metres|meters)$/i.test(match[4])?"m":"ft"):unit};
}
export function uniqueDrawings(files:DrawingSource[]){return files.filter((file,index)=>files.findIndex(other=>other.hash===file.hash)===index);}
export function countedPages(files:DrawingSource[],scope:Scope){
  const selected=uniqueDrawings(files).filter(file=>scope.pidFileHashes.includes(file.hash));
  const unknown=selected.filter(file=>!file.pageCount).length;
  const known=selected.reduce((sum,file)=>sum+(file.pageCount??0),0);
  return {count:known+unknown,exact:unknown===0,mixed:selected.some(file=>scope.buildingFileHashes.includes(file.hash))};
}
export function addAllowance(notes:string,text:string){
  const topic=[/P&ID pages/,/study boundary/,/Building dimensions/,/drawing (?:effort|density)/,/ventilation arrangement/].find(pattern=>pattern.test(text));
  const existing=notes.split("\n").filter(line=>line&&!(line.startsWith("Estimate basis: ")&&topic?.test(line)));
  return [...existing,`Estimate basis: ${text}`].join("\n").slice(0,3000);
}
export function resumeStage(scope:Scope,hasEstimate:boolean):GuideStage{
  if(!scope.pidFileHashes.length)return "documents";
  if(scope.pidSheets===null)return "pages";
  if(scope.buildings===null)return "buildings";
  if(scope.scenarios===null)return "ventilation";
  if(hasEstimate)return "estimate";
  const saved=(scope as Scope&{chatStage?:GuideStage}).chatStage;
  return saved&&["documents","pages","buildings","building-basis","dimensions","density","ventilation","name","location","requirements","summary"].includes(saved)?saved:"summary";
}

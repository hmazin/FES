import type { Scope } from "./quote-engine";
import type { Uploaded } from "./server";
export function validateQuoteBasis(scope:Scope,files:Uploaded[]) {
  const referenced=[...scope.pidFileHashes,...scope.buildingFileHashes];
  if(referenced.some(hash=>!files.some(file=>file.hash===hash && (file.type==="application/pdf" || file.type.startsWith("image/"))))) throw new Error("Select the actual attached drawings defining this scope.");
  if(scope.study==="fes") {
    if(!scope.pidFileHashes.length) throw new Error("A P&ID drawing is required for a fugitive emission estimate. Attach it and identify the P&ID file.");
    if(!scope.buildingFileHashes.length && !(scope.buildingLength && scope.buildingWidth && scope.buildingHeight)) throw new Error("Attach a building drawing or provide its length, width and height. These dimensions form part of the quote basis.");
  }
}

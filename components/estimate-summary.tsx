import {ArrowRight,ArrowUpRight,Phone} from "lucide-react";
import {type Estimate,money} from "@/lib/quote-engine";
import "./estimate-summary.css";

export default function EstimateSummary({estimate,reference,incomplete,basisLabel,onStartAgain}:{estimate:Estimate;reference:string;incomplete:boolean;basisLabel?:string;onStartAgain:()=>void}){
  const contactUrl=`mailto:info@powerlinktec.com?subject=${encodeURIComponent(`Fugitive emission study quotation - Reference ${reference}`)}`;
  return <section className="estimate-summary" aria-label="Study estimate and reference">
    <div className={`price-card ${estimate.route!=="automatic"?"review-price":""}`}>
      <div>
        <span>{basisLabel??"YOUR STUDY ESTIMATE"}</span>
        <strong>{incomplete?"Let’s confirm your scope":money(estimate.totalCents)}</strong>
        <p>{incomplete?"Contact us to confirm the scope and price.":"CAD · before applicable taxes · preliminary estimate"}</p>
        <p className="estimate-reference">Reference: <b>{reference}</b></p>
      </div>
      <span className="price-status">{estimate.route==="automatic"?"Preliminary estimate":"Engineer review"}</span>
    </div>
    <div className="official-quote-contact">
      <div><h4>For an official quote</h4><p>Contact Power-Link and include your reference number. We’ll confirm the final scope, price and schedule.</p></div>
      <div className="official-quote-actions"><a className="btn blue" href={contactUrl}>Contact us for an official quote <ArrowUpRight size={17}/></a><a href="tel:+14033414702"><Phone size={14}/> +1 403 341 4702</a></div>
    </div>
    <button className="text-button new-request" onClick={onStartAgain}>Start another project <ArrowRight size={15}/></button>
  </section>;
}

'use client';

/** Opens the browser print dialog. The @media print rules in globals.css
 *  hide the app chrome and lay the page out as a single label. */
export default function PrintLabelButton(){
  return <button className="btn no-print" type="button" onClick={()=>window.print()}>Print Label</button>;
}

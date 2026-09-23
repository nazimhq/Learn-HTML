'use client';
import {useEffect,useRef,useState} from 'react';

/** Counts from 0 up to `value` on mount. Renders the final value immediately
 *  when the viewer has asked for reduced motion, or before hydration. */
export default function Counter({value,prefix='',decimals=0,duration=900}:{value:number;prefix?:string;decimals?:number;duration?:number}){
  const [shown,setShown]=useState(value);
  const [counting,setCounting]=useState(false);
  const frame=useRef<number>();

  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(value);return}
    const start=performance.now();
    setCounting(true);
    const tick=(now:number)=>{
      const t=Math.min(1,(now-start)/duration);
      const eased=1-Math.pow(1-t,3);
      setShown(value*eased);
      if(t<1){frame.current=requestAnimationFrame(tick)}else{setShown(value);setCounting(false)}
    };
    frame.current=requestAnimationFrame(tick);
    return ()=>{if(frame.current)cancelAnimationFrame(frame.current)};
  },[value,duration]);

  return <span data-counting={counting||undefined}>{prefix}{shown.toFixed(decimals)}</span>;
}

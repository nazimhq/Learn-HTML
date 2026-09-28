'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Modal from './Modal';
import {useStore} from '@/lib/useStore';

/* Barcode / QR scanning.

   Uses the browser's own BarcodeDetector where it exists (Chrome and Edge on
   Android and desktop). Safari and Firefox do not have it, so the dialog says
   so plainly and offers typing the SKU instead — the scan is a shortcut, never
   the only way in. */

type Detector = {detect: (source: CanvasImageSource) => Promise<Array<{rawValue: string}>>};

export default function ScannerDialog({onClose}: {onClose: () => void}) {
  const {state} = useStore();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  function open(code: string) {
    const needle = code.trim().toLowerCase();
    const hit = state.products.find(p =>
      p.barcode.toLowerCase() === needle || p.sku.toLowerCase() === needle);
    if (!hit) {
      setError(`Nothing in the inventory has the code “${code.trim()}”.`);
      return;
    }
    onClose();
    router.push(`/product/?id=${hit.id}`);
  }

  useEffect(() => {
    const Ctor = (window as unknown as {BarcodeDetector?: new (o: object) => Detector}).BarcodeDetector;
    if (!Ctor) { setSupported(false); return; }
    setSupported(true);

    let stop = false;
    let detector: Detector;
    try {
      detector = new Ctor({formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39']});
    } catch {
      setSupported(false);
      return;
    }

    (async () => {
      try {
        setStatus('Starting the camera…');
        const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('Point the camera at the label.');
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found.length > 0) { open(found[0].rawValue); return; }
          } catch { /* a frame that cannot be read is not an error */ }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch {
        setStatus('');
        setError('The camera could not be opened. Check the browser permission, or type the SKU below.');
      }
    })();

    return () => {
      stop = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Modal title="Scan a barcode or QR" onClose={onClose}>
    <div className="stack">
      {supported === false && <div className="notice">
        This browser has no built-in barcode reader. Chrome or Edge on the warehouse phone will
        scan; otherwise type the SKU below — it does the same thing.
      </div>}

      {supported && <>
        <video ref={videoRef} playsInline muted
          style={{width: '100%', borderRadius: 12, background: 'var(--surface-3)', aspectRatio: '4/3', objectFit: 'cover'}}/>
        {status && <div className="muted" style={{fontSize: 13}}>{status}</div>}
      </>}

      <form className="stack" onSubmit={e => { e.preventDefault(); setError(''); open(manual); }}>
        <label className="field" htmlFor="sc-manual">Or type the SKU / barcode
          <input id="sc-manual" className="input" value={manual} onChange={e => setManual(e.target.value)} placeholder="HZ-AF-000124"/>
        </label>
        {error && <div className="notice reveal" role="alert">{error}</div>}
        <div className="row" style={{justifyContent: 'flex-end', gap: 10}}>
          <button className="btn secondary" type="button" onClick={onClose}>Close</button>
          <button className="btn" type="submit">Open product</button>
        </div>
      </form>
    </div>
  </Modal>;
}

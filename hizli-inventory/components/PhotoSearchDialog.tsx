'use client';

import {useState} from 'react';
import Link from 'next/link';
import Modal from './Modal';
import {useStore} from '@/lib/useStore';
import {available, locationOf} from '@/lib/store';
import {fileToDataUrl} from '@/lib/image';
import {findByPhoto, matchBand, type PhotoMatch} from '@/lib/imagehash';
import type {Product} from '@/lib/types';

export default function PhotoSearchDialog({onClose}: {onClose: () => void}) {
  const {state} = useStore();
  const [photo, setPhoto] = useState('');
  const [matches, setMatches] = useState<Array<PhotoMatch<Product>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);

  async function run(file: File | undefined) {
    if (!file) return;
    setError('');
    setMatches(null);
    try {
      setBusy(true);
      const url = await fileToDataUrl(file, 600, 0.8);
      setPhoto(url);
      const active = state.products.filter(p => !p.archived);
      setMatches(await findByPhoto(url, active));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Find a product by photo" onClose={onClose}>
    <div className="stack">
      {!photo && <div
        className={'dropzone' + (over ? ' over' : '')}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); run(e.dataTransfer.files?.[0]); }}
      >
        <p style={{marginTop: 0}}><b>Take or drop a photo</b> of the item in front of you.</p>
        <input className="input" type="file" accept="image/*" capture="environment"
          style={{maxWidth: 300, margin: '0 auto'}} aria-label="Photo of the product"
          onChange={e => run(e.target.files?.[0])}/>
        <p className="muted" style={{fontSize: 12, marginBottom: 0}}>
          The picture is compared on this device. Nothing is uploaded anywhere.
        </p>
      </div>}

      {photo && <div className="photo-pick">
        <img src={photo} alt="" className="photo-preview"/>
        <div className="stack" style={{alignContent: 'start'}}>
          <div><b>{busy ? 'Comparing…' : `${matches?.length ?? 0} possible match${matches?.length === 1 ? '' : 'es'}`}</b></div>
          <div className="muted" style={{fontSize: 12}}>
            Compared against {state.products.filter(p => !p.archived).length} active product photos.
          </div>
          <button className="btn secondary" type="button" onClick={() => { setPhoto(''); setMatches(null); }}>
            Try another photo
          </button>
        </div>
      </div>}

      {error && <div className="notice reveal" role="alert">{error}</div>}

      {matches && matches.length === 0 && <div className="card muted">
        Nothing in the inventory looks like that photo. It may be a new product — add it from
        Inventory, or try a straighter shot against a plain background.
      </div>}

      {matches && matches.length > 0 && <div className="stack">
        {matches.map(({item, score}) => {
          const band = matchBand(score);
          return <div className="card" key={item.id}>
            <div className="row" style={{alignItems: 'flex-start'}}>
              <div className="row" style={{justifyContent: 'flex-start', gap: 12, minWidth: 0}}>
                <img className="thumb" src={item.image} alt="" style={{width: 58, height: 58}}/>
                <div style={{minWidth: 0}}>
                  <b>{item.title}</b>
                  <div className="muted" style={{fontSize: 12, marginTop: 3}}>
                    {item.sku} · {locationOf(item) || 'no location'} · {available(item)} available
                  </div>
                </div>
              </div>
              <div style={{textAlign: 'right', flex: '0 0 auto'}}>
                <div className="metric" style={{fontSize: 20, marginTop: 0}}>{score}%</div>
                <span className={'badge ' + (band.tone === 'good' ? 'good' : band.tone === 'warn' ? 'warn' : 'low')}>
                  {band.label}
                </span>
              </div>
            </div>
            <div style={{marginTop: 10}}>
              <Link className="link-btn" href={`/product/?id=${item.id}`} onClick={onClose}>Open this product</Link>
            </div>
          </div>;
        })}
      </div>}

      <div className="muted" style={{fontSize: 12}}>
        This compares how the pictures look, not what the item is, so two products photographed
        alike can score highly. Always confirm the SKU before picking — the system never decides a
        match for you.
      </div>
    </div>
  </Modal>;
}

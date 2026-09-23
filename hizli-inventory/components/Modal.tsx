'use client';

import {useEffect, useRef} from 'react';

export default function Modal({title, onClose, children}: {title: string; onClose: () => void; children: React.ReactNode}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
      <div className="modal-head">
        <h3 style={{margin: 0}}>{title}</h3>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

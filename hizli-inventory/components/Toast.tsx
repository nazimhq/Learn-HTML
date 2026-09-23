'use client';

import {useEffect} from 'react';

export default function Toast({message, onDone}: {message: string; onDone: () => void}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return <div className="toast" role="status">{message}</div>;
}

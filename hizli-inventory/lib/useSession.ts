'use client';

import {useEffect, useState} from 'react';
import {currentSession, type Session} from './auth';

const listeners = new Set<() => void>();
export function notifySessionChange() { listeners.forEach(fn => fn()); }

export function useSession(): {session: Session | null; ready: boolean} {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setSession(currentSession());
    read();
    setReady(true);
    listeners.add(read);
    return () => { listeners.delete(read); };
  }, []);

  return {session, ready};
}

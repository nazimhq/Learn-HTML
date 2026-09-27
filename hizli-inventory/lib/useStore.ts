'use client';

import {useEffect, useState} from 'react';
import {getState, subscribe} from './store';
import type {State} from './types';

/** Re-renders whenever the store commits. Returns the seed state on the server
 *  and for the first client render, so hydration stays consistent. */
export function useStore(): {state: State; ready: boolean} {
  const [state, setState] = useState<State>(() => getState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState({...getState()});
    setReady(true);
    return subscribe(() => setState({...getState()}));
  }, []);

  return {state, ready};
}

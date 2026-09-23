'use client';

import {useEffect, useState} from 'react';
import {getState, subscribe, type State} from './store';

/** Re-renders whenever the store commits. Returns the seed state on the server
 *  and during the first client render, so hydration stays consistent. */
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

import { useSyncExternalStore } from 'react';

const query = '(max-width: 760px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** Dar ekran mı: telefonda masaüstü yerine Mobile açılır. */
export const useMobile = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

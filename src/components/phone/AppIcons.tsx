import { useId } from 'react';

/*
 * Original home-screen icons: each is a full squircle tile drawn in SVG (background gradient,
 * glyph with soft shading and a top gloss), so they read like a real, cohesive icon set.
 */

export type IconId = 'chats' | 'terfi' | 'social' | 'traffic';

export function AppIcon({ id }: { id: IconId }) {
  const uid = useId().replace(/:/g, '');
  const g = (n: string) => `${n}-${uid}`;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={g('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={g('drop')} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor="#000" floodOpacity="0.28" />
        </filter>
        {id === 'chats' && (
          <linearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5ff08e" />
            <stop offset="1" stopColor="#12a150" />
          </linearGradient>
        )}
        {id === 'terfi' && (
          <linearGradient id={g('bg')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b2b3a" />
            <stop offset="1" stopColor="#11111a" />
          </linearGradient>
        )}
        {id === 'social' && (
          <linearGradient id={g('bg')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff9a62" />
            <stop offset="0.55" stopColor="#f04f7c" />
            <stop offset="1" stopColor="#8b3fd0" />
          </linearGradient>
        )}
        {id === 'traffic' && (
          <linearGradient id={g('bg')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e6ebf0" />
          </linearGradient>
        )}
        {id === 'terfi' && (
          <linearGradient id={g('gold')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe28a" />
            <stop offset="1" stopColor="#d49a1c" />
          </linearGradient>
        )}
      </defs>

      <rect width="60" height="60" rx="14" fill={`url(#${g('bg')})`} />

      {id === 'chats' && (
        <g filter={`url(#${g('drop')})`}>
          <path d="M30 13c-9.9 0-18 6.6-18 14.8 0 4.6 2.5 8.7 6.5 11.4L17 46.5l8.4-4.2c1.5.3 3 .5 4.6.5 9.9 0 18-6.6 18-14.9S39.9 13 30 13z" fill="#fff" />
          <circle cx="22.5" cy="28" r="2.4" fill="#12a150" />
          <circle cx="30" cy="28" r="2.4" fill="#12a150" />
          <circle cx="37.5" cy="28" r="2.4" fill="#12a150" />
        </g>
      )}

      {id === 'terfi' && (
        <g filter={`url(#${g('drop')})`}>
          {/* Rising bars → a crown on top: the career ladder */}
          <rect x="13" y="36" width="8" height="11" rx="2" fill="#6c6c86" />
          <rect x="24" y="29" width="8" height="18" rx="2" fill="#9b9bb8" />
          <rect x="35" y="21" width="8" height="26" rx="2" fill={`url(#${g('gold')})`} />
          <path d="M33 18l2.2-6 3.8 3.8L43 11.8l2 6.2z" fill={`url(#${g('gold')})`} />
          <path d="M12 30l9-6 7 3 12-11" fill="none" stroke="#ffe28a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 3.4" />
        </g>
      )}

      {id === 'social' && (
        <g filter={`url(#${g('drop')})`}>
          {/* A briefcase whose body is a speech bubble, with a heart: career + social */}
          <path d="M24 17.5v-2.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 17.5h28a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H30l-7 6v-6h-7a4 4 0 0 1-4-4v-15a4 4 0 0 1 4-4z" fill="#fff" />
          <path d="M30 37s-7-4.2-7-8.8c0-2.2 1.6-3.8 3.6-3.8 1.4 0 2.6.8 3.4 2 .8-1.2 2-2 3.4-2 2 0 3.6 1.6 3.6 3.8 0 4.6-7 8.8-7 8.8z" fill="#e1306c" />
        </g>
      )}

      {id === 'traffic' && (
        <>
          {/* Mini map: water, roads, route and pin */}
          <path d="M38 0h10c-4 10 2 20-2 32s2 20 0 28H36c3-9-2-18 2-28S34 10 38 0z" fill="#aad3df" />
          <path d="M0 40l60-12" stroke="#fcd97c" strokeWidth="5" />
          <path d="M0 40l60-12" stroke="#e8542f" strokeWidth="1.8" strokeDasharray="10 4" />
          <path d="M18 0v60" stroke="#d6dde4" strokeWidth="3" />
          <path d="M12 52c6-8 4-16 12-22s18-4 22-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <path d="M12 52c6-8 4-16 12-22s18-4 22-14" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" />
          <g filter={`url(#${g('drop')})`}>
            <path d="M46 20c-1.6-3.6-6-6-6-10.5a6 6 0 0 1 12 0C52 14 47.6 16.4 46 20z" fill="#ea4335" />
            <circle cx="46" cy="9.5" r="2.2" fill="#8c1d14" />
          </g>
          <circle cx="12" cy="52" r="3.4" fill="#1a73e8" stroke="#fff" strokeWidth="1.6" />
        </>
      )}

      <rect width="60" height="30" rx="14" fill={`url(#${g('gloss')})`} />
    </svg>
  );
}

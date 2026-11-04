import s from './Deck.module.css';

/*
 * Güvertenin önü: vernikli ahşap küpeşte, beyaz boyalı demir dikmeler. Küpeştenin üstünde ince
 * belli bardakta çay (tabağında iki küp şeker) ve kâğıdın üstünde bir simit. Çayın yüzeyi ufukla
 * birlikte eğilir: vapur sallanınca çay da sallanır.
 */
export function Deck({ tea, simit, still, onTea, onSimit }: { tea: number; simit: 'here' | 'gone'; still: boolean; onTea: () => void; onSimit: () => void }) {
  const INK = '#2a2420';
  const rail = 772;
  return (
    <svg className={`${s.deck} ${still ? s.deckStill : ''}`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="false" role="group" aria-label="Küpeşte">
      <defs>
        <linearGradient id="vapur-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9814f" />
          <stop offset="1" stopColor="#7a4c2c" />
        </linearGradient>
        <linearGradient id="vapur-tea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a210f" />
          <stop offset="0.5" stopColor="#b8431c" />
          <stop offset="1" stopColor="#7a210f" />
        </linearGradient>
        <clipPath id="vapur-glass">
          <path d="M-30 -120 C-30 -86 -16 -74 -16 -56 C-16 -38 -27 -24 -27 0 L27 0 C27 -24 16 -38 16 -56 C16 -74 30 -86 30 -120 Z" />
        </clipPath>
      </defs>

      {/* dikmeler ve alt boru */}
      <g fill="#ece8de" stroke={INK} strokeWidth={2.4}>
        {[40, 300, 560, 820, 1080, 1340, 1580].map((x) => (
          <rect key={x} x={x - 9} y={rail + 26} width={18} height={140} />
        ))}
        <rect x={-10} y={rail + 84} width={1620} height={12} rx={6} />
      </g>
      {/* küpeşte */}
      <path d={`M-10 ${rail} L1610 ${rail} L1610 ${rail + 30} L-10 ${rail + 30} Z`} fill="url(#vapur-wood)" stroke={INK} strokeWidth={2.4} />
      <path d={`M-10 ${rail + 7} L1610 ${rail + 7}`} stroke="rgba(255,236,200,.35)" strokeWidth={3} />

      {/* simit, kâğıdın üstünde */}
      <g className={s.prop} role="button" tabIndex={0} aria-label="Simit: martıya at" onClick={onSimit} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSimit()}>
        <path d={`M640 ${rail + 2} l120 0 l-14 -10 l-96 0 Z`} fill="#efe6d2" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        {simit === 'here' && (
          <g className={s.simit}>
            <ellipse cx={700} cy={rail - 12} rx={46} ry={15} fill="#b8743a" stroke={INK} strokeWidth={2} />
            <ellipse cx={700} cy={rail - 15} rx={17} ry={5} fill="#efe6d2" stroke={INK} strokeWidth={1.6} />
            {[-34, -22, -8, 10, 24, 34, -28, 18].map((dx, i) => (
              <ellipse key={i} cx={700 + dx} cy={rail - 16 + (i % 3) * 4 - (Math.abs(dx) > 30 ? -3 : 3)} rx={2.4} ry={1.3} fill="#f4e3b8" />
            ))}
          </g>
        )}
        <rect x={640} y={rail - 40} width={120} height={44} fill="transparent" />
      </g>
      {simit === 'gone' && (
        <g className={s.catch}>
          <ellipse cx={0} cy={0} rx={30} ry={10} fill="#b8743a" stroke={INK} strokeWidth={2} />
          <path d="M-40 -16 q20 -22 40 -4 q20 -18 40 4" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </g>
      )}

      {/* çay: tabak, iki küp şeker, ince belli bardak */}
      <g className={s.prop} role="button" tabIndex={0} aria-label="Çay bardağı: tazele" onClick={onTea} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTea()}>
        <ellipse cx={900} cy={rail - 2} rx={78} ry={15} fill="#f3eee4" stroke={INK} strokeWidth={2} />
        <ellipse cx={900} cy={rail - 4} rx={58} ry={9} fill="none" stroke="#c43c2c" strokeWidth={2} />
        <g fill="#fbfaf6" stroke={INK} strokeWidth={1.5}>
          <path d={`M836 ${rail - 8} l14 -4 l12 4 l0 12 l-12 4 l-14 -4 Z`} />
          <path d={`M848 ${rail - 4} l12 -4 l12 4 l0 10 l-12 4 l-12 -4 Z`} />
        </g>
        <g transform={`translate(900 ${rail - 6})`}>
          <g clipPath="url(#vapur-glass)">
            <rect x={-40} y={-140} width={80} height={150} fill="rgba(255,255,255,.28)" />
            {/* çay: yüzey ufukla birlikte eğilir; dokununca tazelenir */}
            <g className={s.liquid} key={tea}>
              <rect x={-60} y={-98} width={120} height={110} fill="url(#vapur-tea)" />
              <ellipse cx={0} cy={-98} rx={60} ry={4} fill="#c95a2a" />
            </g>
          </g>
          <path d="M-30 -120 C-30 -86 -16 -74 -16 -56 C-16 -38 -27 -24 -27 0 L27 0 C27 -24 16 -38 16 -56 C16 -74 30 -86 30 -120" fill="none" stroke={INK} strokeWidth={2.2} />
          <ellipse cx={0} cy={-120} rx={30} ry={4} fill="none" stroke={INK} strokeWidth={1.8} />
          <path d="M-22 -110 C-22 -90 -10 -80 -10 -64" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} strokeLinecap="round" />
          {/* kaşık */}
          <path d="M8 -128 L22 -60" stroke="#9aa0a6" strokeWidth={3} strokeLinecap="round" />
          {/* buhar */}
          <g className={s.steam} fill="none" stroke="rgba(255,255,255,.65)" strokeWidth={2.4} strokeLinecap="round">
            <path d="M-8 -132 c-8 -10 8 -18 0 -30" />
            <path d="M8 -136 c-8 -10 8 -18 0 -30" />
          </g>
        </g>
        <rect x={820} y={rail - 150} width={160} height={160} fill="transparent" />
      </g>
    </svg>
  );
}

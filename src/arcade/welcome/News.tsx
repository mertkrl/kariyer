import { useState } from 'react';
import { DAILY, type News as NewsData } from '../news';
import type { Progress } from '../progress';
import type { GameRoute } from '../slugs';
import s from './News.module.css';

/*
 * Salonun Mahalle Postası (news.ts): kaç durakta mesai bittiği, mahalleden bir haber ya da bir
 * durağın çağrısı ve her gün yenilenen içerik. Bağlantılar o oyuna götürür. Seri ya da ceza yok.
 */
/** Paylaşımın sonucu: kart telefonda paylaşım menüsüne gider, başka yerde iner. */
const NOTE = { saved: 'Kart indi, metin panoya kopyalandı.', shared: 'Paylaşıldı.', error: 'Kart hazırlanamadı.' } as const;

export function News({ news, progress, onGo }: { news: NewsData; progress: Progress; onGo: (route: GameRoute) => void }) {
  const [state, setState] = useState<'idle' | 'busy' | keyof typeof NOTE>('idle');
  // karnenin çizimi ve paylaşım kodu salonun ilk paketinde değil: basınca iner (mahalleCard.ts)
  const share = async () => {
    setState('busy');
    try {
      const { shareMahalle } = await import('../mahalleCard');
      const out = await shareMahalle(progress);
      setState(out === 'cancelled' ? 'idle' : out);
    } catch {
      setState('error');
    }
  };
  return (
    <div className={s.news} aria-label="Mahalle Postası">
      {news.done > 0 && (
        <p className={s.count}>
          <b>
            {news.done}/{news.total}
          </b>{' '}
          durakta mesai bitti{' · '}
          <button type="button" className={s.link} onClick={share} disabled={state === 'busy'}>
            {state === 'busy' ? 'karne hazırlanıyor…' : 'karneni paylaş'}
          </button>
          <span role="status" className={s.note}>
            {state in NOTE ? ` ${NOTE[state as keyof typeof NOTE]}` : ''}
          </span>
        </p>
      )}
      <p>
        <span className={s.tag}>Mahalle Postası</span>{' '}
        <button type="button" className={s.link} onClick={() => onGo(news.route)}>
          {news.line}
        </button>
      </p>
      <p>
        <span className={s.tag}>Bugün</span>{' '}
        {DAILY.map((d, i) => (
          <span key={d.route}>
            {i > 0 && ' · '}
            <button type="button" className={s.link} onClick={() => onGo(d.route)}>
              {d.label}
            </button>
          </span>
        ))}
      </p>
    </div>
  );
}

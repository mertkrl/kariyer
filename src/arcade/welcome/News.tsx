import { DAILY, type News as NewsData } from '../news';
import type { GameRoute } from '../slugs';
import s from './News.module.css';

/*
 * Salonun Mahalle Postası (news.ts): kaç durakta mesai bittiği, mahalleden bir haber ya da bir
 * durağın çağrısı ve her gün yenilenen içerik. Bağlantılar o oyuna götürür. Seri ya da ceza yok.
 */
export function News({ news, onGo }: { news: NewsData; onGo: (route: GameRoute) => void }) {
  return (
    <div className={s.news} aria-label="Mahalle Postası">
      {news.done > 0 && (
        <p className={s.count}>
          <b>
            {news.done}/{news.total}
          </b>{' '}
          durakta mesai bitti
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

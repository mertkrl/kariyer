import { PhotoArt } from '../PhotoArt';
import { AYSE } from '../socialContent';
import { Icon } from './SocialIcon';
import { ME, type Post } from './socialTypes';
import styles from '../SocialApp.module.css';
import own from './SocialPost.module.css';
import { avatarStyle } from '../../../ui/avatarStyle';

interface SocialPostProps {
  post: Post;
  liked: boolean;
  saved: boolean;
  following: boolean;
  /** Bu gönderide kalp animasyonu oynuyor. */
  burst: boolean;
  /** Oy verdiğin anket seçeneği, varsa. */
  myVote: number | undefined;
  onLike: (fromDoubleTap?: boolean) => void;
  onSave: () => void;
  onFollow: () => void;
  onVote: (option: number) => void;
  onComments: () => void;
  onShare: () => void;
}

function HeartBurst() {
  return (
    <svg viewBox="0 0 24 24" className={styles.heartBurst}>
      <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

/** Tek bir Kariyergram gönderisi: başlık, fotoğraf / metin kartı / anket, eylemler, beğeniler ve açıklama. */
export function SocialPost({ post: p, liked, saved, following, burst, myVote: my, onLike, onSave, onFollow, onVote, onComments, onShare }: SocialPostProps) {
  const total = p.poll ? p.poll.options.reduce((s, o) => s + o.votes, 0) : 0;
  const likes = p.likes + (liked ? 1 : 0);
  return (
    <article className={`${styles.post} ${p.mine ? own.postMine : ''}`}>
      <header className={own.postHead}>
        <span className={`${styles.avatar} ${p.candidate ? own.avatarPlain : ''}`} style={avatarStyle(p.author.color)}>
          {p.author.initials}
        </span>
        <span className={own.postMeta}>
          <strong>
            {p.handle}
            {p.author === AYSE || p.sponsored ? <span className={own.verified}>✓</span> : null}
          </strong>
          <span>{p.sponsored ? 'Sponsorlu' : p.candidate ? 'İş arıyor · açık pozisyonlara başvuruyor' : (p.place ?? p.time)}</span>
        </span>
        {!p.mine && !p.sponsored && p.author !== ME && (
          <button className={`${own.followBtn} ${following ? own.following : ''}`} onClick={onFollow}>
            {following ? 'Takiptesin' : 'Takip et'}
          </button>
        )}
      </header>

      {p.photo && (
        <div className={own.photo} onDoubleClick={() => onLike(true)}>
          <PhotoArt kind={p.photo} className={styles.photoArt} />
          {burst && <HeartBurst />}
          {p.sponsored && <span className={own.adCta}>Demo talep et ›</span>}
        </div>
      )}

      {!p.photo && !p.poll && (
        <div className={own.textCard} onDoubleClick={() => onLike(true)} style={{ background: `linear-gradient(145deg, ${p.author.color}, #2a2622)` }}>
          {p.text}
          {burst && <HeartBurst />}
        </div>
      )}

      {p.poll && (
        <div className={own.poll}>
          <strong>{p.poll.question}</strong>
          {p.poll.options.map((o, i) => {
            const pct = Math.round((o.votes / total) * 100);
            return (
              <button key={o.label} className={`${own.pollOption} ${my === i ? own.pollMine : ''}`} onClick={() => onVote(i)} disabled={my !== undefined}>
                {my !== undefined && <i style={{ width: `${pct}%` }} />}
                <span>{o.label}</span>
                {my !== undefined && <b className="mono">%{pct}</b>}
              </button>
            );
          })}
          <small>
            {total.toLocaleString('tr-TR')} oy {my === undefined ? '· oy vermek için dokun' : '· oyun kaydedildi'}
          </small>
        </div>
      )}

      <div className={own.actions}>
        <button className={`${own.action} ${liked ? own.liked : ''}`} onClick={() => onLike()} aria-label="Beğen" aria-pressed={liked}>
          <Icon name={liked ? 'heartFill' : 'heart'} />
        </button>
        <button className={own.action} onClick={onComments} aria-label="Yorum">
          <Icon name="comment" />
        </button>
        <button className={own.action} onClick={onShare} aria-label="Gönder">
          <Icon name="send" />
        </button>
        <span className={own.spacer} />
        <button className={`${own.action} ${saved ? own.savedOn : ''}`} onClick={onSave} aria-label="Kaydet" aria-pressed={saved}>
          <Icon name={saved ? 'bookmarkFill' : 'bookmark'} />
        </button>
      </div>
      <div className={own.likes}>
        <b className="mono" key={likes}>
          {likes.toLocaleString('tr-TR')}
        </b>{' '}
        beğenme
      </div>
      {(p.photo || p.poll) && (
        <p className={own.caption}>
          <b>{p.handle}</b> {p.text}
        </p>
      )}
      {p.comments.length > 0 && (
        <button className={own.viewComments} onClick={onComments}>
          {p.comments.length} yorumun tümünü gör
        </button>
      )}
      <span className={own.time}>{p.sponsored ? '' : p.time}</span>
    </article>
  );
}

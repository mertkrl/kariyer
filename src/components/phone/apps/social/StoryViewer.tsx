import { useEffect, useRef } from 'react';
import { audioEngine } from '../../../../audio/audioEngine';
import { PhotoArt } from '../PhotoArt';
import type { StorySeed } from '../socialContent';
import styles from '../SocialApp.module.css';

interface StoryViewerProps {
  stories: readonly StorySeed[];
  index: number;
  /** Başka bir hikâyeyi açar ya da null ile görüntüleyiciyi kapatır. */
  onOpen: (i: number | null) => void;
}

/** Tam ekran hikâye görüntüleyici: kendiliğinden ilerler, dokunuş/ok tuşları sayfa çevirir, Escape kapatır. */
export function StoryViewer({ stories, index: story, onOpen }: StoryViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const next = story < stories.length - 1 ? story + 1 : null;

  // açık hikâye klavyeyi alır, böylece ok tuşları onun sayfalarını çevirir
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  // kendiliğinden ilerleme; en son onOpen tetiklenme anında okunur, böylece üst bileşenin yeniden çizilmesi zamanlayıcıyı baştan başlatmaz
  const openRef = useRef(onOpen);
  useEffect(() => {
    openRef.current = onOpen;
  });
  useEffect(() => {
    const id = window.setTimeout(() => openRef.current(next), 3200);
    return () => window.clearTimeout(id);
  }, [story, next]);

  const current = stories[story];
  return (
    <div
      className={styles.storyViewer}
      role="button"
      tabIndex={0}
      aria-label="Hikâye: sağa dokun ya da sağ ok sonraki, sola dokun ya da sol ok önceki"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onOpen(null);
        else if (e.key === 'ArrowLeft') onOpen(Math.max(0, story - 1));
        else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') onOpen(next);
        else return;
        // burada ele alındı: çevresindeki telefon bu Escape'le kapanmamalı
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const back = e.clientX - r.left < r.width / 3;
        onOpen(back ? Math.max(0, story - 1) : next);
        audioEngine.playUi('click');
      }}
    >
      <PhotoArt kind={current.photo} className={styles.storyArt} />
      <span className={styles.storyShade} />
      <span className={styles.storyBars}>
        {stories.map((_, i) => (
          <span key={i}>
            <i className={i < story ? styles.barDone : i === story ? styles.barNow : undefined} key={`${story}-${i}`} />
          </span>
        ))}
      </span>
      <span className={styles.storyWho}>
        <span className={styles.storyFace} style={{ background: current.color }}>
          {current.who[0]}
        </span>
        {current.who} <small>· {2 + story * 3} sa</small>
      </span>
      <span className={styles.storyText}>{current.text}</span>
      <button
        className={styles.storyClose}
        aria-label="Kapat"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(null);
        }}
      >
        ✕
      </button>
    </div>
  );
}

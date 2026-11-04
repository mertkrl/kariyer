import { PhotoArt } from '../PhotoArt';
import { Icon } from './SocialIcon';
import { ME, type Note, type Post } from './socialTypes';
import styles from '../SocialApp.module.css';
import own from './SocialTabs.module.css';
import { avatarStyle } from '../../../ui/avatarStyle';

/*
 * Kariyergram'ın Keşfet, Bildirimler ve Profil sekmeleri. Yalnızca gösterirler; durum
 * SocialApp'te yaşar.
 */

const TAGS = ['tümü', 'istanbul', 'İKhayatı', 'plazahayatı', 'mesaibitti', 'işarıyorum'];

interface ExploreTabProps {
  posts: Post[];
  filter: string;
  onFilter: (tag: string) => void;
  onOpen: (id: number) => void;
}

export function ExploreTab({ posts, filter, onFilter, onOpen }: ExploreTabProps) {
  const shown = filter === 'tümü' ? posts : posts.filter((p) => p.tags.includes(filter));
  return (
    <>
      <div className={styles.searchBar}>
        <Icon name="search" /> Ara
      </div>
      <div className={own.tagRow}>
        {TAGS.map((t) => (
          <button key={t} className={`${own.tag} ${filter === t ? own.tagOn : ''}`} onClick={() => onFilter(t)} aria-pressed={filter === t}>
            {t === 'tümü' ? 'Tümü' : `#${t}`}
          </button>
        ))}
      </div>
      <div className={own.grid}>
        {shown.map((p, i) =>
          p.photo ? (
            <button key={p.id} className={`${own.tile} ${i % 7 === 0 ? own.tileBig : ''}`} onClick={() => onOpen(p.id)}>
              <PhotoArt kind={p.photo} className={styles.photoArt} />
              <span className={own.tileLikes}>♥ {p.likes}</span>
            </button>
          ) : null,
        )}
        {shown.length === 0 && <div className={styles.empty}>Bu etikette gönderi yok.</div>}
      </div>
    </>
  );
}

export function ActivityTab({ notes }: { notes: Note[] }) {
  return (
    <div className={own.activity}>
      <h3>Bildirimler</h3>
      {notes.map((n) => (
        <div key={n.id} className={`${own.noteRow} ${n.unread ? own.noteNew : ''}`}>
          <span className={styles.avatar} style={avatarStyle(n.color)}>
            {n.who.slice(0, 2).toUpperCase()}
          </span>
          <span className={own.noteText}>
            <b>{n.who}</b> {n.text}
          </span>
          {n.photo ? (
            <span className={own.noteThumb}>
              <PhotoArt kind={n.photo} className={styles.photoArt} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface ProfileTabProps {
  savedPosts: Post[];
  followers: number;
  followingCount: number;
  onOpen: (id: number) => void;
}

export function ProfileTab({ savedPosts, followers, followingCount, onOpen }: ProfileTabProps) {
  return (
    <div className={own.profile}>
      <div className={own.profileTop}>
        <span className={`${styles.avatar} ${own.avatarBig}`} style={avatarStyle(ME.color)}>
          {ME.initials}
        </span>
        <div className={own.stats}>
          <span>
            <b className="mono">{savedPosts.length}</b>kaydedilen
          </span>
          <span>
            <b className="mono" key={followers}>
              {followers}
            </b>
            takipçi
          </span>
          <span>
            <b className="mono">{186 + followingCount}</b>takip
          </span>
        </div>
      </div>
      <div className={own.bio}>
        <strong>Sen</strong>
        <span>İnsan Kaynakları Uzmanı @ Tavrinsa Labs</span>
        <span>CV'leri gerçekten okuyan son insan 📄👀</span>
      </div>
      <div className={own.bioChips}>
        <span>📍 Ataşehir</span>
        <span>☕ çaycı</span>
        <span>🤝 İK</span>
      </div>
      <div className={own.profileTabs}>
        <span className={own.profileTabOn}>🔖 Kaydedilenler</span>
      </div>
      {savedPosts.length === 0 ? (
        <div className={styles.emptyProfile}>
          <Icon name="bookmark" />
          <strong>Henüz kaydettiğin gönderi yok</strong>
          <span>Beğendiğin gönderilerdeki 🔖 simgesine dokun.</span>
        </div>
      ) : (
        <div className={own.grid}>
          {savedPosts.map((p) =>
            p.photo ? (
              <button key={p.id} className={own.tile} onClick={() => onOpen(p.id)}>
                <PhotoArt kind={p.photo} className={styles.photoArt} />
                <span className={own.tileLikes}>♥ {p.likes}</span>
              </button>
            ) : (
              <button key={p.id} className={`${own.tile} ${own.tileText}`} style={{ background: p.author.color }} onClick={() => onOpen(p.id)}>
                {p.text.slice(0, 60)}…
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

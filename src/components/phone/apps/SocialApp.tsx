import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import { ART_KINDS, type ArtKind } from './artKinds';
import { PhotoArt } from './PhotoArt';
import { DmInbox } from './DmInbox';
import type { DmCandidate } from './candidateDms';
import type { DmKind } from '../../../game/store';
import { AYSE, EMRE, REJECTION_POSTS, SELIN, SOCIAL_DAYS, type Author, type PostSeed } from './socialContent';
import styles from './SocialApp.module.css';

/*
 * Kariyergram — a small, fully interactive social network: a feed with photo posts, stories,
 * a live poll, double-tap likes, comment sheets, saves; an explore grid with hashtag filters;
 * notifications that react to what you do; and a profile with the posts you saved. Candidates you rejected post about it here.
 */

export type SocialAuthor = Author;

interface Comment {
  author: string;
  text: string;
  mine?: boolean;
}

interface Poll {
  question: string;
  options: { label: string; votes: number }[];
}

interface Post {
  id: number;
  author: SocialAuthor;
  handle: string;
  text: string;
  photo?: ArtKind;
  likes: number;
  time: string;
  comments: Comment[];
  tags: string[];
  poll?: Poll;
  candidate?: boolean;
  mine?: boolean;
  sponsored?: boolean;
  place?: string;
}

interface Note {
  id: number;
  who: string;
  color: string;
  text: string;
  photo?: ArtKind;
  unread: boolean;
}

type Tab = 'feed' | 'explore' | 'activity' | 'profile';

const ME: SocialAuthor = { name: 'Sen', initials: 'SN', color: '#c9a227' };

let seq = 1000;
const P = (p: Omit<Post, 'id' | 'comments'> & { comments?: Comment[] }): Post => ({ comments: [], ...p, id: seq++ });

const seedToPost = (p: PostSeed): Post => P({ ...p, comments: p.comments ?? [] });

const EXPLORE_EXTRA: Post[] = ART_KINDS.flatMap((kind, i) => [
  P({ author: [AYSE, EMRE, SELIN][i % 3], handle: ['aysedemir', 'emre.yildiz', 'selinaksoy'][i % 3], photo: kind, text: ['Günün karesi ✨', 'İstanbul her hâliyle 💛', 'Bugünden kalan'][i % 3], likes: 60 + i * 37, time: `${i + 1} g`, tags: [['istanbul'], ['plazahayatı'], ['mesaibitti']][i % 3] }),
]);

const TAGS = ['tümü', 'istanbul', 'İKhayatı', 'plazahayatı', 'mesaibitti', 'işarıyorum'];

const COMMENT_CHOICES = ['Çok haklısın 👏', 'Geçmiş olsun 🙏', 'Hahaha 😂', 'Pes etme 💪', 'Harika kare 😍'];
const REPLY_BACK = ['Teşekkürler 🙏', 'Aynen öyle 😄', '❤️', 'Sağ ol, moral oldu!'];

interface SocialProps {
  rejected: SocialAuthor[];
  /** Strong people you turned away earlier in the week, now posting their new job. */
  echoes?: (SocialAuthor & { id: string; text: string })[];
  dayIndex?: number;
  /** Rejected candidates who have written to you by now. */
  dms?: DmCandidate[];
  dmHandled?: Record<string, DmKind>;
  onDm?: (id: string, kind: DmKind) => void;
  minutes?: number;
}

export function SocialApp({ rejected, echoes = [], dayIndex = 0, dms = [], dmHandled = {}, onDm, minutes = 0 }: SocialProps) {
  const [dmOpen, setDmOpen] = useState(false);
  const dmRequests = dms.filter((d) => !dmHandled[d.id]).length;
  const content = SOCIAL_DAYS[Math.min(dayIndex, SOCIAL_DAYS.length - 1)];
  const STORIES = content.stories;
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>(() => {
    const feed = content.feed.map(seedToPost);
    const cands = rejected.map((author, i) =>
      P({
        author,
        handle: author.name.toLowerCase().split(' ')[0].replace(/[^a-zçğıöşü]/g, '') + (i + 7),
        text: REJECTION_POSTS[i % REJECTION_POSTS.length],
        likes: 3 + ((i * 7) % 20),
        time: `${4 + i * 3} dk`,
        tags: ['işarıyorum'],
        candidate: true,
      }),
    );
    // Interleave rejected candidates into the feed.
    const out: Post[] = [];
    feed.forEach((p, i) => {
      out.push(p);
      if (cands[i]) out.push(cands[i]);
    });
    const found = echoes.map((e, i) =>
      P({
        author: { name: e.name, initials: e.initials, color: e.color },
        handle: e.name.toLowerCase().split(' ')[0].replace(/[^a-zçğıöşü]/g, '') + '.dev',
        text: e.text,
        likes: 140 + i * 57,
        time: `${2 + i} sa`,
        tags: ['yeniiş', 'yazılım'],
        candidate: true,
      }),
    );
    return [...found, ...out, ...cands.slice(feed.length)];
  });
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [burst, setBurst] = useState<number | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState<Record<number, number>>({});
  const [sheet, setSheet] = useState<number | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [story, setStory] = useState<number | null>(null);
  const [seenStories, setSeenStories] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Note[]>(() => content.notes.map((n, i) => ({ ...n, id: i + 1, unread: true })));
  const [toast, setToast] = useState<string | null>(null);
  const [followers, setFollowers] = useState(248);
  const [refreshing, setRefreshing] = useState(false);
  const [moreLoaded, setMoreLoaded] = useState(false);
  const [filter, setFilter] = useState('tümü');
  const scrollRef = useRef<HTMLDivElement>(null);
  const noteSeq = useRef(10);

  const unreadNotes = notes.filter((n) => n.unread).length;

  function notify(n: Omit<Note, 'id' | 'unread'>) {
    setNotes((ns) => [{ ...n, id: noteSeq.current++, unread: true }, ...ns].slice(0, 20));
  }

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 1800);
  }

  // Story auto-advance
  useEffect(() => {
    if (story === null) return;
    const id = window.setTimeout(() => openStory(story < STORIES.length - 1 ? story + 1 : null), 3200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, STORIES.length]);

  function openStory(i: number | null) {
    setStory(i);
    if (i !== null) setSeenStories((s) => new Set(s).add(i));
  }

  function like(id: number, fromDoubleTap = false) {
    if (fromDoubleTap || !liked.has(id)) {
      setBurst(id);
      window.setTimeout(() => setBurst((b) => (b === id ? null : b)), 700);
    }
    setLiked((l) => {
      const n = new Set(l);
      if (n.has(id) && !fromDoubleTap) n.delete(id);
      else n.add(id);
      return n;
    });
    audioEngine.playUi('select', 2);
  }

  function toggleSave(id: number) {
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else {
        n.add(id);
        flash('Kaydedilenlere eklendi');
      }
      return n;
    });
    audioEngine.playUi('click');
  }

  function follow(post: Post) {
    const h = post.handle;
    const on = !following.has(h);
    setFollowing((f) => {
      const n = new Set(f);
      if (on) n.add(h);
      else n.delete(h);
      return n;
    });
    audioEngine.playUi(on ? 'confirm' : 'click');
    if (on && post.candidate) {
      window.setTimeout(() => {
        notify({ who: h, color: post.author.color, text: 'seni geri takip etti. "Fark ettiğiniz için teşekkürler 🙏"' });
        setFollowers((f) => f + 1);
      }, 1800);
    }
  }

  function vote(postId: number, option: number) {
    if (voted[postId] !== undefined) return;
    setVoted((v) => ({ ...v, [postId]: option }));
    setPosts((ps) =>
      ps.map((p) =>
        p.id === postId && p.poll ? { ...p, poll: { ...p.poll, options: p.poll.options.map((o, i) => (i === option ? { ...o, votes: o.votes + 1 } : o)) } } : p,
      ),
    );
    audioEngine.playUi('select', 1);
  }

  function comment(postId: number, text: string) {
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, { author: 'sen', text, mine: true }] } : p)));
    audioEngine.playUi('click');
    const post = posts.find((p) => p.id === postId);
    if (post && !post.mine && !post.sponsored) {
      window.setTimeout(() => {
        const reply = REPLY_BACK[Math.floor(Math.random() * REPLY_BACK.length)];
        setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, { author: p.handle, text: `@sen ${reply}` }] } : p)));
        notify({ who: post.handle, color: post.author.color, text: `yorumuna yanıt verdi: ${reply}`, photo: post.photo });
      }, 1600);
    }
  }

  function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    audioEngine.playUi('select', 1);
    window.setTimeout(() => {
      setRefreshing(false);
      if (!moreLoaded) {
        setMoreLoaded(true);
        setPosts((ps) => [...content.more.map(seedToPost), ...ps]);
      } else flash('Yeni gönderi yok');
    }, 900);
  }

  function goTab(t: Tab) {
    setTab(t);
    setDetail(null);
    if (t === 'activity') window.setTimeout(() => setNotes((ns) => ns.map((n) => ({ ...n, unread: false }))), 1200);
    scrollRef.current?.scrollTo({ top: 0 });
    audioEngine.playUi('click');
  }

  function renderPost(p: Post) {
    const isLiked = liked.has(p.id);
    const total = p.poll ? p.poll.options.reduce((s, o) => s + o.votes, 0) : 0;
    const my = voted[p.id];
    return (
      <article key={p.id} className={`${styles.post} ${p.mine ? styles.postMine : ''}`}>
        <header className={styles.postHead}>
          <span className={`${styles.avatar} ${p.candidate ? styles.avatarPlain : ''}`} style={{ background: p.author.color }}>
            {p.author.initials}
          </span>
          <span className={styles.postMeta}>
            <strong>
              {p.handle}
              {p.author === AYSE || p.sponsored ? <span className={styles.verified}>✓</span> : null}
            </strong>
            <span>{p.sponsored ? 'Sponsorlu' : p.candidate ? 'İş arıyor · açık pozisyonlara başvuruyor' : (p.place ?? p.time)}</span>
          </span>
          {!p.mine && !p.sponsored && p.author !== ME && (
            <button className={`${styles.followBtn} ${following.has(p.handle) ? styles.following : ''}`} onClick={() => follow(p)}>
              {following.has(p.handle) ? 'Takiptesin' : 'Takip et'}
            </button>
          )}
        </header>

        {p.photo && (
          <div className={styles.photo} onDoubleClick={() => like(p.id, true)}>
            <PhotoArt kind={p.photo} className={styles.photoArt} />
            {burst === p.id && (
              <svg viewBox="0 0 24 24" className={styles.heartBurst}>
                <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z" />
              </svg>
            )}
            {p.sponsored && <span className={styles.adCta}>Demo talep et ›</span>}
          </div>
        )}

        {!p.photo && !p.poll && (
          <div className={styles.textCard} onDoubleClick={() => like(p.id, true)} style={{ background: `linear-gradient(145deg, ${p.author.color}, #2a2622)` }}>
            {p.text}
            {burst === p.id && (
              <svg viewBox="0 0 24 24" className={styles.heartBurst}>
                <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z" />
              </svg>
            )}
          </div>
        )}

        {p.poll && (
          <div className={styles.poll}>
            <strong>{p.poll.question}</strong>
            {p.poll.options.map((o, i) => {
              const pct = Math.round((o.votes / total) * 100);
              return (
                <button key={o.label} className={`${styles.pollOption} ${my === i ? styles.pollMine : ''}`} onClick={() => vote(p.id, i)} disabled={my !== undefined}>
                  {my !== undefined && <i style={{ width: `${pct}%` }} />}
                  <span>{o.label}</span>
                  {my !== undefined && <b className="mono">%{pct}</b>}
                </button>
              );
            })}
            <small>{total.toLocaleString('tr-TR')} oy {my === undefined ? '· oy vermek için dokun' : '· oyun kaydedildi'}</small>
          </div>
        )}

        <div className={styles.actions}>
          <button className={`${styles.action} ${isLiked ? styles.liked : ''}`} onClick={() => like(p.id)} aria-label="Beğen">
            <Icon name={isLiked ? 'heartFill' : 'heart'} />
          </button>
          <button className={styles.action} onClick={() => setSheet(p.id)} aria-label="Yorum">
            <Icon name="comment" />
          </button>
          <button className={styles.action} onClick={() => flash('Bağlantı kopyalandı')} aria-label="Gönder">
            <Icon name="send" />
          </button>
          <span className={styles.spacer} />
          <button className={`${styles.action} ${saved.has(p.id) ? styles.savedOn : ''}`} onClick={() => toggleSave(p.id)} aria-label="Kaydet">
            <Icon name={saved.has(p.id) ? 'bookmarkFill' : 'bookmark'} />
          </button>
        </div>
        <div className={styles.likes}>
          <b className="mono" key={p.likes + (isLiked ? 1 : 0)}>
            {(p.likes + (isLiked ? 1 : 0)).toLocaleString('tr-TR')}
          </b>{' '}
          beğenme
        </div>
        {(p.photo || p.poll) && (
          <p className={styles.caption}>
            <b>{p.handle}</b> {p.text}
          </p>
        )}
        {p.comments.length > 0 && (
          <button className={styles.viewComments} onClick={() => setSheet(p.id)}>
            {p.comments.length} yorumun tümünü gör
          </button>
        )}
        <span className={styles.time}>{p.sponsored ? '' : p.time}</span>
      </article>
    );
  }

  const exploreSource = [...posts.filter((p) => p.photo), ...EXPLORE_EXTRA];
  const explore = filter === 'tümü' ? exploreSource : exploreSource.filter((p) => p.tags.includes(filter));
  const savedPosts = [...posts, ...EXPLORE_EXTRA].filter((p) => saved.has(p.id));
  const detailPost = detail !== null ? [...posts, ...EXPLORE_EXTRA].find((p) => p.id === detail) : undefined;
  const sheetPost = sheet !== null ? [...posts, ...EXPLORE_EXTRA].find((p) => p.id === sheet) : undefined;

  let body;
  if (detailPost) {
    body = (
      <>
        <button className={styles.backRow} onClick={() => setDetail(null)}>
          ‹ Keşfet
        </button>
        {renderPost(detailPost)}
      </>
    );
  } else if (tab === 'feed') {
    body = (
      <>
        {refreshing && <div className={styles.spinner} />}
        <div className={styles.stories}>
          {STORIES.map((st, i) => (
            <button key={st.who} className={styles.story} onClick={() => openStory(i)}>
              <span className={`${styles.storyRing} ${seenStories.has(i) ? styles.storySeen : ''}`}>
                <span className={styles.storyFace} style={{ background: st.color }}>
                  {st.who[0]}
                </span>
              </span>
              {st.who}
            </button>
          ))}
        </div>
        {posts.map(renderPost)}
        <div className={styles.endNote}>Hepsini gördün ✓ Yeni gönderiler için ↻</div>
      </>
    );
  } else if (tab === 'explore') {
    body = (
      <>
        <div className={styles.searchBar}>
          <Icon name="search" /> Ara
        </div>
        <div className={styles.tagRow}>
          {TAGS.map((t) => (
            <button key={t} className={`${styles.tag} ${filter === t ? styles.tagOn : ''}`} onClick={() => setFilter(t)}>
              {t === 'tümü' ? 'Tümü' : `#${t}`}
            </button>
          ))}
        </div>
        <div className={styles.grid}>
          {explore.map((p, i) => (
            <button key={p.id} className={`${styles.tile} ${i % 7 === 0 ? styles.tileBig : ''}`} onClick={() => setDetail(p.id)}>
              <PhotoArt kind={p.photo!} className={styles.photoArt} />
              <span className={styles.tileLikes}>♥ {p.likes}</span>
            </button>
          ))}
          {explore.length === 0 && <div className={styles.empty}>Bu etikette gönderi yok.</div>}
        </div>
      </>
    );
  } else if (tab === 'activity') {
    body = (
      <div className={styles.activity}>
        <h3>Bildirimler</h3>
        {notes.map((n) => (
          <div key={n.id} className={`${styles.noteRow} ${n.unread ? styles.noteNew : ''}`}>
            <span className={styles.avatar} style={{ background: n.color }}>
              {n.who.slice(0, 2).toUpperCase()}
            </span>
            <span className={styles.noteText}>
              <b>{n.who}</b> {n.text}
            </span>
            {n.photo ? (
              <span className={styles.noteThumb}>
                <PhotoArt kind={n.photo} className={styles.photoArt} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  } else {
    body = (
      <div className={styles.profile}>
        <div className={styles.profileTop}>
          <span className={`${styles.avatar} ${styles.avatarBig}`} style={{ background: ME.color }}>
            {ME.initials}
          </span>
          <div className={styles.stats}>
            <span>
              <b className="mono">{saved.size}</b>kaydedilen
            </span>
            <span>
              <b className="mono" key={followers}>
                {followers}
              </b>
              takipçi
            </span>
            <span>
              <b className="mono">{186 + following.size}</b>takip
            </span>
          </div>
        </div>
        <div className={styles.bio}>
          <strong>Sen</strong>
          <span>İnsan Kaynakları Uzmanı @ Tavrinsa Labs</span>
          <span>CV'leri gerçekten okuyan son insan 📄👀</span>
        </div>
        <div className={styles.bioChips}>
          <span>📍 Levent</span>
          <span>☕ çaycı</span>
          <span>🤝 İK</span>
        </div>
        <div className={styles.profileTabs}>
          <span className={styles.profileTabOn}>🔖 Kaydedilenler</span>
        </div>
        {savedPosts.length === 0 ? (
          <div className={styles.emptyProfile}>
            <Icon name="bookmark" />
            <strong>Henüz kaydettiğin gönderi yok</strong>
            <span>Beğendiğin gönderilerdeki 🔖 simgesine dokun.</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {savedPosts.map((p) =>
              p.photo ? (
                <button key={p.id} className={styles.tile} onClick={() => setDetail(p.id)}>
                  <PhotoArt kind={p.photo} className={styles.photoArt} />
                  <span className={styles.tileLikes}>♥ {p.likes}</span>
                </button>
              ) : (
                <button key={p.id} className={`${styles.tile} ${styles.tileText}`} style={{ background: p.author.color }} onClick={() => setDetail(p.id)}>
                  {p.text.slice(0, 60)}…
                </button>
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <div className={styles.top}>
        <strong className={styles.logo}>Kariyergram</strong>
        <span className={styles.topActions}>
          <button className={styles.topBtn} onClick={refresh} aria-label="Yenile">
            <span className={refreshing ? styles.spin : undefined}>↻</span>
          </button>
          <button
            className={styles.topBtn}
            onClick={() => {
              setDmOpen(true);
              audioEngine.playUi('click');
            }}
            aria-label={`Mesajlar${dmRequests ? `, ${dmRequests} mesaj isteği` : ''}`}
          >
            <Icon name="send" />
            {dmRequests > 0 && <span className={styles.dmBadge}>{dmRequests}</span>}
          </button>
        </span>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        {body}
      </div>

      <nav className={styles.tabs}>
        {(
          [
            ['feed', 'home'],
            ['explore', 'search'],
            ['activity', 'heart'],
            ['profile', 'user'],
          ] as const
        ).map(([t, icon]) => (
          <button key={t} className={`${styles.tabBtn} ${tab === t && detail === null ? styles.tabOn : ''}`} onClick={() => goTab(t)} aria-label={t}>
            <Icon name={icon} />
            {t === 'activity' && unreadNotes > 0 && <span className={styles.tabBadge}>{unreadNotes}</span>}
          </button>
        ))}
      </nav>

      {sheetPost && (
        <div className={styles.sheetScrim} onClick={() => setSheet(null)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <span className={styles.grabber} />
            <strong className={styles.sheetTitle}>Yorumlar</strong>
            <div className={styles.sheetList}>
              {sheetPost.comments.length === 0 && <div className={styles.empty}>İlk yorumu sen yap.</div>}
              {sheetPost.comments.map((c, i) => (
                <div key={i} className={`${styles.commentRow} ${c.mine ? styles.commentMine : ''}`}>
                  <b>{c.author}</b> {c.text}
                </div>
              ))}
            </div>
            <div className={styles.sheetChips}>
              {COMMENT_CHOICES.map((c) => (
                <button key={c} onClick={() => comment(sheetPost.id, c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {story !== null && (
        <div
          className={styles.storyViewer}
          role="button"
          tabIndex={0}
          aria-label="Hikâye: sağa dokun sonraki, sola dokun önceki"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const back = e.clientX - r.left < r.width / 3;
            if (back) openStory(Math.max(0, story - 1));
            else openStory(story < STORIES.length - 1 ? story + 1 : null);
            audioEngine.playUi('click');
          }}
        >
          <PhotoArt kind={STORIES[story].photo} className={styles.storyArt} />
          <span className={styles.storyShade} />
          <span className={styles.storyBars}>
            {STORIES.map((_, i) => (
              <span key={i}>
                <i className={i < story ? styles.barDone : i === story ? styles.barNow : undefined} key={`${story}-${i}`} />
              </span>
            ))}
          </span>
          <span className={styles.storyWho}>
            <span className={styles.storyFace} style={{ background: STORIES[story].color }}>
              {STORIES[story].who[0]}
            </span>
            {STORIES[story].who} <small>· {2 + story * 3} sa</small>
          </span>
          <span className={styles.storyText}>{STORIES[story].text}</span>
          <button
            className={styles.storyClose}
            aria-label="Kapat"
            onClick={(e) => {
              e.stopPropagation();
              setStory(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
      {dmOpen && <DmInbox dms={dms} minutes={minutes} handled={dmHandled} onAnswer={(id, k) => onDm?.(id, k)} onClose={() => setDmOpen(false)} />}
    </div>
  );
}

type IconName = 'home' | 'search' | 'heart' | 'heartFill' | 'user' | 'comment' | 'send' | 'bookmark' | 'bookmarkFill';

function Icon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden>
      {name === 'home' && <path {...common} d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />}
      {name === 'search' && (
        <g {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m20 20-4.8-4.8" />
        </g>
      )}
      {(name === 'heart' || name === 'heartFill') && (
        <path
          {...common}
          fill={name === 'heartFill' ? 'currentColor' : 'none'}
          d="M12 20.5s-7.5-4.6-9.2-9.1C1.5 7.8 3.8 4.5 7.1 4.5c2 0 3.4 1.1 4.9 2.9 1.5-1.8 2.9-2.9 4.9-2.9 3.3 0 5.6 3.3 4.3 6.9-1.7 4.5-9.2 9.1-9.2 9.1z"
        />
      )}
      {name === 'user' && (
        <g {...common}>
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
        </g>
      )}
      {name === 'comment' && <path {...common} d="M20.5 11.5a8.5 8 0 0 1-12.3 7.2L3.5 20l1.4-4.2A8 8 0 1 1 20.5 11.5z" />}
      {name === 'send' && <path {...common} d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />}
      {(name === 'bookmark' || name === 'bookmarkFill') && (
        <path {...common} fill={name === 'bookmarkFill' ? 'currentColor' : 'none'} d="M6 3.5h12v17l-6-4.5-6 4.5z" />
      )}
    </svg>
  );
}

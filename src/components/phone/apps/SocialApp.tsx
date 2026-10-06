import { useRef, useState } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import { DmInbox } from './DmInbox';
import type { DmCandidate } from './candidateDms';
import type { DmKind } from '../../../game/store';
import { SOCIAL_DAYS } from './socialContent';
import { Icon } from './social/SocialIcon';
import { SocialPost } from './social/SocialPost';
import { StoryViewer } from './social/StoryViewer';
import { CommentSheet } from './social/CommentSheet';
import { ActivityTab, ExploreTab, ProfileTab } from './social/SocialTabs';
import { EXPLORE_EXTRA, buildFeed, seedToPost, toggled, type Echo } from './social/socialFeed';
import type { Note, Post, SocialAuthor, Tab } from './social/socialTypes';
import styles from './SocialApp.module.css';

/*
 * Kariyergram: küçük ama tamamen etkileşimli bir sosyal ağ. Fotoğraflı gönderiler, hikâyeler,
 * canlı bir anket, çift dokunuşla beğeni, yorum sayfaları ve kaydetme olan bir akış; etiket
 * filtreli bir keşfet ızgarası; yaptıklarına tepki veren bildirimler; kaydettiğin gönderilerin
 * olduğu bir profil. Reddettiğin adaylar burada bunun hakkında paylaşım yapar.
 *
 * Bu dosya durumu ve eylemleri tutar; çizdiği parçalar ./social/ klasöründe yaşar.
 */

export type { SocialAuthor };

const REPLY_BACK = ['Teşekkürler 🙏', 'Aynen öyle 😄', '❤️', 'Sağ ol, moral oldu!'];

interface SocialProps {
  rejected: SocialAuthor[];
  /** Haftanın başında geri çevirdiğin güçlü insanlar, şimdi yeni işlerini paylaşıyor. */
  echoes?: Echo[];
  dayIndex?: number;
  /** Şimdiye kadar sana yazmış reddedilen adaylar. */
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
  const [posts, setPosts] = useState<Post[]>(() => buildFeed(content, rejected, echoes));
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

  function openStory(i: number | null) {
    setStory(i);
    if (i !== null) setSeenStories((s) => new Set(s).add(i));
  }

  function like(id: number, fromDoubleTap = false) {
    if (fromDoubleTap || !liked.has(id)) {
      setBurst(id);
      window.setTimeout(() => setBurst((b) => (b === id ? null : b)), 700);
    }
    setLiked((l) => toggled(l, id, fromDoubleTap || !l.has(id)));
    audioEngine.playUi('select', 2);
  }

  function toggleSave(id: number) {
    if (!saved.has(id)) flash('Kaydedilenlere eklendi');
    setSaved((s) => toggled(s, id));
    audioEngine.playUi('click');
  }

  function follow(post: Post) {
    const h = post.handle;
    const on = !following.has(h);
    setFollowing((f) => toggled(f, h, on));
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

  const renderPost = (p: Post) => (
    <SocialPost
      key={p.id}
      post={p}
      liked={liked.has(p.id)}
      saved={saved.has(p.id)}
      following={following.has(p.handle)}
      burst={burst === p.id}
      myVote={voted[p.id]}
      onLike={(fromDoubleTap) => like(p.id, fromDoubleTap)}
      onSave={() => toggleSave(p.id)}
      onFollow={() => follow(p)}
      onVote={(i) => vote(p.id, i)}
      onComments={() => setSheet(p.id)}
      onShare={() => flash('Bağlantı kopyalandı')}
    />
  );

  const everything = [...posts, ...EXPLORE_EXTRA];
  const savedPosts = everything.filter((p) => saved.has(p.id));
  const detailPost = detail !== null ? everything.find((p) => p.id === detail) : undefined;
  const sheetPost = sheet !== null ? everything.find((p) => p.id === sheet) : undefined;

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
    body = <ExploreTab posts={[...posts.filter((p) => p.photo), ...EXPLORE_EXTRA]} filter={filter} onFilter={setFilter} onOpen={setDetail} />;
  } else if (tab === 'activity') {
    body = <ActivityTab notes={notes} />;
  } else {
    body = <ProfileTab savedPosts={savedPosts} followers={followers} followingCount={following.size} onOpen={setDetail} />;
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

      {sheetPost && <CommentSheet post={sheetPost} onComment={(text) => comment(sheetPost.id, text)} onClose={() => setSheet(null)} />}
      {story !== null && <StoryViewer stories={STORIES} index={story} onOpen={openStory} />}
      {toast && <div className={styles.toast}>{toast}</div>}
      {dmOpen && <DmInbox dms={dms} minutes={minutes} handled={dmHandled} onAnswer={(id, k) => onDm?.(id, k)} onClose={() => setDmOpen(false)} />}
    </div>
  );
}

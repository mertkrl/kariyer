import { ART_KINDS } from '../artKinds';
import { AYSE, EMRE, REJECTION_POSTS, SELIN, type DayContent, type PostSeed } from '../socialContent';
import type { Comment, Post, SocialAuthor } from './socialTypes';

/** Builds Kariyergram's posts from the day's content and the people you turned away. Pure. */

let seq = 1000;
const P = (p: Omit<Post, 'id' | 'comments'> & { comments?: Comment[] }): Post => ({ comments: [], ...p, id: seq++ });

export const seedToPost = (p: PostSeed): Post => P({ ...p, comments: p.comments ?? [] });

export const EXPLORE_EXTRA: Post[] = ART_KINDS.map((kind, i) =>
  P({
    author: [AYSE, EMRE, SELIN][i % 3],
    handle: ['aysedemir', 'emre.yildiz', 'selinaksoy'][i % 3],
    photo: kind,
    text: ['Günün karesi ✨', 'İstanbul her hâliyle 💛', 'Bugünden kalan'][i % 3],
    likes: 60 + i * 37,
    time: `${i + 1} g`,
    tags: [['istanbul'], ['plazahayatı'], ['mesaibitti']][i % 3],
  }),
);

/** A handle from a display name: the first name, lower-cased, Turkish letters kept. */
export const handleOf = (name: string) =>
  name
    .toLowerCase()
    .split(' ')[0]
    .replace(/[^a-zçğıöşü]/g, '');

export type Echo = SocialAuthor & { id: string; text: string };

export function buildFeed(content: DayContent, rejected: SocialAuthor[], echoes: Echo[]): Post[] {
  const feed = content.feed.map(seedToPost);
  const cands = rejected.map((author, i) =>
    P({
      author,
      handle: handleOf(author.name) + (i + 7),
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
      handle: handleOf(e.name) + '.dev',
      text: e.text,
      likes: 140 + i * 57,
      time: `${2 + i} sa`,
      tags: ['yeniiş', 'yazılım'],
      candidate: true,
    }),
  );
  return [...found, ...out, ...cands.slice(feed.length)];
}

/** Returns a copy of the set with id toggled. */
export function toggled<T>(set: Set<T>, id: T, on = !set.has(id)): Set<T> {
  const n = new Set(set);
  if (on) n.add(id);
  else n.delete(id);
  return n;
}

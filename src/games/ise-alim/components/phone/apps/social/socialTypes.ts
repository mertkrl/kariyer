import type { ArtKind } from '../artKinds';
import type { Author } from '../socialContent';

export type SocialAuthor = Author;

export interface Comment {
  author: string;
  text: string;
  mine?: boolean;
}

export interface Poll {
  question: string;
  options: { label: string; votes: number }[];
}

export interface Post {
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

export interface Note {
  id: number;
  who: string;
  color: string;
  text: string;
  photo?: ArtKind;
  unread: boolean;
}

export type Tab = 'feed' | 'explore' | 'activity' | 'profile';

export const ME: SocialAuthor = { name: 'Sen', initials: 'SN', color: '#c9a227' };

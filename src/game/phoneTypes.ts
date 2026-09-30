/*
 * The shapes of what arrives on the phones: messages, quick replies, the manager's requests
 * and the scripted lines that become them.
 */
import type { Decision } from './types';

/** Chats on the phone: the manager, your mother, and the office group. */
export type ThreadId = 'manager' | 'mom' | 'office' | 'zehra' | 'ayse' | 'birthday';

/** Group chats: they can be muted. */
export const GROUP_THREADS: ThreadId[] = ['office', 'birthday'];

export interface PhoneMessage {
  id: number;
  thread: ThreadId;
  /** Workday minute it arrived. */
  at: number;
  /** Day index it arrived on (the chats keep the whole week). */
  day?: number;
  from: 'them' | 'me';
  /** Group chats: who wrote it. */
  sender?: string;
  text: string;
  requestId?: string;
  /** Optional quick replies (mom / office). Answering is up to you. */
  replies?: QuickReply[];
  answered?: boolean;
  /** The moment passed: the chat moved on and a reply now would make no sense. */
  expired?: boolean;
}

export interface QuickReply {
  text: string;
  /** What comes back, and from whom (group chats). */
  reaction: string;
  reactionSender?: string;
  /** Some replies (to the manager) count as taking a side. */
  stance?: 'comply' | 'refuse';
  /** "Let him send his CV": the neighbour's son applies on Thursday. */
  neighbourCv?: boolean;
  /** What saying this does to you. */
  performans?: number;
  vicdan?: number;
  /** Some things can't be said in the group: the answer comes later, in private. */
  aside?: { thread: 'ayse' | 'zehra' | 'mom'; after: number; text: string };
  /** Saying yes puts something on today's calendar that costs time (the birthday cake). */
  event?: { at: number; minutes: number; text: string };
}

export interface ManagerRequest {
  id: string;
  candidateId: string;
  want: Decision;
  answer: 'comply' | 'refuse' | null;
  /** Which request template he used (for the phone call's wording). */
  template?: number;
}

/**
 * A message waiting to be sent. Its wording is chosen at delivery time, so it reflects how the
 * relationship with the manager has developed by then.
 */
export interface ScheduledMessage {
  at: number;
  kind: 'greeting' | 'lunch' | 'openFiles' | 'request' | 'ambient' | 'reprimand';
  dayIndex: number;
  grievances?: Grievance[];
  request?: Omit<ManagerRequest, 'answer' | 'template'> & { template: number };
  /** A request call he's making again because you didn't pick up the first time. */
  retry?: boolean;
  /** Ambient chatter (mom / office group). */
  ambient?: { thread: Exclude<ThreadId, 'manager'>; sender?: string; text: string; replies?: QuickReply[]; unlock?: boolean; closes?: boolean };
}

/**
 * How far the relationship has soured: 0 friendly · 1 cool · 2 cold/formal · 3 hostile.
 * Every refusal pushes it one step.
 */
export type ManagerTone = 0 | 1 | 2 | 3;

export interface RequestTemplate {
  ids: string[];
  want: Decision;
  text: (name: string) => string;
}

/** Life outside the inbox — messages that make the phone feel like someone's phone. */
/** `closes`: someone shuts the topic down; the thread's open replies go away with it. */
export type FollowUp = { after: number; sender: string; text: string; closes?: boolean };

/** A line in a chat. Group lines carry follow-ups: colleagues answering each other, some at once, some much later. */
export type Ambient = { at: number; thread: 'mom' | 'office' | 'zehra' | 'ayse' | 'birthday'; sender?: string; text: string; replies?: QuickReply[]; followUps?: FollowUp[] };

/** A request the manager made yesterday that wasn't carried out. */
export interface Grievance {
  name: string;
  want: Decision;
  /** You had answered "I'll do it". */
  promised: boolean;
}

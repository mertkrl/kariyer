/*
 * Telefonun ekranlarının paylaştığı tanımlar: kişiler, uygulamalar ve dok.
 */
import type { ThreadId } from '../../game/day/manager';

export type AppId = 'terfi' | 'social' | 'traffic';

export interface Contact {
  name: string;
  avatar: string;
  color: string;
}

export const CONTACTS: Record<ThreadId, Contact> = {
  manager: { name: 'Hakan Bey', avatar: 'HB', color: '#c9a227' },
  mom: { name: 'Annem ❤️', avatar: '👩', color: '#e8b4a8' },
  office: { name: 'Ofis Ekibi 🏢', avatar: '👥', color: '#7fa7c9' },
  ayse: { name: 'Ayşe', avatar: 'A', color: '#6f8fa3' },
  birthday: { name: 'Emre\'ye Sürpriz 🎂', avatar: '🎂', color: '#e0a458' },
};

/** Yalnızca biri içine yazınca görünen sohbetler. */
export const LATE_THREADS: ThreadId[] = ['ayse', 'birthday'];
export const sumUnread = (u: Record<ThreadId, number>) => Object.values(u).reduce((a, b) => a + b, 0);

export const APPS: { id: AppId | 'chats'; label: string }[] = [
  { id: 'chats', label: 'Mesajlar' },
  { id: 'terfi', label: 'Terfi' },
  { id: 'social', label: 'Kariyergram' },
  { id: 'traffic', label: 'Trafik' },
];

/** Ana ekranın altındaki dokta tutulan iki uygulama. */
export const DOCK: (AppId | 'chats')[] = ['chats', 'social'];

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyDirectMessage } from './notifications';

const COL = 'directMessages';

export type DirectMessage = {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  createdAt: Timestamp | null;
  threadId: string;
};

export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join('__');
}

export async function sendDirectMessage(params: {
  fromId: string;
  toId: string;
  text: string;
  fromDisplayName?: string;
}): Promise<void> {
  const text = params.text.trim();
  if (!text) return;
  const threadId = threadIdFor(params.fromId, params.toId);
  await addDoc(collection(db, COL), {
    fromId: params.fromId,
    toId: params.toId,
    text,
    threadId,
    createdAt: serverTimestamp(),
  });
  const name = params.fromDisplayName?.trim() || 'Alguém';
  await notifyDirectMessage({
    toId: params.toId,
    fromId: params.fromId,
    fromName: name,
    preview: text,
  }).catch((e) => console.error('notifyDirectMessage', e));
}

export function subscribeThread(
  threadId: string,
  onMessages: (m: DirectMessage[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COL), where('threadId', '==', threadId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: DirectMessage[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          fromId: x.fromId,
          toId: x.toId,
          text: x.text,
          createdAt: x.createdAt ?? null,
          threadId: x.threadId,
        };
      });
      onMessages(list);
    },
    (err) => onError?.(err as Error)
  );
}

import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  doc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getFollowerUserIds } from './follows';

const COL = 'notifications';

export type NotificationType = 'message' | 'review_post';

export type AppNotification = {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  postId: string | null;
  createdAt: Timestamp | null;
};

function mapDoc(id: string, x: Record<string, unknown>): AppNotification {
  return {
    id,
    userId: String(x.userId ?? ''),
    actorId: String(x.actorId ?? ''),
    type: (x.type === 'review_post' ? 'review_post' : 'message') as NotificationType,
    title: String(x.title ?? ''),
    body: String(x.body ?? ''),
    read: Boolean(x.read),
    postId: typeof x.postId === 'string' ? x.postId : null,
    createdAt: (x.createdAt as Timestamp) ?? null,
  };
}

export function subscribeMyNotifications(
  uid: string,
  onList: (list: AppNotification[]) => void,
  onError?: (e: Error) => void,
  pageSize = 80
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => onList(snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err as Error)
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: true });
}

/** Notifica o destinatário de uma nova mensagem direta. */
export async function notifyDirectMessage(params: {
  toId: string;
  fromId: string;
  fromName: string;
  preview: string;
}): Promise<void> {
  if (params.toId === params.fromId) return;
  const preview = params.preview.trim().slice(0, 160);
  await addDoc(collection(db, COL), {
    userId: params.toId,
    actorId: params.fromId,
    type: 'message',
    title: 'Nova mensagem',
    body: `${params.fromName}: ${preview}`,
    read: false,
    postId: null,
    createdAt: serverTimestamp(),
  });
}

/** Notifica seguidores quando o autor publica um post com filme (avaliação). */
export async function notifyFollowersReviewPost(params: {
  actorId: string;
  actorName: string;
  movieTitle: string;
  postId: string;
}): Promise<void> {
  const followerIds = await getFollowerUserIds(params.actorId);
  const title = 'Nova avaliação na rede';
  const body = `${params.actorName} avaliou «${params.movieTitle.slice(0, 120)}»`;
  const chunks: string[][] = [];
  for (let i = 0; i < followerIds.length; i += 400) {
    chunks.push(followerIds.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const ids = chunk.filter((id) => id !== params.actorId);
    if (ids.length === 0) continue;
    const batch = writeBatch(db);
    for (const userId of ids) {
      const ref = doc(collection(db, COL));
      batch.set(ref, {
        userId,
        actorId: params.actorId,
        type: 'review_post',
        title,
        body: body.slice(0, 500),
        read: false,
        postId: params.postId,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

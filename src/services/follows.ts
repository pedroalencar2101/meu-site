import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COL = 'follows';

export function followDocId(followerId: string, followingId: string): string {
  return `${followerId}_${followingId}`;
}

export type FollowDoc = {
  id: string;
  followerId: string;
  followingId: string;
};

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return;
  await setDoc(doc(db, COL, followDocId(followerId, followingId)), {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await deleteDoc(doc(db, COL, followDocId(followerId, followingId)));
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const s = await getDoc(doc(db, COL, followDocId(followerId, followingId)));
  return s.exists();
}

/** IDs dos utilizadores que `followerId` segue. */
export function subscribeFollowingIds(followerId: string, onIds: (ids: string[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, COL), where('followerId', '==', followerId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onIds(snap.docs.map((d) => (d.data() as { followingId: string }).followingId));
    },
    (err) => onError?.(err as Error)
  );
}

/** Quem segue `followingId` (seguidores dele). */
export function subscribeFollowersOf(
  followingId: string,
  onList: (rows: FollowDoc[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COL), where('followingId', '==', followingId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onList(
        snap.docs.map((d) => {
          const x = d.data() as { followerId: string; followingId: string };
          return { id: d.id, followerId: x.followerId, followingId: x.followingId };
        })
      );
    },
    (err) => onError?.(err as Error)
  );
}

/** Quem `followerId` segue. */
export function subscribeFollowingOf(
  followerId: string,
  onList: (rows: FollowDoc[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COL), where('followerId', '==', followerId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onList(
        snap.docs.map((d) => {
          const x = d.data() as { followerId: string; followingId: string };
          return { id: d.id, followerId: x.followerId, followingId: x.followingId };
        })
      );
    },
    (err) => onError?.(err as Error)
  );
}

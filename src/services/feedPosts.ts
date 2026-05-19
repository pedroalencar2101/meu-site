import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  startAfter,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirestoreComment, FirestorePost, MovieEmbed, ReactionType } from '../types/feed';
import { notifyFollowersReviewPost } from './notifications';

const POSTS = 'posts';
const IN_CHUNK = 30;

function mapPostData(id: string, x: DocumentData): FirestorePost {
  return {
    id,
    authorId: x.authorId as string,
    authorName: x.authorName as string,
    authorInitials: (x.authorInitials as string) ?? '',
    authorAvatar: (x.authorAvatar as string | null) ?? null,
    content: x.content as string,
    createdAt: x.createdAt ?? null,
    movie: (x.movie as FirestorePost['movie']) ?? null,
    likeCount: (x.likeCount as number) ?? 0,
    loveCount: (x.loveCount as number) ?? 0,
    smileCount: (x.smileCount as number) ?? 0,
    angryCount: (x.angryCount as number) ?? 0,
    commentCount: (x.commentCount as number) ?? 0,
  };
}

function postRef(id: string) {
  return doc(db, POSTS, id);
}

function reactionsCol(postId: string) {
  return collection(db, POSTS, postId, 'reactions');
}

function commentsCol(postId: string) {
  return collection(db, POSTS, postId, 'comments');
}

function commentReactionsCol(postId: string, commentId: string) {
  return collection(db, POSTS, postId, 'comments', commentId, 'reactions');
}

export function subscribeFeed(
  onPosts: (posts: FirestorePost[]) => void,
  onError?: (e: Error) => void,
  pageSize = 50
): Unsubscribe {
  const q = query(collection(db, POSTS), orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      const list: FirestorePost[] = snap.docs.map((d) => mapPostData(d.id, d.data()));
      onPosts(list);
    },
    (err) => onError?.(err as Error)
  );
}

/** Posts de um autor (perfil público). Requer índice composto authorId + createdAt. */
export function subscribePostsByAuthor(
  authorId: string,
  onPosts: (posts: FirestorePost[]) => void,
  onError?: (e: Error) => void,
  pageSize = 80
): Unsubscribe {
  const q = query(
    collection(db, POSTS),
    where('authorId', '==', authorId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => onPosts(snap.docs.map((d) => mapPostData(d.id, d.data()))),
    (err) => onError?.(err as Error)
  );
}

/**
 * Feed: apenas posts de `authorIds` (ex.: eu + quem sigo).
 * Usa várias queries `in` (máx. 30 por chunk) e agrega no cliente.
 */
export function subscribeFeedForAuthors(
  authorIds: string[],
  onPosts: (posts: FirestorePost[]) => void,
  onError?: (e: Error) => void,
  pageSize = 60
): Unsubscribe {
  const unique = [...new Set(authorIds.filter(Boolean))];
  if (unique.length === 0) {
    onPosts([]);
    return () => {};
  }

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    chunks.push(unique.slice(i, i + IN_CHUNK));
  }

  const chunkResults = new Map<number, FirestorePost[]>();

  const mergeAndEmit = () => {
    const merged: FirestorePost[] = [];
    chunkResults.forEach((arr) => merged.push(...arr));
    const byId = new Map<string, FirestorePost>();
    for (const p of merged) {
      byId.set(p.id, p);
    }
    const sorted = [...byId.values()].sort(
      (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
    );
    onPosts(sorted.slice(0, pageSize));
  };

  const unsubs = chunks.map((chunk, idx) => {
    const q = query(
      collection(db, POSTS),
      where('authorId', 'in', chunk),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    return onSnapshot(
      q,
      (snap) => {
        chunkResults.set(
          idx,
          snap.docs.map((d) => mapPostData(d.id, d.data()))
        );
        mergeAndEmit();
      },
      (err) => onError?.(err as Error)
    );
  });

  return () => {
    unsubs.forEach((u) => u());
  };
}

export async function fetchMyReactionsForPosts(
  postIds: string[],
  uid: string
): Promise<Map<string, ReactionType>> {
  const map = new Map<string, ReactionType>();
  const unique = [...new Set(postIds)];
  await Promise.all(
    unique.map(async (postId) => {
      const r = await getDoc(doc(reactionsCol(postId), uid));
      if (r.exists()) {
        const t = r.data()?.type as ReactionType | undefined;
        if (t === 'like' || t === 'love' || t === 'smile' || t === 'angry') map.set(postId, t);
      }
    })
  );
  return map;
}

export async function createPost(params: {
  uid: string;
  displayName: string;
  photoURL: string | null;
  content: string;
  movie?: MovieEmbed | null;
}): Promise<string> {
  const initials = initialsFromName(params.displayName);
  const ref = await addDoc(collection(db, POSTS), {
    authorId: params.uid,
    authorName: params.displayName,
    authorInitials: initials,
    authorAvatar: params.photoURL,
    content: params.content.trim(),
    movie: params.movie ?? null,
    likeCount: 0,
    loveCount: 0,
    smileCount: 0,
    angryCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  const postId = ref.id;
  if (params.movie) {
    void notifyFollowersReviewPost({
      actorId: params.uid,
      actorName: params.displayName,
      movieTitle: params.movie.title,
      postId,
    }).catch((e) => console.error('notifyFollowersReviewPost', e));
  }
  return postId;
}

export async function toggleReaction(postId: string, uid: string, type: ReactionType): Promise<void> {
  const pRef = postRef(postId);
  const rRef = doc(reactionsCol(postId), uid);

  await runTransaction(db, async (tx) => {
    const [pSnap, rSnap] = await Promise.all([tx.get(pRef), tx.get(rRef)]);
    if (!pSnap.exists()) throw new Error('Post não encontrado');

    const prev = rSnap.exists() ? (rSnap.data().type as ReactionType) : null;

    let next: ReactionType | 'remove' = type;

    const deltas: Record<string, number> = {
      like: 0,
      love: 0,
      smile: 0,
      angry: 0
    };

    if (prev === type) {
      next = 'remove';
      deltas[type] = -1;
    } else if (prev === null) {
      deltas[type] = 1;
    } else {
      deltas[prev] = -1;
      deltas[type] = 1;
    }

    if (next === 'remove') {
      tx.delete(rRef);
    } else {
      tx.set(rRef, { type: next, updatedAt: serverTimestamp() }, { merge: true });
    }

    const upd: Record<string, unknown> = {};
    if (deltas.like !== 0) upd.likeCount = increment(deltas.like);
    if (deltas.love !== 0) upd.loveCount = increment(deltas.love);
    if (deltas.smile !== 0) upd.smileCount = increment(deltas.smile);
    if (deltas.angry !== 0) upd.angryCount = increment(deltas.angry);
    if (Object.keys(upd).length) tx.update(pRef, upd);
  });
}

export function subscribeComments(
  postId: string,
  onComments: (c: FirestoreComment[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(commentsCol(postId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list: FirestoreComment[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          postId,
          authorId: x.authorId,
          authorName: x.authorName,
          authorInitials: x.authorInitials ?? '',
          authorAvatar: x.authorAvatar ?? null,
          text: x.text,
          parentId: x.parentId ?? null,
          createdAt: x.createdAt ?? null,
          likeCount: x.likeCount ?? 0,
          loveCount: x.loveCount ?? 0,
          smileCount: x.smileCount ?? 0,
          angryCount: x.angryCount ?? 0,
        };
      });
      onComments(list);
    },
    (err) => onError?.(err as Error)
  );
}

export async function addComment(params: {
  postId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  parentId?: string | null;
}): Promise<void> {
  const batch = writeBatch(db);
  const cRef = doc(collection(db, POSTS, params.postId, 'comments'));
  batch.set(cRef, {
    authorId: params.uid,
    authorName: params.displayName,
    authorInitials: initialsFromName(params.displayName),
    authorAvatar: params.photoURL,
    text: params.text.trim(),
    parentId: params.parentId ?? null,
    likeCount: 0,
    loveCount: 0,
    smileCount: 0,
    angryCount: 0,
    createdAt: serverTimestamp(),
  });
  batch.update(postRef(params.postId), { commentCount: increment(1) });
  await batch.commit();
}

export async function toggleCommentReaction(
  postId: string,
  commentId: string,
  uid: string,
  type: ReactionType
): Promise<void> {
  const cRef = doc(db, POSTS, postId, 'comments', commentId);
  const rRef = doc(commentReactionsCol(postId, commentId), uid);

  await runTransaction(db, async (tx) => {
    const [cSnap, rSnap] = await Promise.all([tx.get(cRef), tx.get(rRef)]);
    if (!cSnap.exists()) throw new Error('Comentário não encontrado');

    const prev = rSnap.exists() ? (rSnap.data().type as ReactionType) : null;

    let next: ReactionType | 'remove' = type;

    const deltas: Record<string, number> = {
      like: 0,
      love: 0,
      smile: 0,
      angry: 0
    };

    if (prev === type) {
      next = 'remove';
      deltas[type] = -1;
    } else if (prev === null) {
      deltas[type] = 1;
    } else {
      deltas[prev] = -1;
      deltas[type] = 1;
    }

    if (next === 'remove') {
      tx.delete(rRef);
    } else {
      tx.set(rRef, { type: next, updatedAt: serverTimestamp() }, { merge: true });
    }

    const upd: Record<string, unknown> = {};
    if (deltas.like !== 0) upd.likeCount = increment(deltas.like);
    if (deltas.love !== 0) upd.loveCount = increment(deltas.love);
    if (deltas.smile !== 0) upd.smileCount = increment(deltas.smile);
    if (deltas.angry !== 0) upd.angryCount = increment(deltas.angry);
    if (Object.keys(upd).length) tx.update(cRef, upd);
  });
}

/** Busca os utilizadores que reagiram a um post (inclui tipo). */
export async function fetchReactorsForPost(postId: string): Promise<Array<{ uid: string; type: string }>> {
  const col = collection(db, POSTS, postId, 'reactions');
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ uid: d.id, type: (d.data().type as string) ?? 'like' }));
}

/** Paginated reactors for a post. Order by __name__ (uid). */
export async function fetchReactorsForPostPage(postId: string, pageSize = 30, startAfterUid?: string): Promise<{ items: Array<{ uid: string; type: string }>; lastCursor?: string; hasMore: boolean }> {
  let q = query(collection(db, POSTS, postId, 'reactions'), orderBy('__name__'), limit(pageSize));
  if (startAfterUid) q = query(collection(db, POSTS, postId, 'reactions'), orderBy('__name__'), startAfter(startAfterUid), limit(pageSize));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ uid: d.id, type: (d.data().type as string) ?? 'like' }));
  const lastCursor = snap.docs.length ? snap.docs[snap.docs.length - 1].id : undefined;
  const hasMore = snap.docs.length === pageSize;
  return { items, lastCursor, hasMore };
}

export async function fetchReactorsByUids(postId: string, uids: string[]): Promise<Array<{ uid: string; type: string }>> {
  if (!uids || uids.length === 0) return [];
  const results: Array<{ uid: string; type: string }> = [];
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const r = await getDoc(doc(reactionsCol(postId), uid));
        if (r.exists()) {
          results.push({ uid, type: (r.data().type as string) ?? 'like' });
        }
      } catch {
        // ignore
      }
    })
  );
  return results;
}

/** Busca os utilizadores que reagiram a um comentário (inclui tipo). */
export async function fetchReactorsForComment(postId: string, commentId: string): Promise<Array<{ uid: string; type: string }>> {
  const col = collection(db, POSTS, postId, 'comments', commentId, 'reactions');
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ uid: d.id, type: (d.data().type as string) ?? 'like' }));
}

export async function fetchReactorsForCommentPage(postId: string, commentId: string, pageSize = 30, startAfterUid?: string): Promise<{ items: Array<{ uid: string; type: string }>; lastCursor?: string; hasMore: boolean }> {
  let q = query(collection(db, POSTS, postId, 'comments', commentId, 'reactions'), orderBy('__name__'), limit(pageSize));
  if (startAfterUid) q = query(collection(db, POSTS, postId, 'comments', commentId, 'reactions'), orderBy('__name__'), startAfter(startAfterUid), limit(pageSize));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ uid: d.id, type: (d.data().type as string) ?? 'like' }));
  const lastCursor = snap.docs.length ? snap.docs[snap.docs.length - 1].id : undefined;
  const hasMore = snap.docs.length === pageSize;
  return { items, lastCursor, hasMore };
}

export async function fetchReactorsForCommentByUids(postId: string, commentId: string, uids: string[]): Promise<Array<{ uid: string; type: string }>> {
  if (!uids || uids.length === 0) return [];
  const results: Array<{ uid: string; type: string }> = [];
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const r = await getDoc(doc(commentReactionsCol(postId, commentId), uid));
        if (r.exists()) results.push({ uid, type: (r.data().type as string) ?? 'like' });
      } catch {
        // ignore
      }
    })
  );
  return results;
}

export async function fetchMyCommentReactions(
  postId: string,
  commentIds: string[],
  uid: string
): Promise<Map<string, ReactionType>> {
  const map = new Map<string, ReactionType>();
  const unique = [...new Set(commentIds)];
  await Promise.all(
    unique.map(async (cid) => {
      const r = await getDoc(doc(commentReactionsCol(postId, cid), uid));
      if (r.exists()) {
        const t = r.data()?.type as ReactionType | undefined;
        if (t === 'like' || t === 'love' || t === 'smile' || t === 'angry') map.set(cid, t);
      }
    })
  );
  return map;
}

async function deleteQueryBatch(colRef: ReturnType<typeof collection>): Promise<boolean> {
  const snap = await getDocs(query(colRef, limit(400)));
  if (snap.empty) return false;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return true;
}

async function deleteCollectionRecursive(colRef: ReturnType<typeof collection>): Promise<void> {
  let more = true;
  while (more) {
    more = await deleteQueryBatch(colRef);
  }
}

export async function deleteComment(params: { postId: string; commentId: string; uid: string }): Promise<void> {
  const cref = doc(db, POSTS, params.postId, 'comments', params.commentId);
  const cs = await getDoc(cref);
  if (!cs.exists()) return;
  if (cs.data().authorId !== params.uid) throw new Error('Sem permissão para apagar este comentário');

  await deleteCollectionRecursive(commentReactionsCol(params.postId, params.commentId));

  const batch = writeBatch(db);
  batch.delete(cref);
  batch.update(postRef(params.postId), { commentCount: increment(-1) });
  await batch.commit();
}

export async function deletePost(postId: string, uid: string): Promise<void> {
  const pref = postRef(postId);
  const ps = await getDoc(pref);
  if (!ps.exists()) throw new Error('Post não encontrado');
  if (ps.data().authorId !== uid) throw new Error('Sem permissão para apagar este post');

  await deleteCollectionRecursive(reactionsCol(postId));

  while (true) {
    const snap = await getDocs(query(commentsCol(postId), limit(80)));
    if (snap.empty) {
      break;
    }
    for (const cd of snap.docs) {
      await deleteCollectionRecursive(commentReactionsCol(postId, cd.id));
      await deleteDoc(cd.ref);
    }
  }

  await deleteDoc(pref);
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

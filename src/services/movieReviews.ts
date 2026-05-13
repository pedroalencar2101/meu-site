import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MovieReview } from '../types/movieReview';
import { deletePost } from './feedPosts';

const COL = 'movieReviews';

export function reviewDocId(tmdbId: number, authorId: string): string {
  return `${tmdbId}_${authorId}`;
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function subscribeMovieReviews(
  tmdbId: number,
  onReviews: (list: MovieReview[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COL), where('tmdbId', '==', tmdbId), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => {
      const list: MovieReview[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          tmdbId: x.tmdbId,
          authorId: x.authorId,
          authorName: x.authorName,
          authorInitials: x.authorInitials ?? '',
          authorAvatar: x.authorAvatar ?? null,
          stars: typeof x.stars === 'number' ? x.stars : 0,
          text: x.text ?? '',
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
          movieTitle: typeof x.movieTitle === 'string' ? x.movieTitle : undefined,
          moviePosterPath: typeof x.moviePosterPath === 'string' || x.moviePosterPath === null ? x.moviePosterPath : undefined,
          feedPostId: typeof x.feedPostId === 'string' ? x.feedPostId : undefined,
        };
      });
      onReviews(list);
    },
    (err) => onError?.(err as Error)
  );
}

export async function getMyMovieReview(tmdbId: number, uid: string): Promise<MovieReview | null> {
  const snap = await getDoc(doc(db, COL, reviewDocId(tmdbId, uid)));
  if (!snap.exists()) return null;
  const x = snap.data();
  return {
    id: snap.id,
    tmdbId: x.tmdbId,
    authorId: x.authorId,
    authorName: x.authorName,
    authorInitials: x.authorInitials ?? '',
    authorAvatar: x.authorAvatar ?? null,
    stars: x.stars,
    text: x.text ?? '',
    createdAt: x.createdAt ?? null,
    updatedAt: x.updatedAt ?? null,
    movieTitle: typeof x.movieTitle === 'string' ? x.movieTitle : undefined,
    moviePosterPath: typeof x.moviePosterPath === 'string' || x.moviePosterPath === null ? x.moviePosterPath : undefined,
    feedPostId: typeof x.feedPostId === 'string' ? x.feedPostId : undefined,
  };
}

export async function saveMovieReview(params: {
  tmdbId: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  stars: number;
  text: string;
  movieTitle?: string;
  moviePosterPath?: string | null;
}): Promise<void> {
  const stars = Math.min(5, Math.max(1, Math.round(params.stars)));
  const id = reviewDocId(params.tmdbId, params.uid);
  const ref = doc(db, COL, id);
  const prev = await getDoc(ref);
  const name = params.displayName.trim() || 'Utilizador';
  const payload = {
    tmdbId: params.tmdbId,
    authorId: params.uid,
    authorName: name,
    authorInitials: initialsFromName(name),
    authorAvatar: params.photoURL,
    stars,
    text: params.text.trim().slice(0, 2000),
    updatedAt: serverTimestamp(),
    ...(params.movieTitle
      ? {
          movieTitle: params.movieTitle.slice(0, 240),
          moviePosterPath: params.moviePosterPath ?? null,
        }
      : {}),
    ...(prev.exists() ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, payload, { merge: true });
}

/** Associa (ou atualiza) o post do feed gerado a partir desta avaliação. */
export async function setReviewFeedPostId(tmdbId: number, uid: string, feedPostId: string): Promise<void> {
  await setDoc(
    doc(db, COL, reviewDocId(tmdbId, uid)),
    { feedPostId },
    { merge: true }
  );
}

/** Todas as avaliações de cinema que o utilizador publicou. */
export function subscribeMyMovieReviews(
  uid: string,
  onList: (list: MovieReview[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, COL), where('authorId', '==', uid), orderBy('updatedAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const list: MovieReview[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          tmdbId: x.tmdbId,
          authorId: x.authorId,
          authorName: x.authorName,
          authorInitials: x.authorInitials ?? '',
          authorAvatar: x.authorAvatar ?? null,
          stars: typeof x.stars === 'number' ? x.stars : 0,
          text: x.text ?? '',
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
          movieTitle: typeof x.movieTitle === 'string' ? x.movieTitle : undefined,
          moviePosterPath: typeof x.moviePosterPath === 'string' || x.moviePosterPath === null ? x.moviePosterPath : undefined,
          feedPostId: typeof x.feedPostId === 'string' ? x.feedPostId : undefined,
        };
      });
      onList(list);
    },
    (err) => onError?.(err as Error)
  );
}

export async function deleteMovieReview(tmdbId: number, uid: string): Promise<void> {
  const ref = doc(db, COL, reviewDocId(tmdbId, uid));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const feedPostId = snap.data().feedPostId as string | undefined;
  if (feedPostId) {
    try {
      await deletePost(feedPostId, uid);
    } catch {
      /* post já apagado ou inconsistente — continua a remover a avaliação */
    }
  }
  await deleteDoc(ref);
}

/** Média e contagem a partir da lista já carregada (até ao limite da query). */
export function communityStatsFromReviews(list: MovieReview[]): { average: number | null; count: number } {
  const rated = list.filter((r) => r.stars >= 1 && r.stars <= 5);
  if (rated.length === 0) return { average: null, count: 0 };
  const sum = rated.reduce((acc, r) => acc + r.stars, 0);
  return { average: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
}

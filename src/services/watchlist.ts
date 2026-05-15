import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type WatchlistMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  addedAt: number;
};

export type WatchlistState = {
  watchlistPublic: boolean;
  toWatch: WatchlistMovie[];
  watched: WatchlistMovie[];
};

const defaults: WatchlistState = {
  watchlistPublic: true,
  toWatch: [],
  watched: [],
};

function parseList(raw: unknown): WatchlistMovie[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const o = x as Record<string, unknown>;
      const tmdbId = typeof o.tmdbId === 'number' ? o.tmdbId : Number(o.tmdbId);
      if (!Number.isFinite(tmdbId)) return null;
      return {
        tmdbId,
        title: typeof o.title === 'string' ? o.title.slice(0, 240) : 'Filme',
        posterPath: typeof o.posterPath === 'string' || o.posterPath === null ? (o.posterPath as string | null) : null,
        backdropPath:
          typeof o.backdropPath === 'string' || o.backdropPath === null ? (o.backdropPath as string | null) : null,
        addedAt: typeof o.addedAt === 'number' ? o.addedAt : Date.now(),
      };
    })
    .filter(Boolean) as WatchlistMovie[];
}

export function parseWatchlistFromUserData(data: Record<string, unknown> | undefined): WatchlistState {
  if (!data) return { ...defaults };
  return {
    watchlistPublic: data.watchlistPublic !== false,
    toWatch: parseList(data.watchlistToWatch),
    watched: parseList(data.watchlistWatched),
  };
}

export function subscribeUserWatchlist(
  uid: string,
  onData: (s: WatchlistState) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) onData({ ...defaults });
      else onData(parseWatchlistFromUserData(snap.data() as Record<string, unknown>));
    },
    (e) => onError?.(e as Error)
  );
}

export async function patchUserWatchlist(uid: string, partial: Partial<WatchlistState>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const next: Record<string, unknown> = {};
  if (partial.watchlistPublic !== undefined) next.watchlistPublic = partial.watchlistPublic;
  if (partial.toWatch !== undefined) next.watchlistToWatch = partial.toWatch;
  if (partial.watched !== undefined) next.watchlistWatched = partial.watched;
  await setDoc(
    ref,
    {
      ...next,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function addMovieToWatchlist(uid: string, m: Omit<WatchlistMovie, 'addedAt'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const cur = snap.exists() ? parseWatchlistFromUserData(snap.data() as Record<string, unknown>) : { ...defaults };
  if (cur.toWatch.some((x) => x.tmdbId === m.tmdbId) || cur.watched.some((x) => x.tmdbId === m.tmdbId)) return;
  const item: WatchlistMovie = { ...m, addedAt: Date.now() };
  const toWatch = [...cur.toWatch, item].slice(0, 200);
  await patchUserWatchlist(uid, { toWatch });
}

export async function markMovieWatched(uid: string, tmdbId: number): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const cur = snap.exists() ? parseWatchlistFromUserData(snap.data() as Record<string, unknown>) : { ...defaults };
  const idx = cur.toWatch.findIndex((x) => x.tmdbId === tmdbId);
  if (idx < 0) return;
  const [item] = cur.toWatch.splice(idx, 1);
  const watchedItem: WatchlistMovie = { ...item, addedAt: Date.now() };
  const watched = [watchedItem, ...cur.watched.filter((x) => x.tmdbId !== tmdbId)].slice(0, 300);
  await patchUserWatchlist(uid, { toWatch: [...cur.toWatch], watched });
}

export async function removeFromToWatch(uid: string, tmdbId: number): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid));
  const cur = snap.exists() ? parseWatchlistFromUserData(snap.data() as Record<string, unknown>) : { ...defaults };
  await patchUserWatchlist(uid, { toWatch: cur.toWatch.filter((x) => x.tmdbId !== tmdbId) });
}

export async function removeFromWatched(uid: string, tmdbId: number): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid));
  const cur = snap.exists() ? parseWatchlistFromUserData(snap.data() as Record<string, unknown>) : { ...defaults };
  await patchUserWatchlist(uid, { watched: cur.watched.filter((x) => x.tmdbId !== tmdbId) });
}

export async function setWatchlistPublic(uid: string, watchlistPublic: boolean): Promise<void> {
  await patchUserWatchlist(uid, { watchlistPublic });
}

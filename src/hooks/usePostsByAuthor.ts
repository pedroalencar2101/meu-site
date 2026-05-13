import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { FirestorePost, UiPost, ReactionType } from '../types/feed';
import { subscribePostsByAuthor, fetchMyReactionsForPosts, toggleReaction } from '../services/feedPosts';

export function usePostsByAuthor(authorUid: string | undefined) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [rawPosts, setRawPosts] = useState<FirestorePost[]>([]);
  const [myByPost, setMyByPost] = useState<Map<string, ReactionType>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!authorUid) {
      setRawPosts([]);
      return;
    }
    return subscribePostsByAuthor(authorUid, setRawPosts, (e) => setError(e.message));
  }, [authorUid]);

  useEffect(() => {
    if (!user) {
      setMyByPost(new Map());
      return;
    }
    const ids = rawPosts.map((p) => p.id);
    if (ids.length === 0) return;
    let cancelled = false;
    fetchMyReactionsForPosts(ids, user.uid).then((m) => {
      if (!cancelled) setMyByPost(m);
    });
    return () => {
      cancelled = true;
    };
  }, [rawPosts, user]);

  const posts: UiPost[] = useMemo(
    () =>
      rawPosts.map((p) => ({
        ...p,
        myReaction: myByPost.get(p.id) ?? null,
      })),
    [rawPosts, myByPost]
  );

  const handleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!user) return;
      await toggleReaction(postId, user.uid, type);
      const m = await fetchMyReactionsForPosts([postId], user.uid);
      setMyByPost((prev) => {
        const next = new Map(prev);
        const v = m.get(postId);
        if (v) next.set(postId, v);
        else next.delete(postId);
        return next;
      });
    },
    [user]
  );

  return { user, posts, error, handleReaction };
}

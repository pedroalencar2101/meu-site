import { useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { FirestorePost, UiPost, ReactionType } from '../types/feed';
import {
  subscribeFeedForAuthors,
  fetchMyReactionsForPosts,
  createPost as createPostRemote,
  toggleReaction,
} from '../services/feedPosts';
import { subscribeFollowingIds } from '../services/follows';

export function useNoctalFeed() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [rawPosts, setRawPosts] = useState<FirestorePost[]>([]);
  const [myByPost, setMyByPost] = useState<Map<string, ReactionType>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setFollowingIds([]);
      return;
    }
    return subscribeFollowingIds(user.uid, setFollowingIds);
  }, [user]);

  const authorKey = useMemo(
    () => (user ? [user.uid, ...followingIds].sort().join('|') : ''),
    [user, followingIds]
  );

  useEffect(() => {
    if (!user) {
      setRawPosts([]);
      return;
    }
    const ids = [user.uid, ...followingIds];
    const unsub = subscribeFeedForAuthors(ids, setRawPosts, (e) => setError(e.message), 80);
    return unsub;
  }, [user, authorKey]);

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

  const posts: UiPost[] = rawPosts.map((p) => ({
    ...p,
    myReaction: myByPost.get(p.id) ?? null,
  }));

  const handleCreatePost = useCallback(
    async (text: string, movie?: UiPost['movie'] | null) => {
      if (!user) return;
      const name = user.displayName || user.email || 'Utilizador';
      await createPostRemote({
        uid: user.uid,
        displayName: name,
        photoURL: user.photoURL,
        content: text,
        movie: movie ?? null,
      });
    },
    [user]
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

  return {
    user,
    posts,
    error,
    handleCreatePost,
    handleReaction,
    followingCount: followingIds.length,
  };
}

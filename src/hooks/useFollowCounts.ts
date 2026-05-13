import { useEffect, useState } from 'react';
import { subscribeFollowersOf, subscribeFollowingOf } from '../services/follows';

export function useFollowCounts(uid: string | undefined) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    if (!uid) {
      setFollowers(0);
      setFollowing(0);
      return;
    }
    const u1 = subscribeFollowersOf(uid, (r) => setFollowers(r.length));
    const u2 = subscribeFollowingOf(uid, (r) => setFollowing(r.length));
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  return { followers, following };
}

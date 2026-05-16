import { useEffect, useState, useRef } from 'react';
import { subscribeFollowingOf } from '../services/follows';
import { subscribePresence, type PresenceStatus } from '../services/presence';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FriendCard = {
  uid: string;
  label: string;
  photo: string | null;
  initials: string;
  online: boolean;
  lastOnline: Date | null;
};

function initialsFrom(s: string): string {
  const p = s.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

/**
 * Hook que retorna a lista de amigos (usuários que sigo) com status online em tempo real.
 * Os online aparecem primeiro, ordenados alfabeticamente.
 */
export function useOnlineFriends(currentUserId: string | undefined): FriendCard[] {
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});
  const [profiles, setProfiles] = useState<Record<string, { label: string; photo: string | null; initials: string }>>({});
  const unsubsRef = useRef<Map<string, () => void>>(new Map());

  // Assina a lista de IDs que o usuário segue
  useEffect(() => {
    if (!currentUserId) return;
    return subscribeFollowingOf(currentUserId, (rows) => {
      setFollowingIds(rows.map((r) => r.followingId));
    });
  }, [currentUserId]);

  // Para cada followingId, assina documento do usuário (nome/foto) e presença
  useEffect(() => {
    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current.clear();

    if (followingIds.length === 0) return;

    const presenceUpdates: Record<string, PresenceStatus> = {};
    const profileUpdates: Record<string, { label: string; photo: string | null; initials: string }> = {};

    for (const uid of followingIds) {
      const unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
          const email = typeof data.email === 'string' ? data.email : '';
          const label = fullName || email.split('@')[0] || 'Utilizador';
          const photo =
            (typeof data.avatarCustomDataUrl === 'string' && data.avatarCustomDataUrl.trim()) ||
            (typeof data.photoURL === 'string' && data.photoURL.trim()) ||
            null;
          const initials = initialsFrom(label);
          profileUpdates[uid] = { label, photo, initials };
          setProfiles({ ...profileUpdates });
        }
      });
      unsubsRef.current.set(`profile_${uid}`, unsubProfile);

      const unsubPresence = subscribePresence(uid, (status) => {
        presenceUpdates[uid] = status;
        setPresenceMap({ ...presenceUpdates });
      });
      unsubsRef.current.set(`presence_${uid}`, unsubPresence);
    }

    return () => {
      unsubsRef.current.forEach((unsub) => unsub());
      unsubsRef.current.clear();
    };
  }, [followingIds]);

  // Monta lista final ordenada: online primeiro, depois offline
  const friends: FriendCard[] = followingIds.map((uid) => ({
    uid,
    label: profiles[uid]?.label ?? '…',
    photo: profiles[uid]?.photo ?? null,
    initials: profiles[uid]?.initials ?? '?',
    online: presenceMap[uid]?.online ?? false,
    lastOnline: presenceMap[uid]?.lastOnline?.toDate() ?? null,
  }));

  friends.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return friends;
}
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LiveUserCard = {
  label: string;
  photo: string | null;
  initials: string;
};

function initialsFrom(s: string): string {
  const p = s.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

function cardFromData(x: Record<string, unknown> | undefined, fallbackUid: string): LiveUserCard {
  if (!x) {
    return { label: 'Utilizador', photo: null, initials: '?' };
  }
  const fullName = typeof x.fullName === 'string' ? x.fullName.trim() : '';
  const email = typeof x.email === 'string' ? x.email : '';
  const label = fullName || email.split('@')[0] || 'Utilizador';
  const photo =
    (typeof x.avatarCustomDataUrl === 'string' && x.avatarCustomDataUrl.trim()) ||
    (typeof x.photoURL === 'string' && x.photoURL.trim()) ||
    null;
  return { label, photo, initials: initialsFrom(label || fallbackUid) };
}

/** Avatar e nome a partir do documento `users/{uid}` em tempo real (atualiza quando o perfil muda). */
export function useLiveUserCard(uid: string | undefined): LiveUserCard | null {
  const [card, setCard] = useState<LiveUserCard | null>(null);

  useEffect(() => {
    if (!uid) {
      setCard(null);
      return;
    }
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          setCard({ label: 'Utilizador', photo: null, initials: '?' });
          return;
        }
        setCard(cardFromData(snap.data() as Record<string, unknown>, uid));
      },
      () => {
        setCard({ label: 'Utilizador', photo: null, initials: '?' });
      }
    );
  }, [uid]);

  return card;
}

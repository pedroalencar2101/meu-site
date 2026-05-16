import { doc, setDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

/** Inicializa a sessão de presença: marca o usuário como online. */
export function goOnline(uid: string): void {
  setDoc(doc(db, 'users', uid), { online: true, lastOnline: serverTimestamp() }, { merge: true }).catch(console.error);
}

/** Marca o usuário como offline */
export function goOffline(uid: string): void {
  setDoc(doc(db, 'users', uid), { online: false, lastOnline: serverTimestamp() }, { merge: true }).catch(console.error);
}

export type PresenceStatus = {
  online: boolean;
  lastOnline: Timestamp | null;
};

/** Assina o status online de um usuário em tempo real */
export function subscribePresence(
  uid: string,
  onStatus: (status: PresenceStatus) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onStatus({ online: false, lastOnline: null });
        return;
      }
      const data = snap.data();
      onStatus({
        online: data.online === true,
        lastOnline: data.lastOnline as Timestamp | null ?? null,
      });
    },
    (err) => {
      console.error(err);
      onError?.(err as Error);
    }
  );
}
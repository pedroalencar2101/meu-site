import { collection, getDocs, limit, orderBy, query, startAt, endAt } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type PublicUserRow = {
  id: string;
  fullName: string;
  email: string;
  photoURL: string | null;
  displaySearch: string;
};

export async function searchUsersByPrefix(prefixRaw: string, excludeUid: string | undefined): Promise<PublicUserRow[]> {
  const prefix = prefixRaw.trim().toLowerCase();
  if (prefix.length < 2) return [];
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('displaySearch'),
      startAt(prefix),
      endAt(`${prefix}\uf8ff`),
      limit(24)
    );
    const snap = await getDocs(q);
    const rows: PublicUserRow[] = [];
    snap.docs.forEach((d) => {
      if (excludeUid && d.id === excludeUid) return;
      const x = d.data() as {
        fullName?: string;
        email?: string;
        photoURL?: string;
        displaySearch?: string;
      };
      rows.push({
        id: d.id,
        fullName: (x.fullName && x.fullName.trim()) || x.email?.split('@')[0] || 'Utilizador',
        email: x.email || '',
        photoURL: x.photoURL ?? null,
        displaySearch: x.displaySearch || '',
      });
    });
    return rows;
  } catch {
    return [];
  }
}

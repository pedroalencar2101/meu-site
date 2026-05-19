import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Profile = { name?: string; avatar?: string | null; initials?: string };

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const cache = new Map<string, { ts: number; v: Profile }>();

export async function getCachedUserProfile(uid: string): Promise<Profile> {
  const now = Date.now();
  const existing = cache.get(uid);
  if (existing && now - existing.ts < CACHE_TTL) return existing.v;

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data() as Record<string, unknown>;
      const fullName = typeof d.fullName === 'string' ? d.fullName : undefined;
      const avatar = (typeof d.avatarCustomDataUrl === 'string' && d.avatarCustomDataUrl) || (typeof d.photoURL === 'string' && d.photoURL) || null;
      const initials = typeof d.fullName === 'string' ? (d.fullName.split(/\s+/).map((p) => p[0]).slice(0,2).join('').toUpperCase()) : uid.slice(0,2).toUpperCase();
      const v = { name: fullName, avatar, initials } as Profile;
      cache.set(uid, { ts: now, v });
      return v;
    }
  } catch {
    // ignore failures — fallthrough to uid fallback
  }
  const fallback = { initials: uid.slice(0,2).toUpperCase() };
  cache.set(uid, { ts: now, v: fallback });
  return fallback;
}

export function clearProfileCache() {
  cache.clear();
}

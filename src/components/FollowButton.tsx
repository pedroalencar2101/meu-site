import { useEffect, useState } from 'react';
import { followUser, isFollowing, unfollowUser } from '../services/follows';

type Props = {
  viewerId: string;
  targetId: string;
  className?: string;
};

export default function FollowButton({ viewerId, targetId, className = '' }: Props) {
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (viewerId === targetId) {
      setLoading(false);
      setFollowing(false);
      return;
    }
    let cancelled = false;
    isFollowing(viewerId, targetId).then((v) => {
      if (!cancelled) {
        setFollowing(v);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [viewerId, targetId]);

  if (viewerId === targetId) return null;

  async function toggle() {
    setLoading(true);
    try {
      if (following) {
        await unfollowUser(viewerId, targetId);
        setFollowing(false);
      } else {
        await followUser(viewerId, targetId);
        setFollowing(true);
      }
    } catch (e) {
      console.error(e);
      alert('Não foi possível atualizar. Verifica as regras do Firestore (follows).');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-50 ${
        following
          ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      } ${className}`}
    >
      {loading ? '…' : following ? 'Seguindo' : 'Seguir'}
    </button>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeFollowersOf, subscribeFollowingOf, type FollowDoc } from '../services/follows';
import MobileBottomNav from '../components/MobileBottomNav';
import NoctalBrand from '../components/NoctalBrand';
import NetworkTabs from '../components/NetworkTabs';
import UserListCard from '../components/UserListCard';
import UserListPanel from '../components/UserListPanel';

export default function UserConnectionsPage() {
  const { uid } = useParams<{ uid: string }>();
  const { pathname } = useLocation();
  const mode = pathname.includes('/seguindo') ? 'following' : 'followers';
  const [rows, setRows] = useState<FollowDoc[]>([]);
  const [viewer, setViewer] = useState<User | null>(auth.currentUser);

  useEffect(() => onAuthStateChanged(auth, setViewer), []);

  useEffect(() => {
    if (!uid) return;
    if (mode === 'followers') {
      return subscribeFollowersOf(uid, setRows);
    }
    return subscribeFollowingOf(uid, setRows);
  }, [uid, mode]);

  const isFollowers = mode === 'followers';
  const uids = rows.map((r) => (isFollowers ? r.followerId : r.followingId));

  return (
    <div className="relative min-h-dvh bg-[#f0f2f5] font-sans text-slate-900 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to={uid ? `/u/${uid}` : '/'} className="noctal-icon-btn shrink-0 !p-2" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <NoctalBrand showText={false} />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">
              {isFollowers ? 'Seguidores' : 'Seguindo'}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {isFollowers ? 'Quem segue este perfil' : 'Contas que este perfil segue'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {uid && (
          <NetworkTabs
            active={mode}
            followersHref={`/u/${uid}/seguidores`}
            followingHref={`/u/${uid}/seguindo`}
            className="mb-6"
          />
        )}

        <UserListPanel
          title={isFollowers ? 'Lista de seguidores' : 'Lista a seguir'}
          count={uids.length}
          isEmpty={uids.length === 0}
          variant="grid"
          emptyTitle="Lista vazia"
          emptyDescription={
            isFollowers
              ? 'Este perfil ainda não tem seguidores visíveis.'
              : 'Este perfil ainda não segue outras contas.'
          }
        >
          {uids.map((targetUid) => (
            <UserListCard
              key={targetUid}
              uid={targetUid}
              layout="card"
              viewerId={viewer?.uid}
              showFollow={!!viewer && viewer.uid !== targetUid}
              showChevron={false}
            />
          ))}
        </UserListPanel>
      </main>
      <MobileBottomNav />
    </div>
  );
}

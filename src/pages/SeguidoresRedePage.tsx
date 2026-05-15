import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeFollowersOf, subscribeFollowingOf, type FollowDoc } from '../services/follows';
import AppPageShell from '../components/AppPageShell';
import NetworkTabs from '../components/NetworkTabs';
import UserListCard from '../components/UserListCard';
import UserListPanel from '../components/UserListPanel';

export default function SeguidoresRedePage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'seguindo' ? 'following' : 'followers';
  const [rows, setRows] = useState<FollowDoc[]>([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setRows([]);
      return;
    }
    if (tab === 'followers') {
      return subscribeFollowersOf(uid, setRows);
    }
    return subscribeFollowingOf(uid, setRows);
  }, [user?.uid, tab]);

  const isFollowers = tab === 'followers';
  const uids = rows.map((r) => (isFollowers ? r.followerId : r.followingId));

  return (
    <AppPageShell title="Rede" description="Gerir seguidores e contas que segues.">
      {!user ? (
        <p className="text-center text-sm font-medium text-slate-500">Inicia sessão para veres a tua rede.</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <NetworkTabs
              active={tab}
              followersHref="/seguidores"
              followingHref="/seguidores?tab=seguindo"
            />
            <Link
              to="/explorar"
              className="noctal-btn-primary ml-auto !py-2 !text-xs"
            >
              <UserPlus className="h-4 w-4" />
              Procurar pessoas
            </Link>
          </div>

          <UserListPanel
            title={isFollowers ? 'Seguidores' : 'Seguindo'}
            description={
              isFollowers ? 'Quem acompanha o teu perfil' : 'Perfis que segues na comunidade'
            }
            count={uids.length}
            isEmpty={uids.length === 0}
            variant="grid"
            emptyTitle={isFollowers ? 'Ainda sem seguidores' : 'Ainda não segues ninguém'}
            emptyDescription={
              isFollowers
                ? 'Partilha o teu perfil e publica avaliações para atrair a comunidade Noctal.'
                : 'Explora perfis e segue quem partilha os teus gostos cinematográficos.'
            }
          >
            {uids.map((uid) => (
              <UserListCard
                key={uid}
                uid={uid}
                layout="card"
                viewerId={user.uid}
                showFollow
                showChevron={false}
              />
            ))}
          </UserListPanel>
        </>
      )}
    </AppPageShell>
  );
}

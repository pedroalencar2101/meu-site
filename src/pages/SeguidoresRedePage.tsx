import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { subscribeFollowersOf, subscribeFollowingOf, type FollowDoc } from '../services/follows';
import UserListRow from '../components/UserListRow';
import AppPageShell from '../components/AppPageShell';

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

  const title = tab === 'followers' ? 'Seguidores' : 'Seguindo';
  const subtitle = tab === 'followers' ? 'Quem acompanha o teu perfil' : 'Perfis que segues';

  return (
    <AppPageShell title="Rede" description="Gerir seguidores e contas que segues.">
      {!user ? (
        <p className="text-center text-sm font-medium text-slate-500">Inicia sessão para veres a tua rede.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Link
              to="/seguidores"
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                tab === 'followers' ? 'bg-slate-900 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Seguidores
            </Link>
            <Link
              to="/seguidores?tab=seguindo"
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                tab === 'following' ? 'bg-slate-900 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Seguindo
            </Link>
            <Link
              to="/explorar"
              className="ml-auto text-xs font-bold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
            >
              Procurar pessoas
            </Link>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Users className="h-8 w-8 shrink-0 text-slate-500" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
              <p className="text-xs font-medium text-slate-500">{subtitle}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {rows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-slate-600">Ainda não há ninguém nesta lista.</p>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {tab === 'followers'
                    ? 'Convida amigos a seguirem-te a partir do teu perfil público.'
                    : 'Explora perfis no separador “Procurar pessoas” e segue quem te interessa.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {tab === 'followers'
                  ? rows.map((r) => <UserListRow key={r.id} uid={r.followerId} hint="Perfil" />)
                  : rows.map((r) => <UserListRow key={r.id} uid={r.followingId} hint="Perfil" />)}
              </ul>
            )}
          </div>
        </>
      )}
    </AppPageShell>
  );
}

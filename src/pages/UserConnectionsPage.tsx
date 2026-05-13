import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { subscribeFollowersOf, subscribeFollowingOf, type FollowDoc } from '../services/follows';
import UserListRow from '../components/UserListRow';

export default function UserConnectionsPage() {
  const { uid } = useParams<{ uid: string }>();
  const { pathname } = useLocation();
  const mode = pathname.includes('/seguindo') ? 'following' : 'followers';
  const [rows, setRows] = useState<FollowDoc[]>([]);

  useEffect(() => {
    if (!uid) return;
    if (mode === 'followers') {
      return subscribeFollowersOf(uid, setRows);
    }
    return subscribeFollowingOf(uid, setRows);
  }, [uid, mode]);

  const title = mode === 'followers' ? 'Seguidores' : 'Seguindo';
  const subtitle = mode === 'followers' ? 'Quem segue este perfil' : 'Contas que este perfil segue';

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link to={uid ? `/u/${uid}` : '/'} className="rounded-full p-2 text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Users className="h-6 w-6 text-slate-600" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">{title}</h1>
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 flex gap-2">
          <Link
            to={`/u/${uid}/seguidores`}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
              mode === 'followers' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Seguidores
          </Link>
          <Link
            to={`/u/${uid}/seguindo`}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
              mode === 'following' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Seguindo
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Lista vazia.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mode === 'followers'
                ? rows.map((r) => <UserListRow key={r.id} uid={r.followerId} hint="Perfil" />)
                : rows.map((r) => <UserListRow key={r.id} uid={r.followingId} hint="Perfil" />)}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

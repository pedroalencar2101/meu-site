import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, UserRoundSearch } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { searchUsersByPrefix, type PublicUserRow } from '../services/userSearch';
import FollowButton from '../components/FollowButton';
import MobileBottomNav from '../components/MobileBottomNav';

export default function ExplorarPessoasPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<PublicUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchUsersByPrefix(debounced, user?.uid).then((r) => {
      if (!cancelled) setRows(r);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, user?.uid]);

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link to="/" className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Início">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <UserRoundSearch className="h-6 w-6 text-slate-600" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">Procurar pessoas</h1>
            <p className="text-xs font-medium text-slate-500">Mínimo 2 letras · nome ou parte do e-mail</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: pedro, maria…"
            autoComplete="off"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {debounced.length > 0 && debounced.length < 2 && (
          <p className="text-center text-sm text-slate-500">Escreve pelo menos 2 caracteres.</p>
        )}

        {loading && <p className="text-center text-sm text-slate-500">A pesquisar…</p>}

        {!loading && debounced.length >= 2 && rows.length === 0 && (
          <p className="text-center text-sm text-slate-500">Nenhum utilizador encontrado.</p>
        )}

        <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
              <Link to={`/u/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xs font-bold text-white">
                  {r.photoURL ? (
                    <img src={r.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    r.fullName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{r.fullName}</p>
                  {r.email && <p className="truncate text-xs text-slate-500">{r.email}</p>}
                </div>
              </Link>
              {user && <FollowButton viewerId={user.uid} targetId={r.id} />}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-slate-500">
          Contas antigas sem campo de pesquisa podem não aparecer até atualizarem o perfil ou voltarem a guardar dados em Firestore.
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}

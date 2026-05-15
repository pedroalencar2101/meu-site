import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserRoundSearch } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { searchUsersByPrefix, type PublicUserRow } from '../services/userSearch';
import MobileBottomNav from '../components/MobileBottomNav';
import GlobalUserSearch from '../components/GlobalUserSearch';
import NoctalBrand from '../components/NoctalBrand';
import UserListCard from '../components/UserListCard';
import UserListPanel from '../components/UserListPanel';

export default function ExplorarPessoasPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [debounced, setDebounced] = useState(initialQ.trim());
  const [rows, setRows] = useState<PublicUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    setDebounced(initialQ.trim());
  }, [initialQ]);

  useEffect(() => {
    if (debounced.length < 2) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchUsersByPrefix(debounced, user?.uid).then((r) => {
      if (!cancelled) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, user?.uid]);

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link to="/" className="noctal-icon-btn shrink-0 !p-2" aria-label="Início">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <NoctalBrand showText={false} />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-base font-black uppercase tracking-wide text-slate-900">
              <UserRoundSearch className="h-5 w-5 text-slate-600" />
              Pessoas
            </h1>
            <p className="text-xs font-medium text-slate-500">Nome ou e-mail · mín. 2 letras</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <GlobalUserSearch
          variant="page"
          excludeUid={user?.uid}
          viewerId={user?.uid}
          initialQuery={initialQ}
          className="mb-6 max-w-none"
        />

        {debounced.length > 0 && debounced.length < 2 && (
          <p className="mb-4 text-center text-sm text-slate-500">Escreve pelo menos 2 caracteres.</p>
        )}

        {loading && <p className="mb-4 text-center text-sm text-slate-500">A pesquisar…</p>}

        {!loading && debounced.length >= 2 && (
          <UserListPanel
            title="Resultados"
            count={rows.length}
            isEmpty={rows.length === 0}
            variant="grid"
            emptyTitle="Nenhum utilizador encontrado"
            emptyDescription="Tenta outro nome ou parte do e-mail."
          >
            {rows.map((r) => (
              <UserListCard
                key={r.id}
                uid={r.id}
                name={r.fullName}
                photo={r.photoURL}
                email={r.email}
                layout="card"
                viewerId={user?.uid}
                showFollow
                showChevron={false}
              />
            ))}
          </UserListPanel>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
          Contas antigas sem campo de pesquisa podem não aparecer até atualizarem o perfil.
        </p>
      </main>
      <MobileBottomNav />
    </div>
  );
}

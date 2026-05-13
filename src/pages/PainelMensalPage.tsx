import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Film, LayoutDashboard, MessageCircle, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { useFollowCounts } from '../hooks/useFollowCounts';
import AppPageShell from '../components/AppPageShell';

export default function PainelMensalPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const { followers, following } = useFollowCounts(user?.uid);
  const [postsCount, setPostsCount] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number | null>(null);
  const [loadingContentCounts, setLoadingContentCounts] = useState(true);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setPostsCount(null);
      setReviewsCount(null);
      setLoadingContentCounts(false);
      return;
    }
    let cancelled = false;
    setLoadingContentCounts(true);
    (async () => {
      try {
        const [postsSnap, revSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'posts'), where('authorId', '==', uid))),
          getCountFromServer(query(collection(db, 'movieReviews'), where('authorId', '==', uid))),
        ]);
        if (!cancelled) {
          setPostsCount(postsSnap.data().count);
          setReviewsCount(revSnap.data().count);
        }
      } catch {
        if (!cancelled) {
          setPostsCount(null);
          setReviewsCount(null);
        }
      } finally {
        if (!cancelled) setLoadingContentCounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <AppPageShell
      title="Painel mensal"
      description={`Resumo da tua atividade em ${monthLabel}.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Seguidores</p>
            <Users className="h-5 w-5 text-slate-300" />
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums text-slate-900">{followers}</p>
          <Link to={user ? `/u/${user.uid}/seguidores` : '/seguidores'} className="mt-3 inline-block text-xs font-bold text-slate-600 underline">
            Ver lista
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Seguindo</p>
            <TrendingUp className="h-5 w-5 text-slate-300" />
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums text-slate-900">{following}</p>
          <Link to={user ? `/seguidores?tab=seguindo` : '/seguidores'} className="mt-3 inline-block text-xs font-bold text-slate-600 underline">
            Gerir rede
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Publicações</p>
            <LayoutDashboard className="h-5 w-5 text-slate-300" />
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums text-slate-900">{loadingContentCounts ? '—' : postsCount ?? '—'}</p>
          <p className="mt-2 text-sm text-slate-500">Posts que criaste no feed.</p>
        </div>
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-800/80">Cinema</p>
              <p className="mt-1 text-2xl font-black text-slate-900">Avaliações TMDB</p>
              <p className="mt-2 max-w-xl text-sm font-medium text-slate-600">
                {loadingContentCounts ? 'A carregar…' : `${reviewsCount ?? 0} filmes avaliados na comunidade.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/avaliacoes"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
              >
                <Star className="h-4 w-4 text-amber-300" />
                Minhas avaliações
              </Link>
              <Link
                to="/em-cartaz"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Film className="h-4 w-4" />
                Explorar filmes
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
            <Sparkles className="h-4 w-4 text-amber-500" /> Atalhos
          </h2>
          <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
            <li>
              <Link className="block rounded-lg px-3 py-2 hover:bg-slate-50" to="/explorar">
                Procurar pessoas e seguir novidades
              </Link>
            </li>
            <li>
              <Link className="block rounded-lg px-3 py-2 hover:bg-slate-50" to="/mensagens">
                Mensagens privadas
              </Link>
            </li>
            <li>
              <Link className="block rounded-lg px-3 py-2 hover:bg-slate-50" to="/notificacoes">
                Centro de notificações
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
            <MessageCircle className="h-4 w-4" /> Dica
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            O painel usa contagens em tempo real da tua rede e dos teus conteúdos. Os totais de posts e avaliações vêm do Firestore (podem demorar um instante a atualizar após novas publicações).
          </p>
        </div>
      </div>
    </AppPageShell>
  );
}

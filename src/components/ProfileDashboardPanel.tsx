import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { LayoutDashboard, TrendingUp, Users, Star, Film, Sparkles } from 'lucide-react';

type Props = {
  uid: string;
  isOwner: boolean;
};

export default function ProfileDashboardPanel({ uid, isOwner }: Props) {
  const { followers, following } = useFollowCounts(uid);
  const [postsCount, setPostsCount] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPostsCount(null);
      setReviewsCount(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Painel</h2>
            <p className="text-xs font-medium text-slate-500">{monthLabel}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seguidores</p>
            <Users className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{followers}</p>
          <Link to={`/u/${uid}/seguidores`} className="mt-1 inline-block text-[11px] font-bold text-slate-500 hover:underline">
            Ver lista
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seguindo</p>
            <TrendingUp className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{following}</p>
          <Link to={isOwner ? `/seguidores?tab=seguindo` : `/u/${uid}/seguindo`} className="mt-1 inline-block text-[11px] font-bold text-slate-500 hover:underline">
            Gerir rede
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posts</p>
            <LayoutDashboard className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{loading ? '—' : postsCount ?? '—'}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">Publicações</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avaliações</p>
            <Star className="h-4 w-4 text-slate-300" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{loading ? '—' : reviewsCount ?? '—'}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">Filmes</p>
        </div>
      </div>

      {/* Cinema highlight */}
      <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <Film className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-800/80">Cinema</p>
              <p className="text-[13px] font-medium text-slate-600">
                {loading ? 'A carregar…' : `${reviewsCount ?? 0} filmes avaliados`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Link
                to="/avaliacoes"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-slate-800"
              >
                <Star className="h-3.5 w-3.5 text-amber-300" />
                Avaliações
              </Link>
            )}
            <Link
              to="/em-cartaz"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Film className="h-3.5 w-3.5" />
              Filmes
            </Link>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Atalhos
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/explorar" className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-center">
            Explorar
          </Link>
          <Link to="/mensagens" className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-center">
            Mensagens
          </Link>
          <Link to="/notificacoes" className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-center">
            Notificações
          </Link>
          <Link to="/lista-para-ver" className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-center">
            Lista para ver
          </Link>
        </div>
      </div>
    </div>
  );
}
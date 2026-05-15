import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Check, Film, Loader2, Plus, Search, X, Trash2, Eye, List } from 'lucide-react';
import { auth } from '../services/firebase';
import AppPageShell from '../components/AppPageShell';
import ConfirmModal from '../components/ConfirmModal';
import {
  getTmdbKey,
  posterUrl,
  tmdbGet,
  type TmdbSearchResponse,
  type TmdbMovieListItem,
} from '../services/tmdbClient';
import {
  addMovieToWatchlist,
  markMovieWatched,
  removeFromToWatch,
  removeFromWatched,
  setWatchlistPublic,
  subscribeUserWatchlist,
  type WatchlistState,
} from '../services/watchlist';

const EMPTY: WatchlistState = { watchlistPublic: true, toWatch: [], watched: [] };

type Tab = 'toWatch' | 'watched';

export default function ListaParaVerPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!user);
  const navigate = useNavigate();

  const [wl, setWl] = useState<WatchlistState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<TmdbMovieListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('toWatch');
  
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    return subscribeUserWatchlist(
      user.uid,
      (s) => {
        setWl(s);
        setHydrated(true);
      },
      console.error
    );
  }, [user]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const key = getTmdbKey();
    if (!key || debounced.length < 2) {
      const t = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const tSearch = setTimeout(() => setSearching(true), 0);
    void tmdbGet<TmdbSearchResponse>('/search/movie', { query: debounced, page: '1' })
      .then((res) => {
        if (!cancelled) setResults((res.results ?? []).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(tSearch);
    };
  }, [debounced]);

  if (loading || (!hydrated && user)) {
    return (
      <AppPageShell title="Lista para ver" description="Carregando sua lista..." backTo="/">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppPageShell>
    );
  }

  if (!user) return null;

  return (
    <AppPageShell
      title="Lista para ver"
      description="Sua lista de filmes para assistir e histórico."
      backTo="/"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Top Header / Settings */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Gerenciar Lista</h2>
              <p className="text-sm font-medium text-slate-500">Adicione filmes que deseja ver</p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={wl.watchlistPublic}
              onChange={(e) => void setWatchlistPublic(user.uid, e.target.checked)}
            />
            Visível no perfil público
          </label>
        </div>

        {/* Search Section */}
        <div className="relative z-20">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar filme para adicionar..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-10 text-base font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {debounced.length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {searching ? (
                <div className="flex items-center justify-center gap-2 p-6 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Buscando filmes...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Nenhum resultado encontrado.</div>
              ) : (
                <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
                  {results.map((m) => {
                    const isInToWatch = wl.toWatch.some((x) => x.tmdbId === m.id);
                    const isInWatched = wl.watched.some((x) => x.tmdbId === m.id);
                    const alreadyAdded = isInToWatch || isInWatched;

                    return (
                      <li key={m.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 sm:p-4">
                        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-200 shadow-sm sm:h-24 sm:w-16">
                          {m.poster_path ? (
                            <img src={posterUrl(m.poster_path, 'w185')} alt={m.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">Sem Imagem</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-slate-900 sm:text-lg">{m.title}</p>
                          <p className="text-sm font-medium text-slate-500">{m.release_date?.slice(0, 4) ?? 'Data desconhecida'}</p>
                          {alreadyAdded && (
                            <p className="mt-1 text-xs font-bold text-emerald-600">
                              {isInWatched ? 'Já assistido' : 'Na lista para ver'}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => {
                            void addMovieToWatchlist(user.uid, {
                              tmdbId: m.id,
                              title: m.title,
                              posterPath: m.poster_path,
                              backdropPath: m.backdrop_path ?? null,
                            });
                            setQ('');
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                        >
                          <Plus className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                          <span className="hidden text-sm font-bold sm:inline">Adicionar</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-200/50 p-1">
          <button
            onClick={() => setActiveTab('toWatch')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all ${
              activeTab === 'toWatch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="h-4 w-4" /> Para Ver ({wl.toWatch.length})
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all ${
              activeTab === 'watched' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="h-4 w-4" /> Já Assistidos ({wl.watched.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="mb-10">
          {activeTab === 'toWatch' && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {wl.toWatch.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Film className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Sua lista está vazia</h3>
                  <p className="mt-1 text-sm text-slate-500">Pesquise filmes acima para adicionar à sua lista.</p>
                </div>
              ) : (
                wl.toWatch.map((m) => (
                  <div key={m.tmdbId} className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
                    <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
                      {m.posterPath ? (
                        <img src={posterUrl(m.posterPath, 'w342')} alt={m.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-bold text-slate-400">Sem Imagem</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="line-clamp-2 font-bold leading-tight text-slate-900 hover:text-violet-600">
                        {m.title}
                      </Link>
                      
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => void markMovieWatched(user.uid, m.tmdbId)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          <Check className="h-4 w-4" /> Já vi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmAction({
                              title: 'Remover da lista',
                              message: `Tem certeza que quer remover "${m.title}" da sua lista "Para ver"?`,
                              onConfirm: () => void removeFromToWatch(user.uid, m.tmdbId),
                            });
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'watched' && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {wl.watched.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Eye className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Nenhum filme assistido</h3>
                  <p className="mt-1 text-sm text-slate-500">Marque os filmes da sua lista como assistidos.</p>
                </div>
              ) : (
                wl.watched.map((m) => (
                  <div key={m.tmdbId} className="group relative flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
                    <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="w-24 shrink-0 bg-slate-100">
                      {m.posterPath ? (
                        <img src={posterUrl(m.posterPath, 'w185')} alt={m.title} className="h-full w-full object-cover grayscale transition duration-300 group-hover:grayscale-0" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-400">Sem Imagem</div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col justify-center p-4">
                      <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="line-clamp-2 font-bold text-slate-900 hover:text-violet-600">
                        {m.title}
                      </Link>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                          <Check className="h-3 w-3" /> Assistido
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setConfirmAction({
                              title: 'Remover dos assistidos',
                              message: `Tem certeza que quer remover "${m.title}" do seu histórico de assistidos?`,
                              onConfirm: () => void removeFromWatched(user.uid, m.tmdbId),
                            });
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel="Remover"
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
        isDestructive={true}
      />
    </AppPageShell>
  );
}

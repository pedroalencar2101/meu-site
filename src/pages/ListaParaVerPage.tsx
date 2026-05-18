import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Check,
  Film,
  Loader2,
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  BookmarkPlus,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { auth } from '../services/firebase';
import AppPageShell from '../components/AppPageShell';
import ConfirmModal from '../components/ConfirmModal';
import {
  getTmdbKey,
  posterUrl,
  tmdbGet,
  type TmdbSearchResponse,
  type TmdbMovieListItem,
  type TmdbMovieDetail,
} from '../services/tmdbClient';
import {
  addMovieToWatchlist,
  markMovieWatched,
  removeFromToWatch,
  removeFromWatched,
  setWatchlistPublic,
  subscribeUserWatchlist,
  type WatchlistState,
  type WatchlistMovie,
} from '../services/watchlist';
import { GENRE_ORDER } from '../utils/genreCategories';

const EMPTY: WatchlistState = { watchlistPublic: true, toWatch: [], watched: [] };
type Tab = 'toWatch' | 'watched';

/** Gera cor consistente para cada gênero usando hash */
function genreColor(genre: string): string {
  const colors = [
    'bg-red-100 text-red-700 border-red-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-stone-100 text-stone-700 border-stone-200',
    'bg-neutral-100 text-neutral-700 border-neutral-200',
    'bg-zinc-100 text-zinc-700 border-zinc-200',
    'bg-gray-100 text-gray-700 border-gray-200',
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = ((hash << 5) - hash) + genre.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
}

/** Agrupa filmes por gênero principal. Gêneros desconhecidos ou sem gênero vão para "Outros" */
function groupByGenre(movies: WatchlistMovie[]): Map<string, WatchlistMovie[]> {
  const groups = new Map<string, WatchlistMovie[]>();
  const orderSet = new Set(GENRE_ORDER);

  for (const movie of movies) {
    let primaryGenre = 'Outros';
    if (movie.genres && movie.genres.length > 0) {
      const raw = movie.genres[0].trim();
      if (orderSet.has(raw)) {
        primaryGenre = raw;
      } else {
        // Tenta match case-insensitive com GENRE_ORDER
        const matched = GENRE_ORDER.find((g) => g.toLowerCase() === raw.toLowerCase());
        primaryGenre = matched ?? raw; // Se não achar nem assim, usa o nome original
      }
    }
    const list = groups.get(primaryGenre) ?? [];
    list.push(movie);
    groups.set(primaryGenre, list);
  }

  // Monta resultado: GENRE_ORDER primeiro, depois o que sobrou, "Outros" por último
  const sorted = new Map<string, WatchlistMovie[]>();
  for (const g of GENRE_ORDER) {
    if (groups.has(g)) sorted.set(g, groups.get(g)!);
  }
  // Gêneros que não estão no GENRE_ORDER (vem depois)
  for (const [genre] of groups) {
    if (!sorted.has(genre) && genre !== 'Outros') sorted.set(genre, groups.get(genre)!);
  }
  if (groups.has('Outros')) sorted.set('Outros', groups.get('Outros')!);

  return sorted;
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${genreColor(genre)}`}>
      {genre}
    </span>
  );
}

function MovieCard({
  movie,
  type,
  onMarkWatched,
  onRemove,
}: {
  movie: WatchlistMovie;
  type: 'toWatch' | 'watched';
  onMarkWatched?: (tmdbId: number) => void;
  onRemove: (tmdbId: number) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:shadow-md hover:ring-slate-300 sm:gap-4 sm:px-4 sm:py-3.5">
      {/* Poster */}
      <Link
        to={`/em-cartaz/filme/${movie.tmdbId}`}
        className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm sm:h-[72px] sm:w-[52px]"
      >
        {movie.posterPath && !imgError ? (
          <img
            src={posterUrl(movie.posterPath, 'w185')}
            alt={movie.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Film className="h-5 w-5 text-slate-300" />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link
          to={`/em-cartaz/filme/${movie.tmdbId}`}
          className="line-clamp-1 text-[14px] font-semibold text-slate-800 transition-colors hover:text-indigo-600 sm:text-[15px]"
        >
          {movie.title}
        </Link>
        {movie.genres && movie.genres.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => (
              <GenreBadge key={g} genre={g} />
            ))}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <Clock className="h-3 w-3" />
          {new Date(movie.addedAt).toLocaleDateString('pt-BR')}
          {type === 'watched' && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <Check className="h-3 w-3" /> Assistido
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {type === 'toWatch' && onMarkWatched && (
          <button
            type="button"
            onClick={() => onMarkWatched(movie.tmdbId)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-all duration-200 hover:bg-emerald-100 active:scale-90 sm:h-10 sm:w-10"
            title="Marcar como assistido"
          >
            <CheckCircle className="h-[18px] w-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(movie.tmdbId)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-90 sm:h-10 sm:w-10"
          title="Remover"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

function GenreSection({
  title,
  movies,
  type,
  onMarkWatched,
  onRemove,
}: {
  title: string;
  movies: WatchlistMovie[];
  type: 'toWatch' | 'watched';
  onMarkWatched?: (tmdbId: number) => void;
  onRemove: (tmdbId: number) => void;
}) {
  const [expanded, setExpanded] = useState(movies.length <= 6);
  const color = genreColor(title);
  const dotColor = color.split(' ')[0];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-slate-50 active:scale-[0.99]"
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${dotColor} bg-opacity-60`}>
          <span className="text-[11px] font-black text-slate-600">{title.slice(0, 2)}</span>
        </span>
        <div className="flex flex-1 items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">
            {movies.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Movies */}
      {expanded && (
        <div className="flex flex-col gap-2 pl-3 sm:gap-2.5 sm:pl-9">
          {movies.map((m) => (
            <MovieCard
              key={m.tmdbId}
              movie={m}
              type={type}
              onMarkWatched={onMarkWatched}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [searchFocused, setSearchFocused] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u); setLoading(false);
      if (!u) navigate('/login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    return subscribeUserWatchlist(user.uid, (s) => { setWl(s); setHydrated(true); }, console.error);
  }, [user]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const key = getTmdbKey();
    if (!key || debounced.length < 2) return;
    let cancelled = false;
    setSearching(true);
    tmdbGet<TmdbSearchResponse>('/search/movie', { query: debounced, page: '1' })
      .then((res) => { if (!cancelled) setResults((res.results ?? []).slice(0, 10)); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Adiciona filme com gêneros vindos da TMDB
  const handleAddMovie = useCallback(async (m: TmdbMovieListItem) => {
    if (!user) return;
    try {
      let genres: string[] = [];
      try {
        const detail = await tmdbGet<TmdbMovieDetail>(`/movie/${m.id}`);
        genres = detail.genres.map((g) => g.name);
      } catch { /* fallback */ }
      await addMovieToWatchlist(user.uid, {
        tmdbId: m.id, title: m.title, posterPath: m.poster_path,
        backdropPath: m.backdrop_path ?? null, genres,
      });
      setQ(''); setDebounced(''); setResults([]);
      showToast(`"${m.title}" adicionado`, 'success');
    } catch { showToast('Erro ao adicionar', 'error'); }
  }, [user, showToast]);

  const handleMarkWatched = useCallback(async (tmdbId: number) => {
    if (!user) return;
    try { await markMovieWatched(user.uid, tmdbId); showToast('Marcado como assistido!', 'success'); }
    catch { showToast('Erro ao marcar', 'error'); }
  }, [user, showToast]);

  const handleRemove = useCallback((tmdbId: number, title: string, list: 'toWatch' | 'watched') => {
    setConfirmAction({
      title: `Remover${list === 'watched' ? ' dos assistidos' : ' da lista'}`,
      message: `Remover "${title}"${list === 'watched' ? ' do histórico' : ' da sua lista'}?`,
      onConfirm: () => {
        if (!user) return;
        if (list === 'toWatch') removeFromToWatch(user.uid, tmdbId).catch(console.error);
        else removeFromWatched(user.uid, tmdbId).catch(console.error);
        setConfirmAction(null);
        showToast('Removido', 'success');
      },
    });
  }, [user, showToast]);

  // Agrupa e filtra
  const currentMovies = activeTab === 'toWatch' ? wl.toWatch : wl.watched;
  const genreGroups = useMemo(() => groupByGenre(currentMovies), [currentMovies]);

  const filteredGenres = useMemo(() => {
    if (!genreFilter.trim()) return genreGroups;
    const search = genreFilter.toLowerCase();
    const f = new Map<string, WatchlistMovie[]>();
    for (const [genre, movies] of genreGroups) {
      if (genre.toLowerCase().includes(search)) f.set(genre, movies);
    }
    return f;
  }, [genreGroups, genreFilter]);

  const totalCount = currentMovies.length;

  if (loading || (!hydrated && user)) {
    return (
      <AppPageShell title="Lista para ver" description="Carregando..." backTo="/">
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Carregando...</p>
          </div>
        </div>
      </AppPageShell>
    );
  }

  if (!user) return null;

  return (
    <AppPageShell title="Lista para ver" description="Sua coleção de filmes" backTo="/">
      <div className="mx-auto max-w-3xl">
        {/* Toast */}
        {toast && (
          <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 sm:left-auto sm:right-4 sm:top-20 sm:translate-x-0">
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-300 sm:slide-in-from-right-4 ${toast.type === 'success' ? 'bg-emerald-600/95 text-white' : 'bg-red-600/95 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle className="h-[18px] w-[18px]" /> : <AlertTriangle className="h-[18px] w-[18px]" />}
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-200 sm:h-12 sm:w-12">
              <BookmarkPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 sm:text-xl">Minha Lista</h1>
              <p className="text-[12px] font-medium text-slate-500 sm:text-sm">
                <span className="font-semibold text-slate-700">{genreGroups.size}</span> categorias · <span className="font-semibold text-slate-700">{totalCount}</span> filmes
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 sm:h-4 sm:w-4"
              checked={wl.watchlistPublic}
              onChange={(e) => void setWatchlistPublic(user.uid, e.target.checked)}
            />
            <Eye className="h-3.5 w-3.5 text-slate-400 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Visível no perfil</span>
          </label>
        </div>

        {/* Search */}
        <div ref={searchRef} className="relative z-20 mb-4 sm:mb-6">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500 sm:left-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Pesquisar filmes para adicionar..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-10 text-[14px] font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 sm:py-4 sm:pl-12 sm:pr-11 sm:text-[15px]"
            />
            {q && (
              <button onClick={() => { setQ(''); setDebounced(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 sm:right-4">
                <X className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {(debounced.length >= 2 || searchFocused) && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              {searching ? (
                <div className="flex items-center justify-center gap-2 p-6 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Buscando...</span>
                </div>
              ) : results.length === 0 && debounced.length >= 2 ? (
                <div className="flex flex-col items-center p-8 text-center">
                  <Film className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Nenhum resultado</p>
                  <p className="text-xs text-slate-400">Tenta outro termo.</p>
                </div>
              ) : (
                <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
                  {results.map((m) => {
                    const alreadyAdded = wl.toWatch.some((x) => x.tmdbId === m.id) || wl.watched.some((x) => x.tmdbId === m.id);
                    return (
                      <li key={m.id} className="flex items-center gap-3 p-3 transition-all hover:bg-slate-50 sm:gap-4 sm:p-4">
                        <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm sm:h-[72px] sm:w-[52px]">
                          {m.poster_path ? (
                            <img src={posterUrl(m.poster_path, 'w185')} alt={m.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                              <Film className="h-5 w-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-slate-900 sm:text-[15px]">{m.title}</p>
                          <p className="text-[12px] font-medium text-slate-400 sm:text-sm">{m.release_date?.slice(0, 4) ?? '---'}</p>
                          {m.vote_average != null && m.vote_average > 0 && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 sm:text-xs">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              {m.vote_average.toFixed(1)}
                            </p>
                          )}
                          {alreadyAdded && (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                              <Check className="h-3 w-3" /> Já na lista
                            </p>
                          )}
                        </div>
                        <button
                          type="button" disabled={alreadyAdded} onClick={() => handleAddMovie(m)}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-90 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 ${
                            alreadyAdded ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md active:scale-95'
                          }`}
                        >
                          <Plus className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                          <span className="hidden text-sm font-semibold sm:inline">{alreadyAdded ? 'Adicionado' : 'Adicionar'}</span>
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
        <div className="mb-4 flex rounded-xl bg-slate-100/80 p-1 shadow-inner sm:mb-5">
          <button
            onClick={() => setActiveTab('toWatch')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-200 sm:gap-2 sm:py-3 sm:text-sm ${
              activeTab === 'toWatch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Para Ver</span>
            <span className="sm:hidden">Ver</span>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600">{wl.toWatch.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-200 sm:gap-2 sm:py-3 sm:text-sm ${
              activeTab === 'watched' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Assistidos</span>
            <span className="sm:hidden">Vistos</span>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600">{wl.watched.length}</span>
          </button>
        </div>

        {/* Genre Filter */}
        {genreGroups.size > 1 && (
          <div className="mb-4 sm:mb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                placeholder="Filtrar por categoria..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-[13px] font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        )}

        {/* Genre Sections */}
        <div className="mb-12 space-y-1">
          {filteredGenres.size === 0 ? (
            <div className="flex flex-col items-center py-16 text-center animate-in fade-in duration-300 sm:py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner sm:h-20 sm:w-20">
                <Film className="h-7 w-7 text-slate-400 sm:h-9 sm:w-9" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                {genreFilter ? 'Nenhuma categoria encontrada' : activeTab === 'toWatch' ? 'Lista vazia' : 'Nenhum assistido'}
              </h3>
              <p className="mt-1 max-w-xs text-[13px] font-medium text-slate-500 leading-relaxed sm:text-sm">
                {genreFilter ? 'Tenta outro termo de filtro.' : 'Pesquise filmes acima para começar.'}
              </p>
            </div>
          ) : (
            Array.from(filteredGenres.entries()).map(([genre, movies]) => (
              <GenreSection key={genre} title={genre} movies={movies} type={activeTab}
                onMarkWatched={handleMarkWatched}
                onRemove={(id) => handleRemove(id, movies.find((m) => m.tmdbId === id)?.title ?? '', activeTab)}
              />
            ))
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
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkPlus, Check, CheckCircle, Clock, Eye, Film, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
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
  setWatchlistPublic,
  subscribeUserWatchlist,
  type WatchlistMovie,
  type WatchlistState,
} from '../services/watchlist';

const EMPTY: WatchlistState = { watchlistPublic: true, toWatch: [], watched: [] };

type Props = { uid: string; isOwner?: boolean };

function GenreBadge({ genre }: { genre: string }) {
  const colors = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700', 'bg-slate-100 text-slate-700',
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = ((hash << 5) - hash) + genre.charCodeAt(i);
  const color = colors[Math.abs(hash) % colors.length];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${color} border-transparent`}>
      {genre}
    </span>
  );
}

function MovieRow({ movie, type, isOwner, onMarkWatched, onRemove }: {
  movie: WatchlistMovie;
  type: 'toWatch' | 'watched';
  isOwner: boolean;
  onMarkWatched?: (tmdbId: number) => void;
  onRemove: (tmdbId: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/70 transition-all hover:shadow-md hover:ring-slate-300">
      <Link to={`/em-cartaz/filme/${movie.tmdbId}`} className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-sm">
        {movie.posterPath ? (
          <img src={posterUrl(movie.posterPath, 'w185')} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center"><Film className="h-4 w-4 text-slate-300" /></div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/em-cartaz/filme/${movie.tmdbId}`} className="line-clamp-1 text-[14px] font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
          {movie.title}
        </Link>
        {movie.genres && movie.genres.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => <GenreBadge key={g} genre={g} />)}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <Clock className="h-3 w-3" />
          {new Date(movie.addedAt).toLocaleDateString('pt-BR')}
          {type === 'watched' && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <Check className="h-3 w-3" /> Assistido
            </span>
          )}
        </div>
      </div>
      {isOwner && (
        <div className="flex shrink-0 items-center gap-1">
          {type === 'toWatch' && onMarkWatched && (
            <button type="button" onClick={() => onMarkWatched(movie.tmdbId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"
              title="Marcar como assistido"
            >
              <CheckCircle className="h-[16px] w-[16px]" />
            </button>
          )}
          <button type="button" onClick={() => onRemove(movie.tmdbId)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all"
            title="Remover"
          >
            <Trash2 className="h-[16px] w-[16px]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function WatchlistHomePanel({ uid, isOwner = true }: Props) {
  const [wl, setWl] = useState<WatchlistState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<TmdbMovieListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<'toWatch' | 'watched'>('toWatch');

  useEffect(() => {
    return subscribeUserWatchlist(uid, (s) => { setWl(s); setHydrated(true); }, console.error);
  }, [uid]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!isOwner) { setResults([]); return; }
    const key = getTmdbKey();
    if (!key || debounced.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    void tmdbGet<TmdbSearchResponse>('/search/movie', { query: debounced, page: '1' })
      .then((res) => { if (!cancelled) setResults((res.results ?? []).slice(0, 8)); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debounced, isOwner]);

  const handleAddMovie = async (m: TmdbMovieListItem) => {
    let genres: string[] = [];
    try {
      const detail = await tmdbGet<TmdbMovieDetail>(`/movie/${m.id}`);
      genres = detail.genres.map((g) => g.name);
    } catch { /* fallback */ }
    await addMovieToWatchlist(uid, {
      tmdbId: m.id, title: m.title, posterPath: m.poster_path,
      backdropPath: m.backdrop_path ?? null, genres,
    });
    setQ(''); setDebounced(''); setResults([]);
  };

  const handleMarkWatched = (tmdbId: number) => void markMovieWatched(uid, tmdbId);

  const handleRemove = (tmdbId: number) => void removeFromToWatch(uid, tmdbId);

  if (!hydrated) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-32 animate-pulse bg-gradient-to-r from-slate-100 to-slate-200" />
      </div>
    );
  }

  if (!isOwner && !wl.watchlistPublic) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
        <Film className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-bold text-slate-800">Lista privada</p>
        <p className="mt-2 text-xs font-medium text-slate-500">Este utilizador não mostra a lista no perfil.</p>
      </div>
    );
  }

  const currentMovies = tab === 'toWatch' ? wl.toWatch : wl.watched;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-800 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Lista para ver</h2>
              <p className="text-xs text-indigo-200 font-medium">
                {isOwner ? 'Adiciona e organiza os teus filmes.' : 'Filmes que planeia ver.'}
              </p>
            </div>
          </div>
          {isOwner && (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-indigo-100">
              <input type="checkbox" className="h-3 w-3 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-400"
                checked={wl.watchlistPublic}
                onChange={(e) => void setWatchlistPublic(uid, e.target.checked)}
              />
              <Eye className="h-3 w-3" />
              Visível
            </label>
          )}
        </div>

        {/* Search */}
        {isOwner && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar filmes (TMDB)..."
              className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-10 pr-9 text-sm font-medium text-white outline-none placeholder:text-indigo-200 focus:ring-2 focus:ring-white/30"
            />
            {q && (
              <button onClick={() => { setQ(''); setDebounced(''); setResults([]); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {searching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
              </div>
            )}
          </div>
        )}

        {/* Search results */}
        {debounced.length >= 2 && results.length > 0 && (
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm">
            {results.map((m) => {
              const already = wl.toWatch.some((x) => x.tmdbId === m.id) || wl.watched.some((x) => x.tmdbId === m.id);
              return (
                <div key={m.id} className="flex items-center gap-2 px-2.5 py-2.5 border-b border-white/10 last:border-b-0">
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-slate-800">
                    {m.poster_path ? (
                      <img src={posterUrl(m.poster_path, 'w185')} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[8px] text-slate-500">—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{m.title}</p>
                    <p className="text-[10px] text-indigo-200">{m.release_date?.slice(0, 4) ?? '—'}</p>
                  </div>
                  <button type="button" disabled={already} onClick={() => handleAddMovie(m)}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                      already ? 'bg-white/10 text-indigo-300 cursor-not-allowed' : 'bg-indigo-400 text-white hover:bg-indigo-300'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    {already ? 'Na lista' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/60 px-1">
        <button onClick={() => setTab('toWatch')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all ${
            tab === 'toWatch' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Para ver
          <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">{wl.toWatch.length}</span>
        </button>
        <button onClick={() => setTab('watched')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-all ${
            tab === 'watched' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Assistidos
          <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">{wl.watched.length}</span>
        </button>
      </div>

      {/* Movie list */}
      <div className="max-h-[340px] overflow-y-auto p-3 sm:p-4">
        {currentMovies.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Film className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-500">{tab === 'toWatch' ? 'Lista vazia' : 'Nenhum assistido'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isOwner ? (tab === 'toWatch' ? 'Pesquisa filmes acima.' : 'Marca filmes como assistidos.') : 'Sem filmes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentMovies.map((m) => (
              <MovieRow key={m.tmdbId} movie={m} type={tab} isOwner={isOwner}
                onMarkWatched={handleMarkWatched}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {isOwner && !getTmdbKey() && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
          Define <code className="rounded bg-amber-100 px-1">VITE_TMDB_API_KEY</code> para pesquisar.
        </p>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Film, Loader2, Plus, Search } from 'lucide-react';
import {
  getTmdbKey,
  posterUrl,
  backdropUrl,
  tmdbGet,
  type TmdbSearchResponse,
  type TmdbMovieListItem,
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

type Props = { uid: string; /** Dono da lista: pesquisa, editar e privacidade. Visitante só vê se for pública. */ isOwner?: boolean };

function MovieBannerStrip({ m, dimmed }: { m: WatchlistMovie; dimmed?: boolean }) {
  if (m.backdropPath) {
    return (
      <div
        className={`relative h-[4.5rem] w-full shrink-0 overflow-hidden rounded-lg bg-slate-800 ${dimmed ? 'opacity-90' : ''}`}
      >
        <img src={backdropUrl(m.backdropPath)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        <p className="absolute bottom-1.5 left-2 right-2 truncate text-[11px] font-bold text-white drop-shadow-md">{m.title}</p>
      </div>
    );
  }
  return (
    <div className="flex h-14 shrink-0 gap-2">
      <div className="h-14 w-10 overflow-hidden rounded-lg bg-slate-200">
        {m.posterPath ? (
          <img src={posterUrl(m.posterPath, 'w92')} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] font-bold text-slate-500">—</div>
        )}
      </div>
      <p className="min-w-0 flex-1 self-center line-clamp-2 text-xs font-bold text-slate-900">{m.title}</p>
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

  useEffect(() => {
    return subscribeUserWatchlist(
      uid,
      (s) => {
        setWl(s);
        setHydrated(true);
      },
      console.error
    );
  }, [uid]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!isOwner) {
      setResults([]);
      return;
    }
    const key = getTmdbKey();
    if (!key || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
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
    };
  }, [debounced, isOwner]);

  if (!hydrated) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
        <div className="h-44 animate-pulse bg-gradient-to-r from-slate-200 to-violet-100" />
        <div className="grid h-48 grid-cols-2 gap-px bg-slate-100 p-4">
          <div className="animate-pulse rounded-lg bg-white" />
          <div className="animate-pulse rounded-lg bg-white" />
        </div>
      </div>
    );
  }

  if (!isOwner && !wl.watchlistPublic) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
        <Film className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-bold text-slate-800">Lista de filmes privada</p>
        <p className="mt-2 text-xs font-medium text-slate-500">Este utilizador optou por não mostrar a lista no perfil.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-violet-900 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">Lista para ver</h2>
              <p className="text-xs font-medium text-violet-100">
                {isOwner ? 'Adiciona filmes e marca quando assistires.' : 'Filmes que planeia ver e já viu.'}
              </p>
            </div>
          </div>
          {isOwner && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-violet-50">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-violet-300 text-amber-500 focus:ring-amber-400"
                checked={wl.watchlistPublic}
                onChange={(e) => void setWatchlistPublic(uid, e.target.checked)}
              />
              Visível no perfil
            </label>
          )}
        </div>
        {isOwner && (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar filme (TMDB)…"
                className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-10 pr-3 text-sm font-medium text-white outline-none ring-white/30 placeholder:text-violet-200 focus:ring-2"
              />
            </div>
            {debounced.length >= 2 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-black/20">
                {searching ? (
                  <p className="flex items-center gap-2 px-3 py-3 text-xs text-violet-100">
                    <Loader2 className="h-4 w-4 animate-spin" /> A pesquisar…
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-violet-100">Sem resultados.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {results.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 px-2 py-2">
                        <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-slate-800">
                          {m.poster_path ? (
                            <img src={posterUrl(m.poster_path, 'w92')} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[8px] text-slate-500">—</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{m.title}</p>
                          <p className="text-[10px] text-violet-200">{m.release_date?.slice(0, 4) ?? '—'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void addMovieToWatchlist(uid, {
                              tmdbId: m.id,
                              title: m.title,
                              posterPath: m.poster_path,
                              backdropPath: m.backdrop_path ?? null,
                            })
                          }
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-900 hover:bg-amber-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Lista
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid gap-0 sm:grid-cols-2">
        <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">A ver</h3>
          <ul className="mt-3 max-h-[22rem] space-y-3 overflow-y-auto">
            {wl.toWatch.length === 0 ? (
              <li className="text-sm text-slate-500">{isOwner ? 'Nada na lista. Pesquisa acima.' : 'Sem filmes na fila.'}</li>
            ) : (
              wl.toWatch.map((m: WatchlistMovie) => (
                <li key={m.tmdbId} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 shadow-sm">
                  <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="block p-2 pb-1">
                    <MovieBannerStrip m={m} />
                  </Link>
                  {isOwner && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100/80 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => void markMovieWatched(uid, m.tmdbId)}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3 w-3" />
                        Já vi
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeFromToWatch(uid, m.tmdbId)}
                        className="text-[10px] font-bold text-slate-500 underline"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Já vi</h3>
          <ul className="mt-3 max-h-[22rem] space-y-3 overflow-y-auto">
            {wl.watched.length === 0 ? (
              <li className="text-sm text-slate-500">Ainda sem histórico.</li>
            ) : (
              wl.watched.map((m) => (
                <li key={`${m.tmdbId}-${m.addedAt}`} className="overflow-hidden rounded-xl border border-slate-100 bg-white opacity-95 shadow-sm">
                  <Link to={`/em-cartaz/filme/${m.tmdbId}`} className="block p-2">
                    <MovieBannerStrip m={m} dimmed />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      {isOwner && !getTmdbKey() && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
          Define <code className="rounded bg-amber-100 px-1">VITE_TMDB_API_KEY</code> para pesquisar filmes.
        </p>
      )}
    </div>
  );
}

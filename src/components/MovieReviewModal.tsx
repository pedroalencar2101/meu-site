import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Film, Loader2, Star, ChevronLeft, ChevronRight, Calendar, Clapperboard } from 'lucide-react';
import { tmdbGet, posterUrl, type TmdbMovieListItem, type TmdbSearchResponse } from '../services/tmdbClient';

export type SelectedMovie = {
  id: number;
  title: string;
  poster: string | null;
  year: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (movie: SelectedMovie) => void;
};

export default function MovieReviewModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<TmdbMovieListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Search TMDB when debouncedQuery changes
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      // eslint-disable-next-line react-compiler/react-compiler
      setResults([]);
      setTotalPages(1);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setPage(1);

    tmdbGet<TmdbSearchResponse>('/search/movie', { query: q, page: '1' })
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
          setTotalPages(Math.min(data.total_pages, 10));
        }
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const loadPage = useCallback(async (p: number) => {
    if (!debouncedQuery.trim()) return;
    setSearching(true);
    setPage(p);
    try {
      const data = await tmdbGet<TmdbSearchResponse>('/search/movie', { query: debouncedQuery, page: String(p) });
      setResults(data.results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [debouncedQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-4">
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-50 shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        {/* Header com gradiente escuro */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Clapperboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Escolher filme</h2>
              <p className="text-[12px] text-white/60 font-medium">Pesquisa TMDB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-all hover:bg-white/10 hover:text-white active:scale-90"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-5 pt-4 pb-2 sm:px-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar filmes..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-[15px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 focus:shadow-md"
            />
            {searching && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                <Loader2 className="h-4.5 w-4.5 animate-spin text-slate-400" />
              </div>
            )}
            {!searching && query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
          {results.length > 0 ? (
            <div className="space-y-2 pt-1">
              {results.map((movie) => {
                const votePct = movie.vote_average ? Math.round(movie.vote_average * 10) : null;
                const year = movie.release_date?.slice(0, 4) ?? null;

                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => {
                      onSelect({
                        id: movie.id,
                        title: movie.title,
                        poster: movie.poster_path,
                        year: year ?? '',
                      });
                      handleClose();
                    }}
                    className="group relative flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0"
                  >
                    {/* Poster */}
                    <div className="h-[76px] w-[52px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm ring-1 ring-black/5">
                      {movie.poster_path ? (
                        <img
                          src={posterUrl(movie.poster_path, 'w185')}
                          alt={movie.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-6 w-6 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                        {movie.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-medium">
                        {year && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {year}
                          </span>
                        )}
                        {votePct !== null && votePct > 0 && (
                          <span className={`inline-flex items-center gap-0.5 font-bold ${
                            votePct >= 70 ? 'text-green-600' : votePct >= 50 ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            <Star className={`h-3 w-3 ${
                              votePct >= 70 ? 'fill-green-500 text-green-500' : votePct >= 50 ? 'fill-amber-500 text-amber-500' : ''
                            }`} />
                            {votePct}%
                          </span>
                        )}
                      </div>
                      {movie.overview && (
                        <p className="mt-1.5 text-[12px] text-slate-400 line-clamp-1 leading-relaxed">
                          {movie.overview}
                        </p>
                      )}
                    </div>

                    {/* Select indicator */}
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-300 transition-all group-hover:border-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50">
                      <ChevronRight className="h-4.5 w-4.5" />
                    </div>
                  </button>
                );
              })}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4 pb-1">
                  <button
                    type="button"
                    disabled={page <= 1 || searching}
                    onClick={() => loadPage(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === page;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          disabled={searching}
                          onClick={() => loadPage(pageNum)}
                          className={`h-8 min-w-[2rem] rounded-lg text-[12px] font-bold transition-all ${
                            isActive
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && (
                      <span className="text-[12px] font-bold text-slate-400 px-1">...</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={page >= totalPages || searching}
                    onClick={() => loadPage(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : debouncedQuery && !searching ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Film className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-700">Nenhum filme encontrado</p>
              <p className="mt-1 text-sm font-medium text-slate-400">Tenta outro termo de pesquisa.</p>
            </div>
          ) : !debouncedQuery ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
                <Search className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-base font-bold text-slate-700">Pesquisar filmes</p>
              <p className="mt-1 text-sm font-medium text-slate-400">Digita o nome de um filme para começar.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ação</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Comédia</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Drama</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Terror</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
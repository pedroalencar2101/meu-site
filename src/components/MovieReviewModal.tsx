import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Film, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, handleClose]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Limpa resultados quando vazio
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotalPages(1);
    }
  }, [debouncedQuery]);

  // Pesquisa TMDB
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    let cancelled = false;
    setSearching(true);
    setPage(1);
    tmdbGet<TmdbSearchResponse>('/search/movie', { query: debouncedQuery, page: '1' })
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
          setTotalPages(Math.min(data.total_pages, 10));
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setSearching(false); });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Escolher filme</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Busca */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar filmes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-[15px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            />
            {searching && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {/* Resultados */}
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => {
                    onSelect({
                      id: movie.id,
                      title: movie.title,
                      poster: movie.poster_path,
                      year: movie.release_date?.slice(0, 4) ?? '',
                    });
                    handleClose();
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-slate-50 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
                    {movie.poster_path ? (
                      <img
                        src={posterUrl(movie.poster_path, 'w185')}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Film className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-slate-800 group-hover:text-slate-900">
                      {movie.title}
                    </p>
                    {movie.release_date && (
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {movie.release_date.slice(0, 4)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-slate-300 transition-all group-hover:text-slate-500">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </button>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    disabled={page <= 1 || searching}
                    onClick={() => loadPage(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 active:scale-90"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-500">{page} / {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages || searching}
                    onClick={() => loadPage(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 active:scale-90"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : debouncedQuery && !searching ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Film className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Nenhum filme encontrado</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Tenta outro termo de pesquisa.</p>
            </div>
          ) : !debouncedQuery ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Pesquisar filmes</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Digita o nome de um filme para começar.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
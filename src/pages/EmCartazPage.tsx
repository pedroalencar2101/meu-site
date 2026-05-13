import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Film, Loader2, Search, Sparkles } from 'lucide-react';
import { getTmdbKey, posterUrl, tmdbGet, type TmdbMovieListItem, type TmdbSearchResponse } from '../services/tmdbClient';
import MobileBottomNav from '../components/MobileBottomNav';

function MovieCard({ m }: { m: TmdbMovieListItem }) {
  return (
    <Link
      to={`/em-cartaz/filme/${m.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-200">
        {m.poster_path ? (
          <img
            src={posterUrl(m.poster_path, 'w342')}
            alt={m.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-300">
            <Film className="h-10 w-10 text-slate-500" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h2 className="line-clamp-2 text-sm font-bold text-slate-900">{m.title}</h2>
        {m.release_date && <p className="mt-1 text-xs text-slate-500">{m.release_date.slice(0, 4)}</p>}
        {m.vote_average != null && (
          <p className="mt-1 text-xs font-bold text-amber-600">TMDB {m.vote_average.toFixed(1)}</p>
        )}
      </div>
    </Link>
  );
}

export default function EmCartazPage() {
  const hasKey = !!getTmdbKey();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  const [nowPlaying, setNowPlaying] = useState<TmdbMovieListItem[]>([]);
  const [trending, setTrending] = useState<TmdbMovieListItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [searchResults, setSearchResults] = useState<TmdbMovieListItem[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 380);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!hasKey) {
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [np, tr] = await Promise.all([
          tmdbGet<{ results: TmdbMovieListItem[] }>('/movie/now_playing', { page: '1', region: 'BR' }),
          tmdbGet<{ results: TmdbMovieListItem[] }>('/trending/movie/week', { page: '1' }),
        ]);
        if (cancelled) return;
        setNowPlaying((np.results ?? []).slice(0, 18));
        setTrending((tr.results ?? []).slice(0, 18));
      } catch {
        if (!cancelled) setSearchErr('Erro ao carregar catálogo TMDB.');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasKey]);

  const runSearch = useCallback(
    async (page: number, append: boolean) => {
      if (!hasKey || !debounced) return;
      setSearchLoading(true);
      setSearchErr(null);
      try {
        const data = await tmdbGet<TmdbSearchResponse>('/search/movie', {
          query: debounced,
          page: String(page),
          include_adult: 'false',
        });
        setSearchTotalPages(Math.min(data.total_pages ?? 1, 500));
        const chunk = data.results ?? [];
        setSearchResults((prev) => {
          const base = append ? prev : [];
          const seen = new Set(base.map((m) => m.id));
          const merged = [...base];
          for (const m of chunk) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              merged.push(m);
            }
          }
          return merged;
        });
        setSearchPage(data.page ?? page);
      } catch {
        setSearchErr('Falha na pesquisa. Tenta outro termo.');
        if (!append) setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [debounced, hasKey]
  );

  useEffect(() => {
    if (!hasKey) return;
    if (!debounced) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchTotalPages(1);
      return;
    }
    setSearchPage(1);
    void runSearch(1, false);
  }, [debounced, hasKey, runSearch]);

  const loadMoreSearch = () => {
    if (searchLoading || searchPage >= searchTotalPages) return;
    void runSearch(searchPage + 1, true);
  };

  const showSearch = debounced.length > 0;

  const nowPlayingIds = useMemo(() => new Set(nowPlaying.map((m) => m.id)), [nowPlaying]);
  const trendingFiltered = useMemo(
    () => trending.filter((m) => !nowPlayingIds.has(m.id)),
    [trending, nowPlayingIds]
  );

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Início">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Film className="h-7 w-7 text-slate-600" />
            <div>
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">Filmes</h1>
              <p className="text-xs font-medium text-slate-500">Pesquisa TMDB · avaliações na Noctal</p>
            </div>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar qualquer filme…"
              autoComplete="off"
              className="w-full rounded-full border border-slate-200 bg-[#f0f2f5] py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {!hasKey && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Define <code className="rounded bg-red-100 px-1">VITE_TMDB_API_KEY</code> no ficheiro <code className="rounded bg-red-100 px-1">.env</code> e reinicia o servidor.
          </div>
        )}

        {hasKey && showSearch && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <Search className="h-4 w-4" /> Resultados da pesquisa
            </h2>
            {searchErr && <p className="mb-4 text-sm text-red-700">{searchErr}</p>}
            {searchLoading && searchResults.length === 0 && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && !searchErr && (
              <p className="py-10 text-center text-sm text-slate-600">Nenhum filme encontrado.</p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {searchResults.map((m) => (
                <MovieCard key={m.id} m={m} />
              ))}
            </div>
            {searchResults.length > 0 && searchPage < searchTotalPages && (
              <button
                type="button"
                onClick={loadMoreSearch}
                disabled={searchLoading}
                className="mx-auto mt-8 flex rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {searchLoading ? 'A carregar…' : 'Carregar mais resultados'}
              </button>
            )}
          </section>
        )}

        {hasKey && !showSearch && (
          <>
            <section className="mb-12">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <Film className="h-4 w-4" /> Em cartaz (Brasil)
              </h2>
              {catalogLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-slate-200" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {nowPlaying.map((m) => (
                    <MovieCard key={m.id} m={m} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <Sparkles className="h-4 w-4" /> Tendências · repositório TMDB
              </h2>
              {catalogLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-slate-200" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {trendingFiltered.map((m) => (
                    <MovieCard key={m.id} m={m} />
                  ))}
                </div>
              )}
              <p className="mt-6 text-center text-xs text-slate-500">
                Usa a pesquisa em cima para encontrar qualquer título do catálogo TMDB. Clica num filme para ver detalhes e avaliações da comunidade.
              </p>
            </section>
          </>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}

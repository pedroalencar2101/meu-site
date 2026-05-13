const BASE = 'https://api.themoviedb.org/3';

export function getTmdbKey(): string | undefined {
  const k = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  return k?.trim() || undefined;
}

export async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getTmdbKey();
  if (!key) throw new Error('Defina VITE_TMDB_API_KEY no .env');
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set('api_key', key);
  u.searchParams.set('language', 'pt-BR');
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

export type TmdbMovieListItem = {
  id: number;
  title: string;
  poster_path: string | null;
  overview?: string;
  release_date?: string;
  vote_average?: number;
};

export type TmdbSearchResponse = {
  results: TmdbMovieListItem[];
  page: number;
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetail = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
};

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(path: string | null): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/w1280${path}`;
}

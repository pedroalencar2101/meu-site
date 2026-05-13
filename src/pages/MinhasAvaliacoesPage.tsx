import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Film, Loader2, Star, Trash2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { deleteMovieReview, subscribeMyMovieReviews } from '../services/movieReviews';
import type { MovieReview } from '../types/movieReview';
import AppPageShell from '../components/AppPageShell';
import { formatPostTime } from '../utils/formatPostTime';
import { getTmdbKey, posterUrl, tmdbGet, type TmdbMovieDetail } from '../services/tmdbClient';

function displayTitle(r: MovieReview, resolved: Record<number, { title: string }>): string {
  const t = r.movieTitle?.trim();
  if (t) return t;
  return resolved[r.tmdbId]?.title?.trim() || `Filme #${r.tmdbId}`;
}

function displayPoster(r: MovieReview, resolved: Record<number, { poster: string | null }>): string | null {
  if (r.moviePosterPath) return r.moviePosterPath;
  const p = resolved[r.tmdbId]?.poster;
  return p ?? null;
}

export default function MinhasAvaliacoesPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<number, { title: string; poster: string | null }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setReviews([]);
      setListErr(null);
      return;
    }
    setListErr(null);
    return subscribeMyMovieReviews(
      user.uid,
      (list) => setReviews(list),
      (e) => setListErr(e.message)
    );
  }, [user]);

  const tmdbKey = getTmdbKey();
  const missingIdsKey = useMemo(() => {
    const ids = [...new Set(reviews.filter((r) => !r.movieTitle?.trim()).map((r) => r.tmdbId))].sort((a, b) => a - b);
    return ids.join(',');
  }, [reviews]);

  useEffect(() => {
    if (!tmdbKey || !missingIdsKey) return;
    const ids = missingIdsKey.split(',').map(Number).filter((n) => Number.isFinite(n));
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const id of ids.slice(0, 20)) {
        if (cancelled) break;
        try {
          const d = await tmdbGet<TmdbMovieDetail>(`/movie/${id}`);
          if (cancelled) break;
          setResolved((prev) => ({
            ...prev,
            [id]: { title: d.title, poster: d.poster_path },
          }));
        } catch {
          /* ignorar falhas individuais */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingIdsKey, tmdbKey]);

  return (
    <AppPageShell
      title="Minhas avaliações"
      description="Filmes que classificaste na comunidade Noctal."
    >
      {!user ? (
        <p className="text-center text-sm font-medium text-slate-500">Inicia sessão para veres as tuas avaliações.</p>
      ) : listErr ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          Não foi possível carregar a lista ({listErr}). Confirma o índice composto no Firestore para{' '}
          <code className="rounded bg-red-100 px-1">movieReviews</code>: authorId + updatedAt.
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-inner">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Film className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-lg font-black text-slate-900">Ainda sem avaliações</h2>
          <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-600">
            Explora filmes em cartaz, partilha a tua opinião com estrelas e texto — tudo aparece aqui automaticamente.
          </p>
          <Link
            to="/em-cartaz"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            Ir para Em cartaz
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => {
            const title = displayTitle(r, resolved);
            const posterPath = displayPoster(r, resolved);
            const when = r.updatedAt ?? r.createdAt;
            return (
              <li
                key={r.id}
                className="flex gap-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:border-amber-200/80 hover:shadow-md"
              >
                <Link
                  to={`/em-cartaz/filme/${r.tmdbId}`}
                  className="group flex min-w-0 flex-1 gap-4"
                >
                  <div className="relative h-28 w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-inner">
                    {posterPath ? (
                      <img
                        src={posterUrl(posterPath, 'w185')}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Film className="h-8 w-8 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-black leading-snug text-slate-900">{title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${r.stars} estrelas`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-current' : 'text-slate-300'}`} />
                        ))}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {when ? formatPostTime(when) : '—'}
                      </span>
                    </div>
                    {r.text?.trim() ? (
                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">{r.text.trim()}</p>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-slate-400">Sem texto — toca para editar na ficha do filme.</p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  disabled={deletingId === r.id || !user}
                  className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  aria-label={`Apagar avaliação: ${title}`}
                  onClick={() => {
                    if (!user) return;
                    if (!window.confirm(`Apagar a tua avaliação de «${title}»? Isto remove também a publicação no feed.`)) return;
                    setDeletingId(r.id);
                    void deleteMovieReview(r.tmdbId, user.uid)
                      .catch((err) => {
                        console.error(err);
                        alert('Não foi possível apagar a avaliação.');
                      })
                      .finally(() => setDeletingId(null));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!tmdbKey && reviews.some((r) => !r.movieTitle?.trim()) && (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Define <code className="rounded bg-amber-100 px-1">VITE_TMDB_API_KEY</code> para carregar títulos de avaliações antigas.
        </p>
      )}
    </AppPageShell>
  );
}

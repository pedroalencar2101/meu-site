import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Film, Loader2, Star, Trash2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { backdropUrl, posterUrl, tmdbGet, type TmdbMovieDetail } from '../services/tmdbClient';
import type { MovieEmbed } from '../types/feed';
import type { MovieReview } from '../types/movieReview';
import {
  communityStatsFromReviews,
  deleteMovieReview,
  getMyMovieReview,
  saveMovieReview,
  setReviewFeedPostId,
  subscribeMovieReviews,
} from '../services/movieReviews';
import { createPost, deletePost } from '../services/feedPosts';
import { formatPostTime } from '../utils/formatPostTime';

function yearFromRelease(date: string | undefined): string {
  if (!date) return '—';
  return date.slice(0, 4) || '—';
}

function runtimeLabel(min: number | null | undefined): string {
  if (min == null || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function pickFeatured(list: MovieReview[]): MovieReview[] {
  return [...list]
    .sort((a, b) => {
      if (b.stars !== a.stars) return b.stars - a.stars;
      const tb = a.createdAt?.toMillis?.() ?? 0;
      const ta = b.createdAt?.toMillis?.() ?? 0;
      return ta - tb;
    })
    .slice(0, 6);
}

function movieEmbedFromReviewContext(
  movie: TmdbMovieDetail | null,
  stars: number,
  fallbackTitle: string,
  fallbackPosterPath: string | null | undefined
): MovieEmbed {
  const title = movie?.title?.trim() || fallbackTitle.trim() || 'Filme';
  const year = yearFromRelease(movie?.release_date);
  const genre = movie?.genres?.[0]?.name ?? 'Filme';
  const path = movie?.poster_path ?? fallbackPosterPath ?? null;
  const poster =
    posterUrl(path, 'w500') ||
    'https://placehold.co/72x108/1e293b/94a3b8?text=Filme';
  return { title, year, genre, poster, rating: stars };
}

export default function MovieDetailPage() {
  const { tmdbId: rawId } = useParams<{ tmdbId: string }>();
  const tmdbId = rawId ? Number.parseInt(rawId, 10) : NaN;

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [movie, setMovie] = useState<TmdbMovieDetail | null>(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieErr, setMovieErr] = useState<string | null>(null);

  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Documento em `movieReviews` existe (não depender só da lista em tempo real). */
  const [hasMyReviewSaved, setHasMyReviewSaved] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setMovieLoading(false);
      setMovieErr('Filme inválido.');
      return;
    }
    let cancelled = false;
    setMovieLoading(true);
    setMovieErr(null);
    tmdbGet<TmdbMovieDetail>(`/movie/${tmdbId}`)
      .then((data) => {
        if (!cancelled) setMovie(data);
      })
      .catch(() => {
        if (!cancelled) setMovieErr('Não foi possível carregar o filme.');
      })
      .finally(() => {
        if (!cancelled) setMovieLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  useEffect(() => {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return;
    return subscribeMovieReviews(
      tmdbId,
      setReviews,
      (e) => setReviewsErr(e.message)
    );
  }, [tmdbId]);

  useEffect(() => {
    if (!user || !Number.isFinite(tmdbId) || tmdbId <= 0) {
      setHasMyReviewSaved(false);
      return;
    }
    let cancelled = false;
    getMyMovieReview(tmdbId, user.uid).then((mine) => {
      if (cancelled) return;
      if (mine) {
        setHasMyReviewSaved(true);
        setStars(Math.min(5, Math.max(1, mine.stars)));
        setComment(mine.text);
      } else {
        setHasMyReviewSaved(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, tmdbId]);

  const stats = useMemo(() => communityStatsFromReviews(reviews), [reviews]);
  const featured = useMemo(() => pickFeatured(reviews), [reviews]);

  const displayName = user?.displayName || user?.email || 'Utilizador';

  async function onSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !Number.isFinite(tmdbId) || tmdbId <= 0) return;
    setSaving(true);
    try {
      const prev = await getMyMovieReview(tmdbId, user.uid);
      await saveMovieReview({
        tmdbId,
        uid: user.uid,
        displayName,
        photoURL: user.photoURL,
        stars,
        text: comment,
        movieTitle: movie?.title,
        moviePosterPath: movie?.poster_path ?? null,
      });

      if (prev?.feedPostId) {
        try {
          await deletePost(prev.feedPostId, user.uid);
        } catch (delErr) {
          console.error(delErr);
        }
      }

      const embed = movieEmbedFromReviewContext(
        movie,
        stars,
        movie?.title ?? prev?.movieTitle ?? 'Filme',
        movie?.poster_path ?? prev?.moviePosterPath ?? null
      );
      const trimmed = comment.trim();
      const titleLine = movie?.title ?? prev?.movieTitle ?? 'este filme';
      const content = trimmed.length > 0 ? trimmed : `Avaliei «${titleLine}» com ${stars}/5.`;

      const postId = await createPost({
        uid: user.uid,
        displayName,
        photoURL: user.photoURL,
        content,
        movie: embed,
      });
      try {
        await setReviewFeedPostId(tmdbId, user.uid, postId);
      } catch (linkErr) {
        try {
          await deletePost(postId, user.uid);
        } catch {
          /* ignora */
        }
        throw linkErr;
      }
      setHasMyReviewSaved(true);
    } catch (err) {
      console.error(err);
      alert('Não foi possível guardar a avaliação. Verifica as regras do Firestore (coleção movieReviews).');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteMine() {
    if (!user || !Number.isFinite(tmdbId) || tmdbId <= 0) return;
    if (!window.confirm('Remover a tua avaliação deste filme?')) return;
    setDeleting(true);
    try {
      await deleteMovieReview(tmdbId, user.uid);
      setHasMyReviewSaved(false);
      setComment('');
      setStars(5);
    } catch (err) {
      console.error(err);
      alert('Não foi possível apagar.');
    } finally {
      setDeleting(false);
    }
  }

  const mine = user ? reviews.find((r) => r.authorId === user.uid) : undefined;

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] p-6 font-sans">
        <p className="text-slate-700">ID inválido.</p>
        <Link to="/em-cartaz" className="mt-4 inline-block text-sm font-bold text-slate-900">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link to="/em-cartaz" className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Film className="h-5 w-5 text-slate-500" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-black uppercase tracking-wide text-slate-900">
              {movie?.title ?? 'Filme'}
            </h1>
            <p className="text-xs text-slate-500">Detalhes · avaliações Noctal</p>
          </div>
        </div>
      </header>

      {movieLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
        </div>
      )}

      {!movieLoading && movieErr && (
        <div className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-slate-700">{movieErr}</p>
          <Link to="/em-cartaz" className="mt-4 inline-block text-sm font-bold text-slate-900 underline">
            Voltar
          </Link>
        </div>
      )}

      {!movieLoading && movie && !movieErr && (
        <>
          <div
            className="relative h-48 w-full overflow-hidden bg-slate-900 sm:h-64 md:h-80"
            style={{
              backgroundImage: movie.backdrop_path ? `url(${backdropUrl(movie.backdrop_path)})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          </div>

          <main className="mx-auto max-w-4xl -mt-16 px-4 pb-16 relative z-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              {movie.poster_path ? (
                <img
                  src={posterUrl(movie.poster_path, 'w500')}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="mx-auto w-44 flex-shrink-0 overflow-hidden rounded-xl border border-white/20 shadow-2xl md:mx-0 md:w-52"
                />
              ) : (
                <div className="mx-auto flex h-64 w-44 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-slate-800 shadow-2xl md:mx-0 md:h-72 md:w-52">
                  <Film className="h-14 w-14 text-slate-500" />
                </div>
              )}
              <div className="flex-1 text-center md:pb-2 md:text-left">
                <h2 className="text-2xl font-black text-white drop-shadow md:text-3xl">{movie.title}</h2>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {yearFromRelease(movie.release_date)} · {runtimeLabel(movie.runtime)} ·{' '}
                  {movie.genres?.map((g) => g.name).join(', ') || '—'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    TMDB {movie.vote_average?.toFixed(1) ?? '—'}/10 · {movie.vote_count ?? 0} votos globais
                  </span>
                  <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-black text-slate-900 shadow">
                    Noctal {stats.average != null ? `${stats.average}/5` : '—'} · {stats.count}{' '}
                    {stats.count === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-8 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{movie.overview || 'Sem sinopse.'}</p>

            {reviewsErr && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {reviewsErr} — se for índice em falta, cria o índice composto sugerido na consola do Firebase.
              </div>
            )}

            {featured.length > 0 && (
              <section className="mt-10">
                <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Principais avaliações</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {featured.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xs font-bold text-white">
                          {r.authorAvatar ? (
                            <img src={r.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            r.authorInitials
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{r.authorName}</span>
                            <span className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-current' : 'text-slate-300'}`} />
                              ))}
                            </span>
                          </div>
                          {r.text ? <p className="mt-2 text-sm text-slate-700">{r.text}</p> : null}
                          <p className="mt-2 text-xs text-slate-400">{formatPostTime(r.createdAt)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">A tua avaliação</h3>
              {!user ? (
                <p className="mt-2 text-sm text-slate-600">Inicia sessão para avaliar.</p>
              ) : (
                <form className="mt-4 space-y-4" onSubmit={onSubmitReview}>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">Estrelas (1 a 5)</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setStars(n)}
                          className="rounded-lg p-1 text-amber-400 transition-transform hover:scale-110"
                          aria-label={`${n} estrelas`}
                        >
                          <Star className={`h-9 w-9 ${n <= stars ? 'fill-current' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="movie-review-comment" className="mb-2 block text-xs font-bold uppercase text-slate-500">
                      Comentário (opcional)
                    </label>
                    <textarea
                      id="movie-review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="O que achaste do filme?"
                      className="w-full rounded-xl border border-slate-200 bg-[#f0f2f5] px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saving ? 'A guardar…' : hasMyReviewSaved ? 'Atualizar avaliação' : 'Publicar avaliação'}
                    </button>
                    {hasMyReviewSaved && (
                      <button
                        type="button"
                        onClick={() => void onDeleteMine()}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? 'A apagar…' : 'Apagar a minha avaliação'}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            <section className="mt-10">
              <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-500">
                Todas as avaliações ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
                  Ainda não há avaliações da comunidade. Sê o primeiro.
                </p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {r.authorAvatar ? (
                            <img src={r.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            r.authorInitials
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{r.authorName}</span>
                            <span className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-current' : 'text-slate-300'}`} />
                              ))}
                            </span>
                            {user?.uid === r.authorId && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                                Tu
                              </span>
                            )}
                          </div>
                          {r.text ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.text}</p> : null}
                          <p className="mt-2 text-xs text-slate-400">{formatPostTime(r.createdAt)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </>
      )}
    </div>
  );
}

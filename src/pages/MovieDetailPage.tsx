import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock,
  Film,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import ConfirmModal from '../components/ConfirmModal';
import MobileBottomNav from '../components/MobileBottomNav';
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
import {
  addMovieToWatchlist,
  removeFromToWatch,
  subscribeUserWatchlist,
} from '../services/watchlist';

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

function StarRow({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${cls} ${i < value ? 'fill-current' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

function ReviewCard({ review, isMine }: { review: MovieReview; isMine?: boolean }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/5 blur-2xl" />
      <div className="relative flex items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white ring-2 ring-white shadow-md sm:h-12 sm:w-12">
          {review.authorAvatar ? (
            <img src={review.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            review.authorInitials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">{review.authorName}</span>
            <StarRow value={review.stars} />
            {isMine && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                Tu
              </span>
            )}
          </div>
          {review.text ? (
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{review.text}</p>
          ) : null}
          <p className="mt-2.5 text-xs font-medium text-slate-400">{formatPostTime(review.createdAt)}</p>
        </div>
      </div>
    </article>
  );
}

function ScoreCard({
  label,
  sublabel,
  value,
  accent,
}: {
  label: string;
  sublabel: string;
  value: string;
  accent: 'sky' | 'amber';
}) {
  const ring = accent === 'sky' ? 'from-sky-400 to-blue-600' : 'from-amber-400 to-orange-500';
  const bg = accent === 'sky' ? 'bg-sky-50 border-sky-100' : 'bg-amber-50 border-amber-100';
  return (
    <div className={`flex flex-1 items-center gap-4 rounded-2xl border p-4 ${bg}`}>
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ring} shadow-lg`}>
        <span className="text-lg font-black text-white">{value}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-800">{sublabel}</p>
      </div>
    </div>
  );
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
  const [hasMyReviewSaved, setHasMyReviewSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      const t1 = setTimeout(() => setMovieLoading(false), 0);
      const t2 = setTimeout(() => setMovieErr('Filme inválido.'), 0);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    let cancelled = false;
    const t3 = setTimeout(() => {
      setMovieLoading(true);
      setMovieErr(null);
    }, 0);
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
      clearTimeout(t3);
    };
  }, [tmdbId]);

  useEffect(() => {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return;
    return subscribeMovieReviews(tmdbId, setReviews, (e) => setReviewsErr(e.message));
  }, [tmdbId]);

  useEffect(() => {
    if (!user || !Number.isFinite(tmdbId) || tmdbId <= 0) {
      const t = setTimeout(() => setHasMyReviewSaved(false), 0);
      return () => clearTimeout(t);
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

  useEffect(() => {
    if (!user || !Number.isFinite(tmdbId)) return;
    return subscribeUserWatchlist(user.uid, (s) => {
      setInWatchlist(
        s.toWatch.some((x) => x.tmdbId === tmdbId) || s.watched.some((x) => x.tmdbId === tmdbId)
      );
    });
  }, [user, tmdbId]);

  const stats = useMemo(() => communityStatsFromReviews(reviews), [reviews]);
  const featured = useMemo(() => pickFeatured(reviews), [reviews]);

  const displayName = user?.displayName || user?.email || 'Utilizador';

  async function toggleWatchlist() {
    if (!user || !movie || !Number.isFinite(tmdbId)) return;
    setWatchlistBusy(true);
    try {
      if (inWatchlist) {
        await removeFromToWatch(user.uid, tmdbId);
      } else {
        await addMovieToWatchlist(user.uid, {
          tmdbId,
          title: movie.title,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path ?? null,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWatchlistBusy(false);
    }
  }

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
      setConfirmDelete(false);
    }
  }

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return (
      <div className="min-h-dvh bg-slate-950 p-6 font-sans text-white">
        <p>ID inválido.</p>
        <Link to="/em-cartaz" className="mt-4 inline-block text-sm font-bold text-violet-300">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const tmdbScore = movie?.vote_average != null ? movie.vote_average.toFixed(1) : '—';
  const noctalScore = stats.average != null ? stats.average.toFixed(1) : '—';

  return (
    <div className="min-h-dvh bg-slate-950 font-sans text-slate-900 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Header flutuante */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Link
            to="/em-cartaz"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md ring-1 ring-white/20 transition hover:bg-black/60"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md ring-1 ring-white/20">
            <p className="truncate text-sm font-bold text-white">{movie?.title ?? 'Filme'}</p>
          </div>
        </div>
      </header>

      {movieLoading && (
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
        </div>
      )}

      {!movieLoading && movieErr && (
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <Film className="mb-4 h-14 w-14 text-slate-500" />
          <p className="text-lg font-bold text-white">{movieErr}</p>
          <Link to="/em-cartaz" className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900">
            Voltar ao catálogo
          </Link>
        </div>
      )}

      {!movieLoading && movie && !movieErr && (
        <>
          {/* Hero cinematográfico */}
          <section className="relative min-h-[52vh] overflow-hidden sm:min-h-[58vh]">
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center"
              style={{
                backgroundImage: movie.backdrop_path
                  ? `url(${backdropUrl(movie.backdrop_path)})`
                  : 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/30 to-transparent" />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-8 pt-24 sm:pt-28 md:flex-row md:items-end md:gap-8 md:pb-12 md:text-left">
              {/* Poster */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/60 via-fuchsia-500/40 to-amber-400/50 blur-md" />
                {movie.poster_path ? (
                  <img
                    src={posterUrl(movie.poster_path, 'w500')}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className="relative w-36 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl sm:w-44 md:w-48"
                  />
                ) : (
                  <div className="relative flex aspect-[2/3] w-36 items-center justify-center rounded-2xl border-2 border-white/20 bg-slate-800 shadow-2xl sm:w-44 md:w-48">
                    <Film className="h-12 w-12 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 flex flex-1 flex-col items-center md:mt-0 md:items-start">
                <div className="mb-3 flex flex-wrap justify-center gap-2 md:justify-start">
                  {movie.genres?.slice(0, 3).map((g) => (
                    <span
                      key={g.id}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
                <h1 className="text-center text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl md:text-left md:text-4xl">
                  {movie.title}
                </h1>
                <p className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-slate-300 md:justify-start">
                  <span>{yearFromRelease(movie.release_date)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {runtimeLabel(movie.runtime)}
                  </span>
                </p>

                {/* Ações */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {user && (
                    <button
                      type="button"
                      onClick={() => void toggleWatchlist()}
                      disabled={watchlistBusy}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                        inWatchlist
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 hover:bg-violet-400'
                          : 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm hover:bg-white/25'
                      }`}
                    >
                      {inWatchlist ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {inWatchlist ? 'Na lista' : 'Lista para ver'}
                    </button>
                  )}
                  <a
                    href="#avaliar"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300"
                  >
                    <Star className="h-4 w-4 fill-current" />
                    Avaliar
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Conteúdo principal */}
          <div className="relative -mt-6 rounded-t-[1.75rem] bg-[#f4f5f7] shadow-[0_-8px_40px_rgba(0,0,0,0.35)]">
            <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
              {/* Pontuações */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <ScoreCard
                  label="TMDB"
                  value={tmdbScore}
                  sublabel={`${(movie.vote_count ?? 0).toLocaleString('pt-BR')} votos globais`}
                  accent="sky"
                />
                <ScoreCard
                  label="Noctal"
                  value={noctalScore}
                  sublabel={
                    stats.count === 0
                      ? 'Sem avaliações ainda'
                      : `${stats.count} ${stats.count === 1 ? 'avaliação' : 'avaliações'}`
                  }
                  accent="amber"
                />
              </div>

              {/* Sinopse */}
              <section className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Sinopse</h2>
                </div>
                <p className="text-[15px] leading-[1.75] text-slate-700">
                  {movie.overview || 'Sinopse não disponível para este filme.'}
                </p>
              </section>

              {reviewsErr && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {reviewsErr} — se for índice em falta, cria o índice composto sugerido na consola do Firebase.
                </div>
              )}

              {/* Destaques */}
              {featured.length > 0 && (
                <section className="mt-10">
                  <div className="mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-violet-500" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Principais avaliações
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {featured.map((r) => (
                      <ReviewCard key={r.id} review={r} isMine={user?.uid === r.authorId} />
                    ))}
                  </div>
                </section>
              )}

              {/* Formulário */}
              <section id="avaliar" className="mt-10 scroll-mt-24">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-violet-950 px-5 py-4 sm:px-6">
                    <h2 className="text-lg font-black text-white">A tua avaliação</h2>
                    <p className="mt-0.5 text-sm text-slate-400">Partilha a tua opinião com a comunidade Noctal</p>
                  </div>
                  <div className="p-5 sm:p-6">
                    {!user ? (
                      <p className="text-center text-sm text-slate-600">
                        <Link to="/login" className="font-bold text-violet-600 hover:underline">
                          Inicia sessão
                        </Link>{' '}
                        para avaliar este filme.
                      </p>
                    ) : (
                      <form className="space-y-5" onSubmit={onSubmitReview}>
                        <div>
                          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
                            Classificação
                          </p>
                          <div className="flex justify-center gap-1 sm:justify-start">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setStars(n)}
                                className="rounded-xl p-1.5 transition-transform hover:scale-110 active:scale-95"
                                aria-label={`${n} estrelas`}
                              >
                                <Star
                                  className={`h-10 w-10 sm:h-11 sm:w-11 ${
                                    n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-center text-sm font-bold text-amber-600 sm:text-left">
                            {stars} de 5 estrelas
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor="movie-review-comment"
                            className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500"
                          >
                            Comentário (opcional)
                          </label>
                          <textarea
                            id="movie-review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="O que achaste do filme? Sem spoilers, por favor…"
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            {saving ? 'A guardar…' : hasMyReviewSaved ? 'Atualizar avaliação' : 'Publicar avaliação'}
                          </button>
                          {hasMyReviewSaved && (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(true)}
                              disabled={deleting}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deleting ? 'A apagar…' : 'Apagar'}
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </section>

              {/* Todas */}
              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Comunidade
                  </h2>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                    {reviews.length}
                  </span>
                </div>
                {reviews.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center">
                    <Star className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">Ainda não há avaliações. Sê o primeiro!</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {reviews.map((r) => (
                      <li key={r.id}>
                        <ReviewCard review={r} isMine={user?.uid === r.authorId} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      <MobileBottomNav />
      <ConfirmModal
        isOpen={confirmDelete}
        title="Remover avaliação"
        message="Tem certeza que quer remover a tua avaliação deste filme?"
        confirmLabel="Remover"
        onConfirm={() => void onDeleteMine()}
        onCancel={() => setConfirmDelete(false)}
        isDestructive={true}
      />
    </div>
  );
}

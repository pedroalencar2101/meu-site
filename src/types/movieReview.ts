import type { Timestamp } from 'firebase/firestore';

/** Avaliação de um filme (TMDB) na comunidade Noctal — um documento por utilizador por filme. */
export interface MovieReview {
  id: string;
  tmdbId: number;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatar: string | null;
  stars: number;
  text: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  /** Preenchido ao guardar a partir da ficha TMDB (lista “Minhas avaliações”). */
  movieTitle?: string;
  moviePosterPath?: string | null;
  /** ID do documento em `posts` ligado a esta avaliação (feed + perfil). */
  feedPostId?: string;
}

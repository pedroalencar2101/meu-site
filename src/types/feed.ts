import type { Timestamp } from 'firebase/firestore';

export type ReactionType = 'like' | 'dislike';

export interface MovieEmbed {
  title: string;
  year: string;
  genre: string;
  poster: string;
  rating: number;
}

export interface FirestorePost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatar: string | null;
  content: string;
  createdAt: Timestamp | null;
  movie: MovieEmbed | null;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
}

export interface FirestoreComment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  text: string;
  createdAt: Timestamp | null;
  likeCount: number;
  dislikeCount: number;
}

/** Estado derivado no cliente (feed) */
export interface UiPost extends FirestorePost {
  myReaction: ReactionType | null;
}

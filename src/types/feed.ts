import type { Timestamp } from 'firebase/firestore';

export type ReactionType = 'like' | 'love' | 'smile' | 'angry';

export interface MovieEmbed {
  title: string;
  year: string;
  genre: string;
  poster: string;
  rating: number;
  tmdbId?: number;
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
  loveCount: number;
  smileCount: number;
  angryCount: number;
  commentCount: number;
}

export interface FirestoreComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatar: string | null;
  text: string;
  parentId: string | null; // For nested replies
  createdAt: Timestamp | null;
  likeCount: number;
  loveCount: number;
  smileCount: number;
  angryCount: number;
}

/** Estado derivado no cliente (feed) */
export interface UiPost extends FirestorePost {
  myReaction: ReactionType | null;
}

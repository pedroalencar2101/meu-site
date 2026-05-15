import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, MessageCircle, Share2, Trash2 } from 'lucide-react';
import type { UiPost, ReactionType } from '../types/feed';
import { formatPostTime } from '../utils/formatPostTime';
import { sharePostContent } from '../utils/sharePost';

type PostProps = {
  post: UiPost;
  currentUserId?: string;
  onReact: (postId: string, type: ReactionType) => void;
  onOpenComments: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenShareModal?: (postId: string, content: string) => void;
};

export default function FeedPost({ post, currentUserId, onReact, onOpenComments, onDelete, onOpenShareModal }: PostProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionHover, setReactionHover] = useState(false);

  const isMine = currentUserId === post.authorId;
  const profilePath = currentUserId === post.authorId ? '/profile' : `/u/${post.authorId}`;

  const hasReactions = post.likeCount > 0 || post.loveCount > 0 || post.smileCount > 0 || post.angryCount > 0;
  const totalReactions = post.likeCount + post.loveCount + post.smileCount + post.angryCount;

  return (
    <article className="relative mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={profilePath}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-sm ring-1 ring-slate-200"
          >
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[13px] font-black text-slate-500">{post.authorInitials}</span>
            )}
          </Link>
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-[15px] font-bold text-slate-900">
              <Link to={profilePath} className="hover:underline">
                {post.authorName}
              </Link>{' '}
              <span className="text-[14px] font-normal text-slate-500">
                {post.movie ? 'avaliou um filme.' : 'atualizou o status.'}
              </span>
            </h3>
            <span className="text-[12px] font-medium text-slate-500">{formatPostTime(post.createdAt)}</span>
          </div>
        </div>

        {isMine && onDelete && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(post.id);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Apagar post
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{post.content}</p>

      {post.movie && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:flex-row sm:items-stretch">
          <img
            src={post.movie.poster}
            alt={post.movie.title}
            referrerPolicy="no-referrer"
            className="mx-auto h-[108px] w-[72px] shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/10 sm:mx-0"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
            <h4 className="text-base font-black text-slate-900">{post.movie.title}</h4>
            <p className="mb-2 text-[13px] font-medium text-slate-500">
              {post.movie.year} • {post.movie.genre}
            </p>
            <div className="flex items-center justify-center gap-0.5 text-amber-400 sm:justify-start">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`h-4 w-4 ${i < post.movie!.rating ? 'fill-current' : 'text-slate-300'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      )}

      {(hasReactions || post.commentCount > 0) && (
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 px-1 pb-3 text-[13px] font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            {hasReactions && (
              <div className="flex -space-x-1">
                {post.likeCount > 0 && <div className="z-40 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-white text-[13px] leading-none shadow-sm bg-slate-100">👍</div>}
                {post.loveCount > 0 && <div className="z-30 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-white text-[13px] leading-none shadow-sm bg-slate-100">❤️</div>}
                {post.smileCount > 0 && <div className="z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-white text-[13px] leading-none shadow-sm bg-slate-100">😂</div>}
                {post.angryCount > 0 && <div className="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-white text-[13px] leading-none shadow-sm bg-slate-100">😡</div>}
              </div>
            )}
            {totalReactions > 0 && <span className="ml-1">{totalReactions}</span>}
          </div>
          {post.commentCount > 0 && (
            <button onClick={() => onOpenComments(post.id)} className="hover:underline">
              {post.commentCount} {post.commentCount === 1 ? 'comentário' : 'comentários'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-1 pt-1 sm:flex-nowrap">
        {/* React Button with Hover Modal */}
        <div 
          className="relative flex-1 sm:flex-none sm:min-w-[120px]"
          onMouseEnter={() => setReactionHover(true)}
          onMouseLeave={() => setReactionHover(false)}
        >
          {reactionHover && (
            <div className="absolute bottom-full left-0 z-30 pb-2">
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                <button onClick={() => { onReact(post.id, 'like'); setReactionHover(false); }} className="flex h-9 w-9 items-center justify-center rounded-full text-2xl transition hover:scale-125 hover:bg-slate-50" title="Curtir">👍</button>
                <button onClick={() => { onReact(post.id, 'love'); setReactionHover(false); }} className="flex h-9 w-9 items-center justify-center rounded-full text-2xl transition hover:scale-125 hover:bg-slate-50" title="Amei">❤️</button>
                <button onClick={() => { onReact(post.id, 'smile'); setReactionHover(false); }} className="flex h-9 w-9 items-center justify-center rounded-full text-2xl transition hover:scale-125 hover:bg-slate-50" title="Haha">😂</button>
                <button onClick={() => { onReact(post.id, 'angry'); setReactionHover(false); }} className="flex h-9 w-9 items-center justify-center rounded-full text-2xl transition hover:scale-125 hover:bg-slate-50" title="Irritado">😡</button>
              </div>
            </div>
          )}
          <button
            onClick={() => onReact(post.id, post.myReaction ? post.myReaction : 'like')}
            className={`flex w-full min-h-[2.75rem] items-center justify-center gap-1.5 rounded-lg py-2 text-[14px] font-bold transition-colors hover:bg-slate-50 ${
              post.myReaction === 'like' ? 'text-blue-600' : 
              post.myReaction === 'love' ? 'text-red-600' :
              post.myReaction === 'smile' ? 'text-amber-600' : 
              post.myReaction === 'angry' ? 'text-orange-600' : 'text-slate-600'
            }`}
          >
            {post.myReaction === 'like' ? <span className="text-lg leading-none">👍</span> :
             post.myReaction === 'love' ? <span className="text-lg leading-none">❤️</span> :
             post.myReaction === 'smile' ? <span className="text-lg leading-none">😂</span> :
             post.myReaction === 'angry' ? <span className="text-lg leading-none">😡</span> :
             <span className="text-lg leading-none opacity-60">👍</span>}
            <span>
              {post.myReaction === 'like' ? 'Curtido' :
               post.myReaction === 'love' ? 'Amei' :
               post.myReaction === 'smile' ? 'Haha' : 
               post.myReaction === 'angry' ? 'Irritado' : 'Curtir'}
            </span>
          </button>
        </div>

        <button
          onClick={() => onOpenComments(post.id)}
          className="flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[14px] font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:flex-none sm:min-w-[120px]"
        >
          <MessageCircle className="h-5 w-5" /> <span>Comentar</span>
        </button>

        <button
          onClick={() => {
            if (onOpenShareModal) {
              onOpenShareModal(post.id, post.content);
            } else {
              void sharePostContent(post.content);
            }
          }}
          className="flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[14px] font-bold text-slate-600 transition-colors hover:bg-slate-50 sm:flex-none sm:min-w-[120px]"
        >
          <Share2 className="h-5 w-5" /> <span className="hidden sm:inline">Compartilhar</span>
        </button>
      </div>
    </article>
  );
}

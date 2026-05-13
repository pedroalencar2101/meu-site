import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import type { FirestoreComment, ReactionType } from '../types/feed';
import {
  subscribeComments,
  addComment,
  toggleCommentReaction,
  fetchMyCommentReactions,
  deleteComment,
} from '../services/feedPosts';
import { formatPostTime } from '../utils/formatPostTime';

type Props = {
  open: boolean;
  postId: string | null;
  postSnippet: string;
  onClose: () => void;
  uid: string;
  displayName: string;
  myInitials: string;
};

export default function CommentsModal({
  open,
  postId,
  postSnippet,
  onClose,
  uid,
  displayName,
  myInitials,
}: Props) {
  const [list, setList] = useState<FirestoreComment[]>([]);
  const [text, setText] = useState('');
  const [myByComment, setMyByComment] = useState<Map<string, ReactionType>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setList([]);
      setText('');
      setMyByComment(new Map());
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !postId) return;
    return subscribeComments(postId, setList);
  }, [open, postId]);

  useEffect(() => {
    if (!open || !postId) return;
    if (list.length === 0) {
      setMyByComment(new Map());
      return;
    }
    let cancelled = false;
    fetchMyCommentReactions(
      postId,
      list.map((c) => c.id),
      uid
    ).then((m) => {
      if (!cancelled) setMyByComment(m);
    });
    return () => {
      cancelled = true;
    };
  }, [open, postId, list, uid]);

  if (!open || !postId) return null;

  async function syncMyReactions() {
    if (list.length === 0) {
      setMyByComment(new Map());
      return;
    }
    const m = await fetchMyCommentReactions(
      postId,
      list.map((c) => c.id),
      uid
    );
    setMyByComment(m);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment({ postId, uid, displayName, text });
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(100dvh,720px)] h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:h-[min(88dvh,640px)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1 pr-2">
            <h2 id="comments-modal-title" className="truncate text-sm font-black uppercase tracking-wide text-slate-800">
              Comentários
            </h2>
            <p className="truncate text-xs text-slate-500">{postSnippet}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {list.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-500">
                <MessageCircle className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">Ainda não há comentários.</p>
              </div>
            )}
            {list.map((c) => {
              const mine = c.authorId === uid;
              const liked = myByComment.get(c.id) === 'like';
              const disliked = myByComment.get(c.id) === 'dislike';
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-[#f0f2f5]/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 gap-2">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-600 to-slate-800 text-xs font-bold text-white">
                        {c.authorInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="text-sm font-bold text-slate-900">{c.authorName}</span>
                          <span className="text-xs font-medium text-slate-500">{formatPostTime(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{c.text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleCommentReaction(postId, c.id, uid, 'like').then(syncMyReactions)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                              liked ? 'bg-slate-200 text-slate-900' : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
                            <span>{c.likeCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleCommentReaction(postId, c.id, uid, 'dislike').then(syncMyReactions)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                              disliked ? 'bg-red-50 text-red-700' : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <ThumbsDown className={`h-3.5 w-3.5 ${disliked ? 'fill-current' : ''}`} />
                            <span>{c.dislikeCount}</span>
                          </button>
                          {mine && (
                            <button
                              type="button"
                              onClick={() =>
                                void deleteComment({ postId, commentId: c.id, uid }).catch((err) => console.error(err))
                              }
                              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Apagar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            id={`noctal-comment-form-${postId}`}
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-xs font-bold text-white">
                {myInitials}
              </div>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva um comentário..."
                autoComplete="off"
                name={`comment-body-${postId}`}
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-[#f0f2f5] px-4 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Enviar comentário"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

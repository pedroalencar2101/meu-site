import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, X, Reply, Heart } from 'lucide-react';
import type { FirestoreComment, ReactionType } from '../types/feed';
// reactor loading delegated to ReactorsListModal
import ReactorsListModal from './ReactorsListModal';
import ConfirmModal from './ConfirmModal';
import {
  subscribeComments,
  addComment,
  toggleCommentReaction,
  fetchMyCommentReactions,
  deleteComment,
} from '../services/feedPosts';
import { formatCompactRelative } from '../utils/formatRelativeTime';

type Props = {
  open: boolean;
  postId: string | null;
  postSnippet: string;
  onClose: () => void;
  uid: string;
  displayName: string;
  myInitials: string;
  myAvatar?: string | null;
};

export default function CommentsModal({
  open,
  postId,
  postSnippet,
  onClose,
  uid,
  displayName,
  myInitials,
  myAvatar,
}: Props) {
  const [list, setList] = useState<FirestoreComment[]>([]);
  const [text, setText] = useState('');
  const [myByComment, setMyByComment] = useState<Map<string, ReactionType>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showReactorsForComment, setShowReactorsForComment] = useState(false);
  const [activeReactCommentId, setActiveReactCommentId] = useState<string | null>(null);
  const [pulsingComments, setPulsingComments] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      const t1 = setTimeout(() => setList([]), 0);
      const t2 = setTimeout(() => setText(''), 0);
      const t3 = setTimeout(() => setMyByComment(new Map()), 0);
      const t4 = setTimeout(() => setReplyTo(null), 0);
      const t5 = setTimeout(() => setExpandedReplies(new Set()), 0);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
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
      const t = setTimeout(() => setMyByComment(new Map()), 0);
      return () => clearTimeout(t);
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
    if (list.length === 0 || !postId) {
      setMyByComment(new Map());
      return;
    }
    const m = await fetchMyCommentReactions(
      "",
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
await addComment({ 
  postId: postId || "", 
  uid: uid || "", 
  displayName: displayName || "Usuário", 
  photoURL: myAvatar || null,
  text: text || "",
  parentId: replyTo?.id || null
});
      setText('');
      setReplyTo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReply(commentId: string, authorName: string) {
    setReplyTo({ id: commentId, name: authorName });
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });
    if (inputRef.current) inputRef.current.focus();
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  // Organize comments into a tree
  const topLevelComments = list.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, FirestoreComment[]>();
  list.forEach((c) => {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) || [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  });

  const renderComment = (c: FirestoreComment, isReply: boolean = false) => {
    const mine = c.authorId === uid;
    const myReact = myByComment.get(c.id);
    const hasReactions = c.likeCount > 0 || c.loveCount > 0 || c.smileCount > 0 || c.angryCount > 0;
    const totalReactions = c.likeCount + c.loveCount + c.smileCount + c.angryCount;

    const isPulsing = pulsingComments.has(c.id);

    function triggerPulse(id: string) {
      setPulsingComments((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setTimeout(() => {
        setPulsingComments((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 420);
    }

    return (
      <div key={c.id} className={`group flex gap-2 ${isReply ? 'mt-2 relative' : 'mt-3'}`}>
        {/* Thread line for replies */}
        {isReply && (
          <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-slate-200" />
        )}
        
        {/* Avatar */}
        <a
          href={`/u/${c.authorId}`}
          className={`relative z-10 flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 transition hover:opacity-80 cursor-pointer overflow-hidden ${
            isReply ? 'h-6 w-6 mt-1 text-[9px]' : 'h-8 w-8 text-[11px]'
          } font-bold text-slate-600`}
        >
          {c.authorAvatar ? (
            <img src={c.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            c.authorInitials
          )}
        </a>

        {/* Comment content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Comment body row: text bubble + heart */}
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1 rounded-[18px] bg-[#f0f2f5] px-3 py-2">
              <a
                href={`/u/${c.authorId}`}
                className="text-[13px] font-bold text-slate-900 hover:underline cursor-pointer"
              >
                {c.authorName}
              </a>
              <p className="whitespace-pre-wrap text-[14px] text-slate-800 leading-snug break-words">
                {c.text}
              </p>
            </div>

            {/* Heart / Like button - Instagram style on the right */}
            <button
              onClick={() => { void toggleCommentReaction(postId!, c.id, uid, myReact ? myReact : 'like').then(syncMyReactions); triggerPulse(c.id); }}
              aria-label="Curtir comentário"
              className={`flex-shrink-0 mt-1.5 p-1 rounded-full transition-opacity ${
                myReact 
                  ? 'text-rose-500 opacity-100' 
                  : 'text-slate-400 opacity-0 group-hover:opacity-100'
              }`}
            >
              <Heart 
                className={`h-3.5 w-3.5 ${isPulsing ? 'animate-heart-pulse' : ''} ${
                  myReact ? 'fill-rose-500 text-rose-500' : ''
                }`} 
              />
            </button>
          </div>

          {/* Action row: timestamp, like count, reply, delete */}
          <div className="mt-0.5 flex items-center gap-3 px-1 text-[12px] font-medium text-slate-400">
            <span>{formatCompactRelative(c.createdAt)}</span>

            {hasReactions && (
              <button
                onClick={(e) => { e.stopPropagation(); setActiveReactCommentId(c.id); setShowReactorsForComment(true); }}
                className="font-semibold text-slate-500 hover:underline"
              >
                {totalReactions} curtida{totalReactions !== 1 ? 's' : ''}
              </button>
            )}

            {!isReply && (
              <button
                onClick={() => handleReply(c.id, c.authorName)}
                className="font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Responder
              </button>
            )}

            {mine && (
              <button
                onClick={() => setConfirmDeleteId(c.id)}
                className="ml-auto font-semibold text-slate-400 hover:text-red-500 transition-colors"
              >
                Apagar
              </button>
            )}
          </div>

          {/* Nested replies */}
          {!isReply && repliesByParent.has(c.id) && (
            <div className="mt-1">
              {expandedReplies.has(c.id) ? (
                <div className="flex flex-col">
                  <button
                    onClick={() => toggleReplies(c.id)}
                    className="self-start pl-[22px] mt-1 text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    — Ocultar respostas
                  </button>
                  {repliesByParent.get(c.id)!.map((reply) => renderComment(reply, true))}
                </div>
              ) : (
                <button
                  onClick={() => toggleReplies(c.id)}
                  className="self-start pl-[22px] mt-1 text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  — Ver {repliesByParent.get(c.id)!.length} {repliesByParent.get(c.id)!.length === 1 ? 'resposta' : 'respostas'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(100dvh,800px)] h-[min(95dvh,800px)] w-full max-w-[480px] flex-col rounded-t-2xl bg-white shadow-2xl sm:h-[min(90dvh,700px)] sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-center border-b border-slate-100 px-4 py-3 relative">
          <h2 id="comments-modal-title" className="text-base font-bold text-slate-900">
            Comentários
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post snippet */}
        {postSnippet && (
          <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
            <p className="text-[13px] text-slate-500 truncate font-medium">
              <span className="font-semibold text-slate-700">Post: </span>
              {postSnippet}
            </p>
          </div>
        )}

        {/* Comments list */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-1 pb-4 sm:px-5">
            {list.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <MessageCircle className="h-10 w-10 text-slate-300" />
                <p className="text-[15px] font-bold text-slate-800">Nenhum comentário</p>
                <p className="text-[14px] text-slate-400 font-medium">Seja o primeiro a comentar.</p>
              </div>
            )}
            {topLevelComments.map((c) => renderComment(c, false))}
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-[13px] text-slate-500 border border-slate-100">
                <span className="flex items-center gap-1.5 truncate">
                  <Reply className="h-3.5 w-3.5 shrink-0" />
                  Respondendo a <span className="font-bold text-slate-800 truncate">{replyTo.name}</span>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="ml-2 p-0.5 hover:bg-slate-200 rounded-full transition shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <form
              id={`noctal-comment-form-${postId}`}
              onSubmit={onSubmit}
              onClick={(e) => e.stopPropagation()}
              className="flex items-end gap-2"
            >
              <div className="flex h-8 w-8 shrink-0 overflow-hidden items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                {myAvatar ? <img src={myAvatar} alt="" className="h-full w-full object-cover" /> : myInitials}
              </div>
              <div className="relative flex min-w-0 flex-1 items-end">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Adicione um comentário..."
                  autoComplete="off"
                  name={`comment-body-${postId}`}
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f0f2f5] py-2 pl-4 pr-11 text-[14px] text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/50 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Enviar comentário"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Apagar Comentário"
        message="Tem certeza que quer apagar este comentário? Esta ação não pode ser desfeita."
        confirmLabel="Apagar"
        onConfirm={() => {
          if (!postId || !confirmDeleteId) return;
          void deleteComment({ postId, commentId: confirmDeleteId, uid }).catch(console.error);
        }}
        onCancel={() => setConfirmDeleteId(null)}
        isDestructive={true}
      />
      <ReactorsListModal open={showReactorsForComment} onClose={() => { setShowReactorsForComment(false); setActiveReactCommentId(null); }} postId={postId ?? undefined} commentId={activeReactCommentId ?? undefined} currentUserId={uid} title="Curtidas" />
    </div>
  );

  return createPortal(node, document.body);
}
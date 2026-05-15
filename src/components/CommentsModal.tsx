import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, X, Reply } from 'lucide-react';
import type { FirestoreComment, ReactionType } from '../types/feed';
import ConfirmModal from './ConfirmModal';
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

    return (
      <div key={c.id} className={`flex gap-3 ${isReply ? 'mt-3 pl-8 sm:pl-11' : 'mt-4'}`}>
        <a href={`/u/${c.authorId}`} className={`flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 ${isReply ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-xs'} font-bold text-slate-600 transition hover:opacity-80 cursor-pointer`}>
          {c.authorAvatar ? (
            <img src={c.authorAvatar} alt="" className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
          ) : (
            c.authorInitials
          )}
        </a>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative inline-block self-start rounded-2xl bg-[#f0f2f5] px-4 py-2.5">
            <a href={`/u/${c.authorId}`} className="text-[13px] font-bold text-slate-900 hover:underline cursor-pointer">{c.authorName}</a>
            <p className="whitespace-pre-wrap text-[14px] text-slate-800 leading-snug">{c.text}</p>
            {hasReactions && (
              <div className="absolute -bottom-3 right-1 flex items-center rounded-full border border-slate-200 bg-white px-1 py-0.5 shadow-sm">
                <div className="flex -space-x-1">
                  {c.likeCount > 0 && <div className="z-40 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white bg-slate-100 text-[10px] leading-none shadow-sm">👍</div>}
                  {c.loveCount > 0 && <div className="z-30 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white bg-slate-100 text-[10px] leading-none shadow-sm">❤️</div>}
                  {c.smileCount > 0 && <div className="z-20 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white bg-slate-100 text-[10px] leading-none shadow-sm">😂</div>}
                  {c.angryCount > 0 && <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white bg-slate-100 text-[10px] leading-none shadow-sm">😡</div>}
                </div>
                {totalReactions > 1 && <span className="ml-1 pr-0.5 text-[11px] font-bold text-slate-600">{totalReactions}</span>}
              </div>
            )}
          </div>
          
          <div className="mt-1 flex items-center gap-3 px-3 text-[12px] font-bold text-slate-500">
            <span className="font-medium text-slate-400">{formatPostTime(c.createdAt)}</span>
            
            <div className="group relative flex items-center">
              <button
                className={`transition hover:underline ${
                  myReact === 'like' ? 'text-blue-600' :
                  myReact === 'love' ? 'text-red-600' :
                  myReact === 'smile' ? 'text-amber-600' : 
                  myReact === 'angry' ? 'text-orange-600' : 'hover:text-slate-700'
                }`}
                onClick={() => void toggleCommentReaction(postId!, c.id, uid, myReact ? myReact : 'like').then(syncMyReactions)}
              >
                {myReact === 'like' ? 'Curtido' : myReact === 'love' ? 'Amei' : myReact === 'smile' ? 'Sorriu' : myReact === 'angry' ? 'Irritado' : 'Curtir'}
              </button>
              <div className="absolute bottom-full left-0 z-20 pb-2 hidden group-hover:block">
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  <button onClick={(e) => { e.stopPropagation(); void toggleCommentReaction(postId!, c.id, uid, 'like').then(syncMyReactions); }} className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition hover:scale-125 hover:bg-slate-50" title="Curtir">👍</button>
                  <button onClick={(e) => { e.stopPropagation(); void toggleCommentReaction(postId!, c.id, uid, 'love').then(syncMyReactions); }} className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition hover:scale-125 hover:bg-slate-50" title="Amei">❤️</button>
                  <button onClick={(e) => { e.stopPropagation(); void toggleCommentReaction(postId!, c.id, uid, 'smile').then(syncMyReactions); }} className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition hover:scale-125 hover:bg-slate-50" title="Haha">😂</button>
                  <button onClick={(e) => { e.stopPropagation(); void toggleCommentReaction(postId!, c.id, uid, 'angry').then(syncMyReactions); }} className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] transition hover:scale-125 hover:bg-slate-50" title="Irritado">😡</button>
                </div>
              </div>
            </div>

            {!isReply && (
              <button onClick={() => handleReply(c.id, c.authorName)} className="transition hover:text-slate-700 hover:underline">
                Responder
              </button>
            )}

            {mine && (
              <button
                onClick={() => setConfirmDeleteId(c.id)}
                className="text-red-500 hover:underline transition"
              >
                Apagar
              </button>
            )}
          </div>

          {!isReply && repliesByParent.has(c.id) && (
            <div className="mt-2">
              {expandedReplies.has(c.id) ? (
                <div className="flex flex-col gap-2">
                  <button onClick={() => toggleReplies(c.id)} className="self-start text-[13px] font-bold text-slate-500 hover:text-slate-700 hover:underline">
                    — Ocultar respostas
                  </button>
                  {repliesByParent.get(c.id)!.map((reply) => renderComment(reply, true))}
                </div>
              ) : (
                <button onClick={() => toggleReplies(c.id)} className="text-[13px] font-bold text-slate-500 hover:text-slate-700 hover:underline">
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(100dvh,800px)] h-[min(95dvh,800px)] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:h-[min(90dvh,700px)] sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h2 id="comments-modal-title" className="truncate text-base font-black text-slate-900">
              Comentários
            </h2>
            <p className="truncate text-[13px] font-medium text-slate-500 mt-0.5">{postSnippet}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-2 pb-6 sm:px-6">
            {list.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500">
                <MessageCircle className="h-12 w-12 text-slate-300" />
                <p className="text-[15px] font-bold text-slate-900">Nenhum comentário</p>
                <p className="text-[14px]">Seja o primeiro a comentar neste post.</p>
              </div>
            )}
            {topLevelComments.map((c) => renderComment(c, false))}
          </div>

          <div className="border-t border-slate-200 bg-white p-3 sm:px-4 sm:py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 border border-slate-100">
                <span className="flex items-center gap-2">
                  <Reply className="h-4 w-4" /> A responder a <span className="font-bold text-slate-900">{replyTo.name}</span>
                </span>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded-full transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <form
              id={`noctal-comment-form-${postId}`}
              onSubmit={onSubmit}
              onClick={(e) => e.stopPropagation()}
              className="flex items-end gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 overflow-hidden items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                {myAvatar ? <img src={myAvatar} alt="" className="h-full w-full object-cover" /> : myInitials}
              </div>
              <div className="relative flex min-w-0 flex-1 items-end">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  autoComplete="off"
                  name={`comment-body-${postId}`}
                  className="w-full rounded-2xl border border-slate-200 bg-[#f0f2f5] py-2.5 pl-4 pr-12 text-[15px] text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
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
    </div>
  );

  return createPortal(node, document.body);
}

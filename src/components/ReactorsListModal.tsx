import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { fetchReactorsForPostPage, fetchReactorsForCommentPage, fetchReactorsByUids, fetchReactorsForCommentByUids } from '../services/feedPosts';
import { getFollowingIds } from '../services/follows';
import { getCachedUserProfile } from '../services/profileCache';

export type Reactor = { uid: string; name?: string; avatar?: string | null; initials?: string };

type LocalReactor = Reactor & { followed?: boolean };

export default function ReactorsListModal({
  open,
  onClose,
  title = 'Curtidas',
  items = undefined,
  postId,
  commentId,
  pageSize = 40,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items?: Reactor[] | undefined;
  postId?: string;
  commentId?: string;
  pageSize?: number;
  currentUserId?: string;
}) {
  const [list, setList] = useState<Reactor[]>(items ?? []);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (items) return; // static list provided
    let cancelled = false;
    async function loadFirst() {
      setLoading(true);
      try {
        const seen = new Set<string>();
        // If we have a current user, fetch who they follow and show them first
        if (currentUserId && postId) {
          try {
            const following = await getFollowingIds(currentUserId);
            if (!cancelled && following.length) {
              const chunk = following.slice(0, 500);
              const followedReactors = commentId
                ? await fetchReactorsForCommentByUids(postId, commentId, chunk)
                : await fetchReactorsByUids(postId, chunk);
              const mappedFollowed = await Promise.all(followedReactors.map(async (r) => {
                try { const p = await getCachedUserProfile(r.uid); return { uid: r.uid, name: p.name, avatar: p.avatar, initials: p.initials, followed: true } as LocalReactor; } catch { return { uid: r.uid } as LocalReactor; }
              }));
              mappedFollowed.forEach((m) => seen.add(m.uid));
              if (!cancelled) setList(mappedFollowed as Reactor[]);
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (postId && !commentId) {
          const res = await fetchReactorsForPostPage(postId, pageSize);
          const mapped = await Promise.all(res.items.map(async (r) => {
            if (seen.has(r.uid)) return null;
            try { const p = await getCachedUserProfile(r.uid); return { uid: r.uid, name: p.name, avatar: p.avatar, initials: p.initials } as LocalReactor; } catch { return { uid: r.uid } as LocalReactor; }
          }));
          const final = mapped.filter(Boolean) as Reactor[];
          if (!cancelled) {
            setList((prev) => [...prev, ...final]);
            setCursor(res.lastCursor);
            setHasMore(res.hasMore);
          }
        } else if (postId && commentId) {
          const res = await fetchReactorsForCommentPage(postId, commentId, pageSize);
          const mapped = await Promise.all(res.items.map(async (r) => {
            if (seen.has(r.uid)) return null;
            try { const p = await getCachedUserProfile(r.uid); return { uid: r.uid, name: p.name, avatar: p.avatar, initials: p.initials }; } catch { return { uid: r.uid }; }
          }));
          const final = mapped.filter(Boolean) as Reactor[];
          if (!cancelled) {
            setList((prev) => [...prev, ...final]);
            setCursor(res.lastCursor);
            setHasMore(res.hasMore);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFirst();
    return () => { cancelled = true; };
  }, [open, postId, commentId, items, pageSize, currentUserId]);

  async function loadMore() {
    if (!postId) return;
    setLoading(true);
    try {
      if (!commentId) {
        const res = await fetchReactorsForPostPage(postId, pageSize, cursor);
        const mapped = await Promise.all(res.items.map(async (r) => {
          try { const p = await getCachedUserProfile(r.uid); return { uid: r.uid, name: p.name, avatar: p.avatar, initials: p.initials }; } catch { return { uid: r.uid }; }
        }));
        // avoid duplicates
        setList((prev) => {
          const seen = new Set(prev.map((p) => p.uid));
          const filtered = mapped.filter((m) => m && !seen.has((m as Reactor).uid)) as Reactor[];
          return [...prev, ...filtered];
        });
        setCursor(res.lastCursor);
        setHasMore(res.hasMore);
      } else {
        const res = await fetchReactorsForCommentPage(postId, commentId, pageSize, cursor);
        const mapped = await Promise.all(res.items.map(async (r) => {
          try { const p = await getCachedUserProfile(r.uid); return { uid: r.uid, name: p.name, avatar: p.avatar, initials: p.initials }; } catch { return { uid: r.uid }; }
        }));
        setList((prev) => {
          const seen = new Set(prev.map((p) => p.uid));
          const filtered = mapped.filter((m) => m && !seen.has((m as Reactor).uid)) as Reactor[];
          return [...prev, ...filtered];
        });
        setCursor(res.lastCursor);
        setHasMore(res.hasMore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">Fechar</button>
        </div>
        <div className="max-h-80 overflow-y-auto p-3">
          {list.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-500">Ninguém por enquanto.</div>
          ) : (
            <ul className="space-y-2">
              {list.map((it) => (
                <li key={it.uid} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <a href={`/u/${it.uid}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    {it.avatar ? <img src={it.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-700">{it.initials ?? '?'}</div>}
                  </a>
                  <div className="min-w-0 flex-1">
                    <a href={`/u/${it.uid}`} className="font-semibold text-slate-900 hover:underline truncate">{it.name ?? 'Utilizador'}</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {loading && (
            <div className="p-3 text-center text-slate-500">Carregando...</div>
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-2 text-center">
          {hasMore ? (
            <button onClick={loadMore} disabled={loading} className="rounded-md bg-slate-100 px-3 py-1 font-bold text-slate-700">Mostrar mais</button>
          ) : (
            list.length > 0 && <div className="text-sm text-slate-400">Fim da lista</div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

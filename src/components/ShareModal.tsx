import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2 } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { subscribeFollowingIds } from '../services/follows';
import { sendDirectMessage } from '../services/directMessages';

type Props = {
  open: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  currentUserId: string;
  currentUserDisplayName: string;
};

type UserRow = {
  id: string;
  name: string;
  photo: string | null;
  initials: string;
};

export default function ShareModal({ open, onClose, postId, postContent, currentUserId, currentUserDisplayName }: Props) {
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      const t1 = setTimeout(() => setSearch(''), 0);
      const t2 = setTimeout(() => setSentTo([]), 0);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    
    const t3 = setTimeout(() => setLoading(true), 0);
    const unsub = subscribeFollowingIds(
      currentUserId,
      async (ids) => {
        const users: UserRow[] = [];
        for (const id of ids) {
          try {
            const snap = await getDoc(doc(db, 'users', id));
            if (snap.exists()) {
              const data = snap.data();
              const name = data.fullName || data.email?.split('@')[0] || 'Utilizador';
              const p = name.trim().split(/\s+/).filter(Boolean);
              const initials = p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase() || '?';
              
              users.push({
                id,
                name,
                photo: data.avatarCustomDataUrl || data.photoURL || null,
                initials
              });
            }
          } catch (e) {
            console.error('Error fetching user', id, e);
          }
        }
        setFollowing(users.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    document.body.style.overflow = 'hidden';
    return () => {
      unsub();
      clearTimeout(t3);
      document.body.style.overflow = '';
    };
  }, [open, currentUserId]);

  if (!open) return null;

  const filtered = following.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  async function handleShare(userId: string) {
    if (sendingTo) return;
    setSendingTo(userId);
    try {
      const link = `${window.location.origin}/profile?post=${postId}`;
      const messageText = `Dei uma olhada neste post:\n\n"${postContent.slice(0, 50)}${postContent.length > 50 ? '...' : ''}"\n\nLink: ${link}`;
      
      await sendDirectMessage({
        fromId: currentUserId,
        toId: userId,
        text: messageText,
        fromDisplayName: currentUserDisplayName,
      });
      
      setSentTo(prev => [...prev, userId]);
    } catch (e) {
      console.error(e);
      alert('Não foi possível enviar a mensagem.');
    } finally {
      setSendingTo(null);
    }
  }

  const node = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[80dvh] sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-black text-slate-900">Compartilhar</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar pessoas que você segue..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex py-10 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : following.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm font-bold text-slate-800">Você não segue ninguém</p>
              <p className="mt-1 text-xs text-slate-500">Siga pessoas para compartilhar posts via DM.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center px-4">
              <p className="text-sm font-bold text-slate-800">Ninguém encontrado</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map(u => {
                const isSent = sentTo.includes(u.id);
                const isSending = sendingTo === u.id;
                
                return (
                  <li key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 shrink-0">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                            {u.initials}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{u.name}</span>
                    </div>
                    
                    <button
                      disabled={isSent || isSending}
                      onClick={() => handleShare(u.id)}
                      className={`flex h-8 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-bold transition ${
                        isSent 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : isSent ? 'Enviado' : 'Enviar'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Bell, Film, MessageCircle } from 'lucide-react';
import { auth } from '../services/firebase';
import AppPageShell from '../components/AppPageShell';
import { formatPostTime } from '../utils/formatPostTime';
import { markNotificationRead, subscribeMyNotifications, type AppNotification } from '../services/notifications';

export default function NotificacoesPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [list, setList] = useState<AppNotification[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      return;
    }
    return subscribeMyNotifications(
      user.uid,
      setList,
      (e) => setErr(e.message)
    );
  }, [user?.uid]);

  async function onOpen(n: AppNotification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch {
        /* ignore */
      }
    }
  }

  const unread = list.filter((n) => !n.read).length;

  return (
    <AppPageShell title="Notificações" description="Mensagens e novidades de quem segues." backTo="/">
      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err} — confirma o índice Firestore: notifications (userId + createdAt).
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="text-sm font-bold text-slate-800">
            {unread > 0 ? `${unread} não lidas` : 'Estás em dia'}
          </span>
        </div>
        <Link to="/mensagens" className="text-xs font-black uppercase tracking-wide text-violet-700 underline">
          Mensagens
        </Link>
      </div>

      <ul className="space-y-2">
        {list.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm font-medium text-slate-500">
            Sem notificações ainda. Quando alguém te enviar mensagem ou um seguidor publicar uma avaliação de filme, aparece aqui.
          </li>
        ) : (
          list.map((n) => (
            <li key={n.id}>
              <Link
                to={n.type === 'message' ? `/mensagens/${n.actorId}` : '/'}
                onClick={() => void onOpen(n)}
                className={`flex gap-3 rounded-2xl border px-4 py-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40 ${
                  n.read ? 'border-slate-100 bg-white' : 'border-violet-200 bg-violet-50/60'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    n.type === 'message' ? 'bg-violet-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {n.type === 'message' ? <MessageCircle className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{n.title}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{n.body}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">{formatPostTime(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </AppPageShell>
  );
}

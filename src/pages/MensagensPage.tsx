import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ArrowLeft, MessageCircle, Clock, Users as UsersIcon } from 'lucide-react';
import { auth, db } from '../services/firebase';
import MobileBottomNav from '../components/MobileBottomNav';
import UserListCard from '../components/UserListCard';
import UserListPanel from '../components/UserListPanel';

type PeerRow = {
  uid: string;
  label: string;
  photo: string | null;
  initials: string;
  preview: string;
  at: number;
};

type UserRow = { id: string; label: string; photo: string | null; initials: string };

function initialsFrom(s: string): string {
  const p = s.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

function userRowFromDoc(id: string, x: Record<string, unknown>): UserRow {
  const fullName = typeof x.fullName === 'string' ? x.fullName.trim() : '';
  const email = typeof x.email === 'string' ? x.email : '';
  const label = fullName || email.split('@')[0] || id;
  const photo =
    (typeof x.avatarCustomDataUrl === 'string' && x.avatarCustomDataUrl.trim()) ||
    (typeof x.photoURL === 'string' && x.photoURL.trim()) ||
    null;
  return { id, label, photo, initials: initialsFrom(label) };
}

function mergeInbox(meUid: string, snaps: (QuerySnapshot<DocumentData> | null)[]): Map<string, { preview: string; at: number }> {
  const map = new Map<string, { preview: string; at: number }>();
  for (const snap of snaps) {
    if (!snap) continue;
    for (const d of snap.docs) {
      const x = d.data();
      const fromId = String(x.fromId ?? '');
      const toId = String(x.toId ?? '');
      const text = String(x.text ?? '');
      const createdAt = x.createdAt as { toMillis?: () => number } | undefined;
      const t = createdAt?.toMillis?.() ?? 0;
      const other = fromId === meUid ? toId : fromId;
      if (!other || other === meUid) continue;
      const prev = map.get(other);
      if (!prev || t >= prev.at) {
        map.set(other, { preview: text.slice(0, 100), at: t });
      }
    }
  }
  return map;
}

export default function MensagensPage() {
  const [me, setMe] = useState<User | null>(auth.currentUser);
  const [directory, setDirectory] = useState<UserRow[]>([]);
  const [peerMap, setPeerMap] = useState<Map<string, { preview: string; at: number }>>(new Map());
  const sentSnapRef = useRef<QuerySnapshot<DocumentData> | null>(null);
  const recvSnapRef = useRef<QuerySnapshot<DocumentData> | null>(null);

  useEffect(() => onAuthStateChanged(auth, setMe), []);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(80));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => userRowFromDoc(d.id, d.data() as Record<string, unknown>));
      setDirectory(me ? list.filter((u) => u.id !== me.uid).sort((a, b) => a.label.localeCompare(b.label)) : list);
    });
  }, [me?.uid]);

  useEffect(() => {
    if (!me?.uid) {
      const t = setTimeout(() => setPeerMap(new Map()), 0);
      sentSnapRef.current = null;
      recvSnapRef.current = null;
      return () => clearTimeout(t);
    }
    const push = () => {
      const m = mergeInbox(me.uid, [sentSnapRef.current, recvSnapRef.current]);
      setPeerMap(m);
    };
    const q1 = query(
      collection(db, 'directMessages'),
      where('fromId', '==', me.uid),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const q2 = query(
      collection(db, 'directMessages'),
      where('toId', '==', me.uid),
      orderBy('createdAt', 'desc'),
      limit(80)
    );
    const un1 = onSnapshot(q1, (s) => {
      sentSnapRef.current = s;
      push();
    });
    const un2 = onSnapshot(q2, (s) => {
      recvSnapRef.current = s;
      push();
    });
    return () => {
      un1();
      un2();
    };
  }, [me?.uid]);

  const peersWithPhotos = useMemo(() => {
    const rows: PeerRow[] = [...peerMap.entries()]
      .map(([uid, v]) => {
        const u = directory.find((d) => d.id === uid);
        return {
          uid,
          label: u?.label ?? uid,
          photo: u?.photo ?? null,
          initials: u?.initials ?? '?',
          preview: v.preview,
          at: v.at,
        };
      })
      .sort((a, b) => b.at - a.at);
    return rows;
  }, [peerMap, directory]);

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 selection:bg-slate-300 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 sm:px-4 sm:py-4">
          <Link
            to="/"
            className="shrink-0 rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Voltar para a Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shadow-inner">
            <MessageCircle className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Mensagens</h1>
            <p className="text-[13px] font-medium text-slate-500">Conversas privadas</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 py-6 sm:px-4 sm:py-8">
        <section>
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4" />
            <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-500">Recentes</h2>
          </div>
          <UserListPanel
            title="Conversas"
            count={peersWithPhotos.length}
            isEmpty={peersWithPhotos.length === 0}
            emptyTitle="Nenhuma conversa ainda"
            emptyDescription="Inicia uma conversa escolhendo alguém da tua rede abaixo."
            className="!shadow-sm"
          >
            {peersWithPhotos.map((r) => (
              <UserListCard
                key={r.uid}
                uid={r.uid}
                name={r.label}
                photo={r.photo}
                subtitle={r.preview || '…'}
                meta={
                  r.at > 0
                    ? new Date(r.at).toLocaleString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : undefined
                }
                linkTo={`/mensagens/${r.uid}`}
                showChevron
              />
            ))}
          </UserListPanel>
        </section>

        <section className="pb-10">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <UsersIcon className="h-4 w-4" />
            <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-500">Nova Conversa</h2>
          </div>
          <UserListPanel
            title="Contactos"
            description="Escolhe alguém para enviar mensagem"
            count={directory.length}
            isEmpty={directory.length === 0}
            emptyTitle="Nenhum utilizador encontrado"
            variant="grid"
            className="!shadow-sm"
          >
            {directory.map((r) => (
              <UserListCard
                key={r.id}
                uid={r.id}
                name={r.label}
                photo={r.photo}
                layout="card"
                linkTo={`/mensagens/${r.id}`}
                showChevron={false}
                trailing={
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                }
              />
            ))}
          </UserListPanel>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}

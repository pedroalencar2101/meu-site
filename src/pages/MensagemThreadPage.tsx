import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Send, Smile } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { formatPostTime } from '../utils/formatPostTime';
import { sendDirectMessage, subscribeThread, threadIdFor, type DirectMessage } from '../services/directMessages';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '👏', '🔥', '✨', '🎬', '🙏', '😮', '⭐', '💬'];

type PeerProfile = {
  label: string;
  photo: string | null;
  initials: string;
};

function initialsFrom(s: string): string {
  const p = s.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

function loadUserCard(uid: string): Promise<PeerProfile> {
  return getDoc(doc(db, 'users', uid)).then((s) => {
    if (!s.exists()) {
      return { label: 'Utilizador', photo: null, initials: '?' };
    }
    const x = s.data() as {
      fullName?: string;
      email?: string;
      photoURL?: string;
      avatarCustomDataUrl?: string | null;
    };
    const label = (x.fullName && x.fullName.trim()) || x.email?.split('@')[0] || 'Utilizador';
    const photo = (x.avatarCustomDataUrl && x.avatarCustomDataUrl.trim()) || x.photoURL || null;
    return { label, photo, initials: initialsFrom(label) };
  });
}

export default function MensagemThreadPage() {
  const { uid: otherUid } = useParams<{ uid: string }>();
  const me = auth.currentUser;
  const [peer, setPeer] = useState<PeerProfile>({ label: 'Utilizador', photo: null, initials: '?' });
  const [self, setSelf] = useState<PeerProfile>({ label: 'Eu', photo: null, initials: '?' });
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const threadId = me && otherUid ? threadIdFor(me.uid, otherUid) : '';

  useEffect(() => {
    if (!otherUid) return;
    void loadUserCard(otherUid).then(setPeer);
  }, [otherUid]);

  useEffect(() => {
    if (!me?.uid) return;
    void loadUserCard(me.uid).then(setSelf);
  }, [me?.uid]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeThread(threadId, setMessages, console.error);
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const selfPhoto = useMemo(
    () => (me?.photoURL && me.photoURL.trim()) || self.photo,
    [me?.photoURL, self.photo]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !otherUid || !text.trim() || sending) return;
    setSending(true);
    try {
      await sendDirectMessage({ fromId: me.uid, toId: otherUid, text });
      setText('');
      setEmojiOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (!me || !otherUid) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-violet-950 via-slate-900 to-slate-950 p-6 font-sans text-white">
        <p className="text-sm">Sessão inválida.</p>
        <Link className="mt-4 inline-block text-sm font-bold text-violet-200 underline" to="/login">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-100 via-violet-50/40 to-slate-200 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-violet-200/60 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-3 sm:px-4">
          <Link to="/mensagens" className="rounded-full p-2 text-slate-600 transition hover:bg-violet-50" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link to={`/u/${otherUid}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-violet-50/80">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-violet-200 bg-slate-200 shadow-md ring-2 ring-white">
              {peer.photo ? (
                <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-800 text-xs font-black text-white">
                  {peer.initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black text-slate-900">{peer.label}</h1>
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Conversa privada</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-3 pb-28 pt-4 sm:px-4">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-b from-white to-violet-50/30 shadow-inner shadow-violet-100/50">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
            {messages.length === 0 && (
              <div className="mx-auto mt-8 max-w-xs rounded-2xl border border-dashed border-violet-200 bg-white/80 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">Nenhuma mensagem ainda</p>
                <p className="mt-2 text-xs font-medium text-slate-500">Envia um olá 👋 ou escolhe um emoji abaixo.</p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.fromId === me.uid;
              return (
                <div key={m.id} className={`flex w-full items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    <Link
                      to={`/u/${otherUid}`}
                      className="mb-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-violet-100 bg-slate-200 shadow-sm ring-1 ring-white"
                      aria-label={`Perfil de ${peer.label}`}
                    >
                      {peer.photo ? (
                        <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-700 text-[10px] font-black text-white">
                          {peer.initials}
                        </div>
                      )}
                    </Link>
                  )}
                  <div
                    className={`max-w-[min(85%,20rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                      mine
                        ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-700 text-white'
                        : 'rounded-bl-md border border-violet-100/80 bg-white text-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p
                      className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                        mine ? 'text-violet-100' : 'text-slate-400'
                      }`}
                    >
                      {formatPostTime(m.createdAt)}
                    </p>
                  </div>
                  {mine && (
                    <Link
                      to="/profile"
                      className="mb-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-violet-200 bg-slate-200 shadow-sm ring-1 ring-white"
                      aria-label="O meu perfil"
                    >
                      {selfPhoto ? (
                        <img src={selfPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-black text-white">
                          {self.initials}
                        </div>
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-violet-200/80 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(91,33,182,0.12)] backdrop-blur-md sm:px-4">
        <div className="mx-auto max-w-lg">
          {emojiOpen && (
            <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-violet-100 bg-violet-50/90 p-2">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-lg px-2 py-1 text-lg transition hover:bg-white"
                  onClick={() => {
                    setText((t) => t + em);
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                emojiOpen
                  ? 'border-violet-400 bg-violet-100 text-violet-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-violet-50'
              }`}
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreve uma mensagem…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-inner outline-none ring-violet-200 transition focus:border-violet-400 focus:ring-2"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg transition hover:brightness-110 disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

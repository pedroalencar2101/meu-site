import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { ArrowLeft, Send, Smile, Info } from 'lucide-react';
import { auth } from '../services/firebase';
import { formatPostTime } from '../utils/formatPostTime';
import { sendDirectMessage, subscribeThread, threadIdFor, type DirectMessage } from '../services/directMessages';
import { useLiveUserCard } from '../hooks/useLiveUserCard';

const FALLBACK = { label: 'Utilizador', photo: null as string | null, initials: '?' };

export default function MensagemThreadPage() {
  const { uid: otherUid } = useParams<{ uid: string }>();
  const me = auth.currentUser;
  const peerLive = useLiveUserCard(otherUid);
  const selfLive = useLiveUserCard(me?.uid);
  const peer = peerLive ?? FALLBACK;
  const self = selfLive ?? { ...FALLBACK, label: 'Eu' };

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const threadId = me && otherUid ? threadIdFor(me.uid, otherUid) : '';

  useEffect(() => {
    if (!threadId) return;
    return subscribeThread(threadId, setMessages, console.error);
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    }
    if (emojiOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [emojiOpen]);

  const selfPhoto = useMemo(
    () => selfLive?.photo || (me?.photoURL && me.photoURL.trim()) || null,
    [selfLive?.photo, me?.photoURL]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !otherUid || !text.trim() || sending) return;
    setSending(true);
    try {
      await sendDirectMessage({
        fromId: me.uid,
        toId: otherUid,
        text,
        fromDisplayName: me.displayName || me.email || 'Utilizador',
      });
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
      <div className="min-h-dvh flex items-center justify-center bg-[#f0f2f5] p-6 font-sans text-slate-800">
        <div className="text-center">
          <p className="text-sm font-medium">Sessão inválida.</p>
          <Link className="mt-4 inline-block text-sm font-bold text-slate-900 underline" to="/login">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f0f2f5] font-sans text-slate-900 selection:bg-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Link to="/mensagens" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to={`/u/${otherUid}`} className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition hover:bg-slate-50">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
                {peer.photo ? (
                  <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-[13px] font-black text-slate-600">
                    {peer.initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[15px] font-bold text-slate-900 leading-tight">{peer.label}</h1>
                <p className="text-[12px] font-medium text-slate-500">Toque para ver o perfil</p>
              </div>
            </Link>
          </div>
          <Link to={`/u/${otherUid}`} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <Info className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Chat Area */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200/60 bg-white/40 shadow-[0_2px_8px_rgba(0,0,0,0.02)] sm:bg-white/60">
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-5">
            {messages.length === 0 && (
              <div className="my-auto text-center flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/50 mb-3">
                  <Smile className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-[15px] font-bold text-slate-800">Diga olá!</p>
                <p className="mt-1 text-sm font-medium text-slate-500 max-w-xs">
                  A conversa é privada e aparece instantaneamente.
                </p>
              </div>
            )}
            
            {messages.map((m, index) => {
              const mine = m.fromId === me.uid;
              // Check if previous message was from the same person to group them
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const isFirstInGroup = !prevMsg || prevMsg.fromId !== m.fromId;
              
              return (
                <div key={m.id} className={`flex w-full items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
                  {!mine && (
                    <div className="w-8 shrink-0 flex items-end justify-center">
                      {isFirstInGroup && (
                        <Link
                          to={`/u/${otherUid}`}
                          className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm"
                          aria-label={`Perfil de ${peer.label}`}
                        >
                          {peer.photo ? (
                            <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-[10px] font-black text-slate-600">
                              {peer.initials}
                            </div>
                          )}
                        </Link>
                      )}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
                    <div
                      className={`relative px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                        mine
                          ? 'rounded-2xl rounded-br-sm bg-slate-800 text-white'
                          : 'rounded-2xl rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                    
                    {/* Only show time on hover or tap */}
                    <span className={`mt-1 text-[11px] font-medium text-slate-400 ${mine ? 'mr-1' : 'ml-1'}`}>
                      {formatPostTime(m.createdAt)}
                    </span>
                  </div>

                  {mine && (
                    <div className="w-8 shrink-0 flex items-end justify-center">
                      {isFirstInGroup && (
                        <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
                          {selfPhoto ? (
                            <img src={selfPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-[10px] font-black text-slate-600">
                              {self.initials}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl sm:px-4">
        <div className="mx-auto max-w-3xl relative">
          {emojiOpen && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-0 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-5">
              <EmojiPicker
                theme={Theme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                width={320}
                height={400}
                searchPlaceHolder="Procurar emoji…"
                onEmojiClick={(emojiData) => {
                  setText((t) => t + emojiData.emoji);
                }}
              />
            </div>
          )}
          
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                emojiOpen
                  ? 'bg-slate-200 text-slate-800'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label="Emojis"
            >
              <Smile className="h-6 w-6" />
            </button>
            
            <div className="relative flex min-w-0 flex-1 items-end">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (text.trim() && !sending) {
                      onSubmit(e as unknown as React.FormEvent);
                    }
                  }
                }}
                placeholder="Escreva uma mensagem..."
                rows={1}
                className="w-full max-h-32 min-h-[44px] resize-none rounded-2xl border border-slate-200 bg-[#f0f2f5] py-2.5 pl-4 pr-12 text-[15px] text-slate-800 shadow-inner outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200/50 leading-relaxed"
                style={{ height: text ? 'auto' : '44px' }}
              />
            </div>

            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              aria-label="Enviar"
            >
              <Send className="h-5 w-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { ArrowLeft, Send, Smile, Info, CheckCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { formatRelativeTime, getDateSeparatorLabel, getDayKey } from '../utils/formatRelativeTime';
import { getChatTheme, DEFAULT_CHAT_THEME, type ChatThemeId } from '../utils/chatThemes';
import { sendDirectMessage, subscribeThread, threadIdFor, type DirectMessage } from '../services/directMessages';
import { subscribePresence } from '../services/presence';
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
  const [chatTheme, setChatTheme] = useState(getChatTheme(DEFAULT_CHAT_THEME));
  const [peerOnline, setPeerOnline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const threadId = me && otherUid ? threadIdFor(me.uid, otherUid) : '';

  // Carrega tema do chat do usuário
  useEffect(() => {
    if (!me?.uid) return;
    getDoc(doc(db, 'users', me.uid)).then((snap) => {
      if (snap.exists()) {
        const themeId = snap.data()?.prefs?.chatTheme as ChatThemeId | undefined;
        setChatTheme(getChatTheme(themeId));
      }
    }).catch(console.error);
  }, [me?.uid]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeThread(threadId, setMessages, console.error);
  }, [threadId]);

  // Assina presença real do outro usuário
  useEffect(() => {
    if (!otherUid) return;
    return subscribePresence(otherUid, (status) => {
      setPeerOnline(status.online);
    });
  }, [otherUid]);

  // Scroll suave para o final
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
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

  // Auto-resize do textarea
  const handleTextChange = (value: string) => {
    setText(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 132)}px`;
    }
  };

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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setEmojiOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  // Agrupa mensagens por dia para separadores de data
  const messagesWithSeparators = useMemo(() => {
    const result: Array<{ type: 'separator'; label: string; key: string } | { type: 'message'; msg: DirectMessage; index: number }> = [];
    let lastDayKey = '';
    let sepIndex = 0;

    messages.forEach((msg, index) => {
      const dayKey = getDayKey(msg.createdAt);
      if (dayKey !== lastDayKey) {
        result.push({ type: 'separator', label: getDateSeparatorLabel(msg.createdAt), key: `sep-${sepIndex++}` });
        lastDayKey = dayKey;
      }
      result.push({ type: 'message', msg, index });
    });

    return result;
  }, [messages]);

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
    <div className={`flex min-h-dvh flex-col font-sans text-slate-900 selection:bg-slate-200 transition-colors duration-500 ${chatTheme.bg}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <Link to="/mensagens" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-95" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to={`/u/${otherUid}`} className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all hover:bg-slate-100/70 active:scale-[0.98]">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm">
                {peer.photo ? (
                  <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800 text-[11px] font-black text-white">
                    {peer.initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-bold text-slate-900 leading-tight">{peer.label}</h1>
                <p className={`flex items-center gap-1 text-[11px] font-medium ${peerOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${peerOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {peerOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </Link>
          </div>
          <Link to={`/u/${otherUid}`} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95">
            <Info className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Chat Area */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4">
        <div className={`flex flex-1 flex-col rounded-2xl border border-slate-200/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-500 ${chatTheme.chatBg}`}>
          <div
            ref={chatContainerRef}
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 sm:p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {messages.length === 0 && (
              <div className="my-auto flex flex-col items-center text-center px-4">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
                  <Smile className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-lg font-bold text-slate-800">Diga olá! 👋</p>
                <p className="mt-1.5 text-sm font-medium text-slate-500 max-w-xs leading-relaxed">
                  Esta conversa é privada. As mensagens aparecem instantaneamente para {peer.label}.
                </p>
              </div>
            )}
            
            {messagesWithSeparators.map((item) => {
              if (item.type === 'separator') {
                return (
                  <div key={item.key} className="flex justify-center my-2 first:mt-0">
                    <span className="inline-block rounded-full bg-black/5 dark:bg-white/10 px-3.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur-md">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const m = item.msg;
              const index = item.index;
              const mine = m.fromId === me.uid;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
              const isFirstInGroup = !prevMsg || prevMsg.fromId !== m.fromId;
              const isLastInGroup = !nextMsg || nextMsg.fromId !== m.fromId;
              
              return (
                <div
                  key={m.id}
                  className={`flex w-full items-end gap-1.5 px-1 transition-all duration-200 hover:opacity-100 ${
                    mine ? 'justify-end pl-10 sm:pl-16' : 'justify-start pr-10 sm:pr-16'
                  } ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}
                >
                  {/* Avatar do outro usuário (só no primeiro da grupo) */}
                  {!mine && isFirstInGroup && (
                    <Link
                      to={`/u/${otherUid}`}
                      className="mb-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm transition-transform hover:scale-105"
                      aria-label={`Perfil de ${peer.label}`}
                    >
                      {peer.photo ? (
                        <img src={peer.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700 text-[8px] font-black text-white">
                          {peer.initials}
                        </div>
                      )}
                    </Link>
                  )}
                  {!mine && !isFirstInGroup && <div className="w-7 shrink-0" />}

                  <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[82%] sm:max-w-[72%]`}>
                    {/* Bolha da mensagem */}
                    <div
                      className={`relative w-fit px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${
                        mine
                          ? 'bg-slate-800 text-white rounded-2xl rounded-br-md hover:bg-slate-700'
                          : 'bg-white text-slate-800 border border-slate-200/70 rounded-2xl rounded-bl-md hover:bg-slate-50/80'
                      } ${isFirstInGroup && isLastInGroup ? 'rounded-2xl' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                    
                    {/* Timestamps */}
                    <div className={`mt-0.5 flex items-center gap-1 px-1 ${mine ? 'flex-row' : 'flex-row'}`}>
                      <span className="text-[10px] font-semibold text-slate-400/80">
                        {formatRelativeTime(m.createdAt)}
                      </span>
                      {mine && (
                        <CheckCheck className="h-3 w-3 text-slate-400/60" />
                      )}
                    </div>
                  </div>

                  {/* Avatar do próprio usuário */}
                  {mine && isLastInGroup && (
                    <div className="mb-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm">
                      {selfPhoto ? (
                        <img src={selfPhoto} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700 text-[8px] font-black text-white">
                          {self.initials}
                        </div>
                      )}
                    </div>
                  )}
                  {mine && !isLastInGroup && <div className="w-7 shrink-0" />}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:px-4">
        <div className="mx-auto max-w-3xl relative">
          {/* Emoji Picker */}
          {emojiOpen && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-0 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
              <EmojiPicker
                theme={Theme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                width={332}
                height={420}
                searchPlaceHolder="Procurar emoji…"
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                onEmojiClick={(emojiData) => {
                  handleTextChange(text + emojiData.emoji);
                }}
              />
            </div>
          )}
          
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            {/* Botão Emoji */}
            <button
              type="button"
              onClick={() => setEmojiOpen((o) => !o)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 active:scale-90 ${
                emojiOpen
                  ? 'bg-slate-800 text-white shadow-md scale-105'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" strokeWidth={1.8} />
            </button>
            
            {/* Campo de texto */}
            <div className="relative flex min-w-0 flex-1 items-end">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
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
                className="w-full max-h-32 resize-none rounded-2xl border border-slate-200/80 bg-[#f0f2f5] py-2.5 pl-4 pr-4 text-[15px] text-slate-800 shadow-inner outline-none transition-all duration-200 focus:border-slate-300/80 focus:bg-white focus:ring-2 focus:ring-slate-200/40 leading-relaxed placeholder:text-slate-400 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              />
            </div>

            {/* Botão Enviar */}
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-90 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <Send className="h-5 w-5 ml-0.5" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, UserRound, TrendingUp } from 'lucide-react';
import { searchUsersByPrefix, type PublicUserRow } from '../services/userSearch';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';

type Props = {
  open: boolean;
  onClose: () => void;
  excludeUid?: string;
};

/** Overlay full‑screen de pesquisa profissional — Instagram‑inspired, responsivo. */
export default function SearchOverlay({ open, onClose, excludeUid }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rows, setRows] = useState<PublicUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setDebounced('');
      setRows([]);
    }
  }, [open]);

  // Debounce
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  // Search
  useEffect(() => {
    if (debounced.length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchUsersByPrefix(debounced, excludeUid).then((r) => {
      if (!cancelled) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [debounced, excludeUid]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function goToProfile(id: string) {
    onClose();
    navigate(`/u/${id}`);
  }

  if (!open) return null;

  const showResults = query.trim().length >= 2;
  const hasResults = rows.length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in duration-150">
      {/* Top bar with input - responsivo */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 px-3 sm:px-5 md:px-8 py-3">
        <div className="relative flex-1 max-w-xl mx-auto">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
          </div>
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar pessoas..."
            className="w-full rounded-xl sm:rounded-2xl border-2 border-slate-200 bg-slate-50 py-2.5 sm:py-3 pl-9 sm:pl-12 pr-9 sm:pr-12 text-[15px] sm:text-[17px] text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:shadow-lg"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] font-bold text-slate-600 transition hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>

      {/* Content area - responsivo */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-3 sm:px-5 md:px-8 py-4 sm:py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-slate-400" />
              </div>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base font-semibold text-slate-500">A pesquisar...</p>
            </div>
          )}

          {!loading && showResults && !hasResults && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-slate-100">
                <UserRound className="h-7 w-7 sm:h-8 sm:w-8 text-slate-300" />
              </div>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg font-bold text-slate-700">Nenhum resultado</p>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                Tenta outro termo de pesquisa.
              </p>
            </div>
          )}

          {!loading && showResults && hasResults && (
            <div>
              <p className="mb-2 sm:mb-3 text-[11px] sm:text-[13px] font-bold uppercase tracking-widest text-slate-400">
                Resultados
              </p>
              <div className="space-y-0.5">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="group flex items-center justify-between gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 transition-colors hover:bg-slate-50 cursor-pointer"
                    onClick={() => goToProfile(r.id)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <div className="shrink-0">
                        <UserAvatar
                          photo={r.photoURL}
                          initials={r.fullName.slice(0, 2).toUpperCase()}
                          alt={r.fullName}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] sm:text-[15px] font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                          {r.fullName}
                        </p>
                        {r.email && (
                          <p className="truncate text-[12px] sm:text-[13px] font-medium text-slate-500">
                            {r.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {excludeUid && excludeUid !== r.id && (
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <FollowButton viewerId={excludeUid} targetId={r.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {debounced.length >= 2 && (
                <div className="mt-3 sm:mt-4 border-t border-slate-100 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/explorar?q=${encodeURIComponent(debounced)}`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-slate-800 px-4 sm:px-5 py-2.5 sm:py-3 text-[13px] sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-900 hover:shadow-md active:scale-[0.99]"
                  >
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Ver todos os resultados
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !showResults && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
                <TrendingUp className="h-7 w-7 sm:h-9 sm:w-9 text-slate-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-800">Pesquisar pessoas</p>
              <p className="mt-1 sm:mt-2 text-[13px] sm:text-[15px] font-medium text-slate-400 max-w-xs sm:max-w-sm">
                Encontra outros cinéfilos, segue os teus favoritos e descobre o que andam a ver.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wide transition hover:bg-slate-200 cursor-default">Cinéfilo</span>
                <span className="rounded-full bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wide transition hover:bg-slate-200 cursor-default">Crítico</span>
                <span className="rounded-full bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wide transition hover:bg-slate-200 cursor-default">Colecionador</span>
                <span className="rounded-full bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wide transition hover:bg-slate-200 cursor-default">Maratonista</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
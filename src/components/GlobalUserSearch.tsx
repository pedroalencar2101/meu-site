import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Search, UserRound, X } from 'lucide-react';
import { searchUsersByPrefix, type PublicUserRow } from '../services/userSearch';
import FollowButton from './FollowButton';
import UserAvatar from './UserAvatar';

type Props = {
  excludeUid?: string;
  viewerId?: string;
  className?: string;
  /** Valor inicial (ex.: query na URL /explorar). */
  initialQuery?: string;
  /** Em páginas internas o dropdown pode ser mais largo. */
  variant?: 'navbar' | 'page';
};

export default function GlobalUserSearch({
  excludeUid,
  viewerId,
  className = '',
  initialQuery = '',
  variant = 'navbar',
}: Props) {
  const listId = useId();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const [rows, setRows] = useState<PublicUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setDebounced(initialQuery.trim());
  }, [initialQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

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
    return () => {
      cancelled = true;
    };
  }, [debounced, excludeUid]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showPanel = open && query.trim().length > 0;
  const hintShort = query.trim().length > 0 && query.trim().length < 2;

  function goToProfile(id: string) {
    setOpen(false);
    setQuery('');
    navigate(`/u/${id}`);
  }

  return (
    <div
      ref={rootRef}
      className={`group relative min-w-0 flex-1 ${variant === 'navbar' ? 'max-w-[min(100%,18rem)] sm:max-w-xs md:max-w-sm lg:max-w-md' : 'max-w-lg'} ${className}`}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-slate-700"
        aria-hidden
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Enter' && debounced.length >= 2) {
            navigate(`/explorar?q=${encodeURIComponent(debounced)}`);
            setOpen(false);
          }
        }}
        placeholder="Pesquisar pessoas…"
        className="noctal-search-input pl-9 pr-9"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setRows([]);
          }}
          className="noctal-icon-btn absolute right-1 top-1/2 z-10 !p-1.5 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          aria-label="Limpar pesquisa"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className={`noctal-interactive absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-300/25 ${
            variant === 'page' ? '' : 'max-h-[min(24rem,60vh)]'
          }`}
        >
          {hintShort && (
            <p className="px-4 py-3 text-center text-xs font-medium text-slate-500">
              Escreve pelo menos 2 caracteres
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              A pesquisar…
            </div>
          )}

          {!loading && debounced.length >= 2 && rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum utilizador encontrado.</p>
          )}

          {!loading && rows.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {rows.slice(0, 8).map((r) => (
                <li key={r.id} role="option">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() => goToProfile(r.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 text-left transition-transform active:scale-[0.99]"
                    >
                      <UserAvatar
                        photo={r.photoURL}
                        initials={r.fullName.slice(0, 2).toUpperCase()}
                        alt={r.fullName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{r.fullName}</p>
                        {r.email && <p className="truncate text-xs text-slate-500">{r.email}</p>}
                      </div>
                    </button>
                    {viewerId && viewerId !== r.id && (
                      <FollowButton viewerId={viewerId} targetId={r.id} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {debounced.length >= 2 && !loading && (
            <Link
              to={`/explorar?q=${encodeURIComponent(debounced)}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <UserRound className="h-3.5 w-3.5" />
              Ver todos os resultados
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

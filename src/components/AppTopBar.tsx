import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, Search } from 'lucide-react';
import type { User } from 'firebase/auth';
import NoctalBrand from './NoctalBrand';
import SearchOverlay from './SearchOverlay';

export type TopNavActive = 'home' | 'profile' | 'filmes';

type Props = {
  activeNav: TopNavActive;
  user: User | null;
  notifUnread?: number;
  navAvatarSrc?: string | null;
  navAvatarInitials?: string;
  navAvatarAlt?: string;
};

/** Barra superior minimalista — a pesquisa abre um overlay profissional. */
export default function AppTopBar({
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  activeNav: _activeNav,
  user,
  notifUnread = 0,
  navAvatarSrc,
  navAvatarInitials = '?',
  navAvatarAlt = 'Perfil',
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex w-full max-w-[100vw] min-w-0 items-center gap-3 px-3 py-2 sm:px-5 sm:py-2.5 lg:max-w-[1200px]">
          {/* Logo */}
          <NoctalBrand />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* Search trigger - opens overlay */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="noctal-icon-btn"
              aria-label="Pesquisar pessoas"
              title="Pesquisar"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link to="/mensagens" className="noctal-icon-btn" aria-label="Mensagens" title="Mensagens">
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link to="/notificacoes" className="noctal-icon-btn relative" aria-label="Notificações" title="Notificações">
              <Bell className="h-5 w-5" />
              {notifUnread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </Link>
            <Link
              to="/profile"
              className="ml-0.5 flex shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95 sm:ml-1"
              title="O meu perfil"
            >
              {navAvatarSrc ? (
                <img
                  src={navAvatarSrc}
                  alt={navAvatarAlt}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border-2 border-slate-200 object-cover shadow-sm ring-2 ring-white sm:h-9 sm:w-9"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-gradient-to-tr from-slate-700 to-slate-900 text-[11px] font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-xs">
                  {navAvatarInitials}
                </div>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        excludeUid={user?.uid}
      />
    </>
  );
}
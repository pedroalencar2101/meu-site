import { Link } from 'react-router-dom';
import { Bell, Film, Home, MessageCircle, Users } from 'lucide-react';
import type { User } from 'firebase/auth';
import NoctalBrand from './NoctalBrand';
import GlobalUserSearch from './GlobalUserSearch';

export type TopNavActive = 'home' | 'profile' | 'filmes';

type Props = {
  activeNav: TopNavActive;
  user: User | null;
  notifUnread?: number;
  navAvatarSrc?: string | null;
  navAvatarInitials?: string;
  navAvatarAlt?: string;
};

/** Barra superior unificada: marca, pesquisa de pessoas, navegação e ações. */
export default function AppTopBar({
  activeNav,
  user,
  notifUnread = 0,
  navAvatarSrc,
  navAvatarInitials = '?',
  navAvatarAlt = 'Perfil',
}: Props) {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex w-full max-w-[100vw] min-w-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5 lg:max-w-[1200px]">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <NoctalBrand />
          <GlobalUserSearch excludeUid={user?.uid} viewerId={user?.uid} />
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 rounded-2xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60 lg:flex">
          <Link
            to="/"
            className={`noctal-nav-pill ${activeNav === 'home' ? 'noctal-nav-pill--active' : ''}`}
            aria-current={activeNav === 'home' ? 'page' : undefined}
            title="Início"
          >
            <Home className="h-6 w-6" />
          </Link>
          <Link
            to="/profile"
            className={`noctal-nav-pill ${activeNav === 'profile' ? 'noctal-nav-pill--active' : ''}`}
            aria-current={activeNav === 'profile' ? 'page' : undefined}
            title="Perfil"
          >
            <Users className="h-6 w-6" />
          </Link>
          <Link
            to="/em-cartaz"
            className={`noctal-nav-pill ${activeNav === 'filmes' ? 'noctal-nav-pill--active' : ''}`}
            aria-current={activeNav === 'filmes' ? 'page' : undefined}
            title="Filmes"
          >
            <Film className="h-6 w-6" />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
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
            className="noctal-interactive ml-0.5 flex shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95 sm:ml-1"
            title="O meu perfil"
          >
            {navAvatarSrc ? (
              <img
                src={navAvatarSrc}
                alt={navAvatarAlt}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full border border-slate-300 object-cover shadow-sm ring-2 ring-white sm:h-10 sm:w-10"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-gradient-to-tr from-slate-700 to-slate-900 text-xs font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-sm">
                {navAvatarInitials}
              </div>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}

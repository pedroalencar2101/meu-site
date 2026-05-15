import { Link, useLocation } from 'react-router-dom';
import { Film, Home, List, UserRoundSearch, Users } from 'lucide-react';

function Item({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[9px] font-black uppercase tracking-wide transition-all duration-200 ease-out sm:py-2 sm:text-[10px] ${
        active
          ? 'scale-[1.02] bg-white text-slate-900 shadow-md ring-1 ring-slate-200/80'
          : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 active:scale-95'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center transition-transform duration-200 [&>svg]:h-5 [&>svg]:w-5 ${
          active ? 'scale-110' : ''
        }`}
      >
        {icon}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}

/** Navegação principal em ecrãs &lt; lg (substitui ícones centrais da barra superior). */
export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-[#f0f2f5]/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md sm:px-2 lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 sm:gap-1">
        <Item to="/" label="Início" icon={<Home />} active={pathname === '/'} />
        <Item
          to="/lista-para-ver"
          label="Lista"
          icon={<List />}
          active={pathname.startsWith('/lista-para-ver')}
        />
        <Item to="/em-cartaz" label="Filmes" icon={<Film />} active={pathname.startsWith('/em-cartaz')} />
        <Item to="/profile" label="Perfil" icon={<Users />} active={pathname === '/profile'} />
        <Item to="/explorar" label="Pessoas" icon={<UserRoundSearch />} active={pathname.startsWith('/explorar')} />
      </div>
    </nav>
  );
}

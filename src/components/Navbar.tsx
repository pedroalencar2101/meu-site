import { Bell, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlobalUserSearch from './GlobalUserSearch';
import NoctalBrand from './NoctalBrand';

/** Barra escura (legado) — alinhada com a identidade visual atual. */
export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-noctal-slate/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <NoctalBrand className="[&_.noctal-brand-text]:!inline" />

        <div className="hidden max-w-md flex-1 md:block">
          <GlobalUserSearch variant="navbar" className="max-w-none [&_.noctal-search-input]:border-white/10 [&_.noctal-search-input]:bg-noctal-dark [&_.noctal-search-input]:text-white [&_.noctal-search-input]:placeholder:text-noctal-silver" />
        </div>

        <div className="flex items-center gap-2">
          <Link to="/mensagens" className="noctal-icon-btn text-noctal-silver hover:!bg-white/10 hover:!text-white">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link to="/notificacoes" className="noctal-icon-btn text-noctal-silver hover:!bg-white/10 hover:!text-white">
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-noctal-charcoal text-noctal-silver transition-all duration-200 hover:border-white/40 hover:text-white"
            aria-label="Perfil"
          />
        </div>
      </div>
    </nav>
  );
}

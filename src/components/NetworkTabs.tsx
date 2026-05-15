import { Link } from 'react-router-dom';

type Tab = 'followers' | 'following';

type Props = {
  active: Tab;
  /** Rotas absolutas para cada separador. */
  followersHref: string;
  followingHref: string;
  className?: string;
};

/** Separadores Seguidores / Seguindo — estilo unificado. */
export default function NetworkTabs({ active, followersHref, followingHref, className = '' }: Props) {
  const tabClass = (on: boolean) =>
    `rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-all duration-200 ${
      on
        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]'
        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]'
    }`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link to={followersHref} className={tabClass(active === 'followers')}>
        Seguidores
      </Link>
      <Link to={followingHref} className={tabClass(active === 'following')}>
        Seguindo
      </Link>
    </div>
  );
}

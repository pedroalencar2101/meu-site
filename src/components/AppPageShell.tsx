import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';
import NoctalBrand from './NoctalBrand';

type Props = {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  children: React.ReactNode;
};

/** Layout consistente para páginas internas (fundo, cabeçalho, área segura, navegação móvel). */
export default function AppPageShell({
  title,
  description,
  backTo = '/',
  backLabel = 'Feed',
  children,
}: Props) {
  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link
            to={backTo}
            className="noctal-icon-btn shrink-0 !p-2"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <NoctalBrand className="hidden sm:flex" />
          <div className="min-w-0 flex-1 border-l border-slate-200/80 pl-3 sm:pl-4">
            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">{title}</h1>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">{description}</p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-4xl px-3 py-6 sm:px-4 sm:py-8">{children}</main>
      <MobileBottomNav />
    </div>
  );
}

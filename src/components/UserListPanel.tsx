import { Link } from 'react-router-dom';
import { UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  count?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  children: ReactNode;
  /** Lista densa ou grelha de cards em ecrãs largos. */
  variant?: 'list' | 'grid';
  className?: string;
};

/** Contentor profissional para listas de utilizadores. */
export default function UserListPanel({
  title,
  description,
  viewAllHref,
  viewAllLabel = 'Ver todos',
  count,
  emptyTitle = 'Ninguém por aqui ainda',
  emptyDescription,
  isEmpty,
  children,
  variant = 'list',
  className = '',
}: Props) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/30 ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
              {count !== undefined && (
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-slate-700">
                  {count}
                </span>
              )}
            </div>
            {description && <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="text-xs font-bold text-violet-700 underline decoration-violet-300 underline-offset-2 transition-colors hover:text-violet-900"
          >
            {viewAllLabel}
          </Link>
        )}
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <UserRound className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-800">{emptyTitle}</p>
          {emptyDescription && (
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div
          className={
            variant === 'grid'
              ? 'grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-2'
              : 'divide-y divide-slate-100'
          }
        >
          {children}
        </div>
      )}
    </section>
  );
}

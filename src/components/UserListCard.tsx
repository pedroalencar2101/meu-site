import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useLiveUserCard } from '../hooks/useLiveUserCard';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';

export type UserListCardProps = {
  uid: string;
  subtitle?: string;
  meta?: string;
  viewerId?: string;
  showFollow?: boolean;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  layout?: 'row' | 'card';
  className?: string;
  linkTo?: string;
  name?: string;
  photo?: string | null;
  email?: string;
};

export default function UserListCard({
  uid,
  subtitle,
  meta,
  viewerId,
  showFollow = false,
  showChevron = true,
  trailing,
  layout = 'row',
  className = '',
  linkTo,
  name: nameOverride,
  photo: photoOverride,
  email: emailOverride,
}: UserListCardProps) {
  const live = useLiveUserCard(nameOverride ? undefined : uid);

  const loading = !nameOverride && live === null;
  const label = nameOverride ?? live?.label ?? '…';
  const photo = photoOverride !== undefined ? photoOverride : (live?.photo ?? null);
  const initials =
    nameOverride && !photo
      ? (nameOverride.slice(0, 2).toUpperCase() || '?')
      : (live?.initials ?? (label.slice(0, 2).toUpperCase() || '?'));
  const secondary = subtitle ?? emailOverride?.trim() ?? undefined;

  const profileHref = linkTo ?? `/u/${uid}`;
  const avatarSize = layout === 'card' ? 'lg' : 'md';

  const baseRow =
    'group flex w-full items-center gap-3 sm:gap-4 transition-all duration-200 ease-out';
  const shellClass =
    layout === 'card'
      ? `${baseRow} rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md active:scale-[0.99]`
      : `${baseRow} px-4 py-3.5 hover:bg-slate-50/90 sm:px-5 sm:py-4`;

  const avatarBlock = loading ? (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  ) : (
    <UserAvatar photo={photo} initials={initials} alt={label} size={avatarSize} />
  );

  const textBlock = (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[15px] font-bold leading-tight text-slate-900 sm:text-base">{label}</p>
        {meta && <span className="shrink-0 text-[11px] font-semibold text-slate-400">{meta}</span>}
      </div>
      {secondary && <p className="mt-0.5 truncate text-xs font-medium text-slate-500 sm:text-sm">{secondary}</p>}
    </div>
  );

  const actionBlock =
    trailing ??
    (showFollow && viewerId ? (
      <FollowButton viewerId={viewerId} targetId={uid} className="shrink-0" />
    ) : showChevron ? (
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
    ) : null);

  if (trailing) {
    return (
      <div className={`${shellClass} ${className}`}>
        <Link to={profileHref} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {avatarBlock}
          {textBlock}
        </Link>
        <div className="shrink-0">{trailing}</div>
      </div>
    );
  }

  return (
    <Link to={profileHref} className={`${shellClass} ${className}`}>
      {avatarBlock}
      {textBlock}
      {actionBlock}
    </Link>
  );
}

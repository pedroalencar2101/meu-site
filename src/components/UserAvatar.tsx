type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, { box: string; text: string; ring: string }> = {
  sm: { box: 'h-10 w-10', text: 'text-[11px]', ring: 'ring-2' },
  md: { box: 'h-12 w-12', text: 'text-xs', ring: 'ring-2' },
  lg: { box: 'h-14 w-14', text: 'text-sm', ring: 'ring-2' },
  xl: { box: 'h-16 w-16', text: 'text-base', ring: 'ring-[3px]' },
};

type Props = {
  photo: string | null;
  initials: string;
  alt?: string;
  size?: Size;
  className?: string;
};

/** Avatar circular com foto ou iniciais — identidade visual Noctal. */
export default function UserAvatar({ photo, initials, alt = '', size = 'md', className = '' }: Props) {
  const s = sizeClasses[size];
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-md ${s.box} ${s.ring} ring-white ${className}`}
    >
      {photo ? (
        <img src={photo} alt={alt} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center font-black text-white ${s.text}`}>
          {initials}
        </span>
      )}
    </div>
  );
}

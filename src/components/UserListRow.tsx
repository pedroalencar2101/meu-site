import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ChevronRight } from 'lucide-react';

type Props = { uid: string; hint?: string };

export default function UserListRow({ uid, hint }: Props) {
  const [label, setLabel] = useState('…');

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'users', uid)).then((s) => {
      if (cancelled) return;
      if (!s.exists()) {
        setLabel('Utilizador');
        return;
      }
      const x = s.data() as { fullName?: string; email?: string };
      setLabel((x.fullName && x.fullName.trim()) || x.email?.split('@')[0] || uid);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <li>
      <Link
        to={`/u/${uid}`}
        className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-400">
          {hint}
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>
    </li>
  );
}

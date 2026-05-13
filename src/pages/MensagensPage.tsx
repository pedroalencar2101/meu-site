import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { ArrowLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { db } from '../services/firebase';

type Row = { id: string; label: string };

export default function MensagensPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(40)));
        const list: Row[] = snap.docs.map((d) => {
          const x = d.data() as { fullName?: string; email?: string };
          const label = (x.fullName && x.fullName.trim()) || x.email || d.id;
          return { id: d.id, label };
        });
        setRows(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-100 via-violet-50/50 to-slate-200 font-sans text-slate-900">
      <header className="border-b border-violet-200/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link to="/" className="rounded-full p-2 text-slate-600 transition hover:bg-violet-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">Mensagens</h1>
            <p className="text-xs font-medium text-slate-500">Abre o perfil primeiro; o ícone abre o chat.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-violet-100/90 bg-white shadow-lg shadow-violet-100/40">
          {loading ? (
            <p className="p-8 text-center text-sm font-medium text-slate-500">A carregar…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Ainda não há utilizadores na coleção users.</p>
          ) : (
            <ul className="divide-y divide-violet-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-stretch">
                  <Link
                    to={`/u/${r.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 transition hover:bg-violet-50/80"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-black text-slate-700">
                      {r.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{r.label}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Ver perfil</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                  </Link>
                  <Link
                    to={`/mensagens/${r.id}`}
                    className="flex w-14 shrink-0 flex-col items-center justify-center border-l border-violet-100 bg-violet-50/50 text-violet-700 transition hover:bg-violet-100"
                    title="Abrir conversa"
                    aria-label={`Mensagem para ${r.label}`}
                  >
                    <MessageCircle className="h-6 w-6" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

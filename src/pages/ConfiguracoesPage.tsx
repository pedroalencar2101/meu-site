import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Bell, ChevronRight, LogOut, Shield, UserRound } from 'lucide-react';
import { auth, db } from '../services/firebase';
import AppPageShell from '../components/AppPageShell';

type UserPrefs = {
  compactFeed: boolean;
  cinemaDigest: boolean;
};

const defaultPrefs: UserPrefs = {
  compactFeed: false,
  cinemaDigest: true,
};

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    const u = user;
    if (!u) {
      setPrefs(defaultPrefs);
      setLoadingDoc(false);
      return;
    }
    let cancelled = false;
    setLoadingDoc(true);
    getDoc(doc(db, 'users', u.uid))
      .then((snap) => {
        if (cancelled) return;
        const p = snap.data()?.prefs as Partial<UserPrefs> | undefined;
        setPrefs({
          compactFeed: p?.compactFeed === true,
          cinemaDigest: p?.cinemaDigest !== false,
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const persistPrefs = async (patch: Partial<UserPrefs>) => {
    if (!user) return;
    const next = { ...prefs, ...patch };
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          prefs: {
            compactFeed: next.compactFeed,
            cinemaDigest: next.cinemaDigest,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setPrefs(next);
    } catch (e) {
      console.error(e);
      alert('Não foi possível guardar as preferências.');
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (e) {
      console.error(e);
      alert('Erro ao terminar sessão.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppPageShell title="Configurações" description="Conta, privacidade e preferências da experiência Noctal.">
      {!user ? (
        <p className="text-center text-sm font-medium text-slate-500">Inicia sessão para acederes às definições.</p>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                <UserRound className="h-4 w-4" /> Conta
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Email</p>
                  <p className="text-sm font-medium text-slate-600">{user.email ?? '—'}</p>
                </div>
              </div>
              <Link
                to="/profile"
                className="flex items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Editar perfil e publicações
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                <Bell className="h-4 w-4" /> Experiência
              </h2>
            </div>
            <div className="divide-y divide-slate-100 px-4 py-2">
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={prefs.compactFeed}
                  disabled={loadingDoc || saving}
                  onChange={(e) => void persistPrefs({ compactFeed: e.target.checked })}
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Feed mais compacto</span>
                  <span className="mt-0.5 block text-xs font-medium leading-relaxed text-slate-500">
                    Reduz espaçamento nos cartões do feed (preferência guardada na tua conta).
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={prefs.cinemaDigest}
                  disabled={loadingDoc || saving}
                  onChange={(e) => void persistPrefs({ cinemaDigest: e.target.checked })}
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Destaques de cinema</span>
                  <span className="mt-0.5 block text-xs font-medium leading-relaxed text-slate-500">
                    Indica interesse em novidades de filmes; usado para futuras notificações na app.
                  </span>
                </span>
              </label>
            </div>
            {saving && <p className="border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">A guardar…</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                <Shield className="h-4 w-4" /> Sessão
              </h2>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                Termina a sessão neste dispositivo. Precisarás de voltar a iniciar sessão para publicar ou enviar mensagens.
              </p>
              <button
                type="button"
                onClick={() => void onSignOut()}
                disabled={signingOut}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black uppercase tracking-wide text-red-800 transition hover:bg-red-100 disabled:opacity-60 sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'A sair…' : 'Terminar sessão'}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppPageShell>
  );
}

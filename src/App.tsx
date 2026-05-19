import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect, type ReactElement, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { goOnline, goOffline } from './services/presence';
import { usePushNotifications } from './hooks/usePushNotifications';

const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const EmCartazPage = lazy(() => import('./pages/EmCartazPage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const ExplorarPessoasPage = lazy(() => import('./pages/ExplorarPessoasPage'));
const UserConnectionsPage = lazy(() => import('./pages/UserConnectionsPage'));
const MensagensPage = lazy(() => import('./pages/MensagensPage'));
const MensagemThreadPage = lazy(() => import('./pages/MensagemThreadPage'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));
const PainelMensalPage = lazy(() => import('./pages/PainelMensalPage'));
const MinhasAvaliacoesPage = lazy(() => import('./pages/MinhasAvaliacoesPage'));
const SeguidoresRedePage = lazy(() => import('./pages/SeguidoresRedePage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));
const NotificacoesPage = lazy(() => import('./pages/NotificacoesPage'));
const ListaParaVerPage = lazy(() => import('./pages/ListaParaVerPage'));
import NoctalBrand from './components/NoctalBrand';

export default function App() {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const uidRef = useRef<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | undefined>(undefined);

  // Hook de notificações push (só ativo quando tem uid)
  usePushNotifications(currentUid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Marca usuário anterior como offline se mudou de conta
      if (uidRef.current && uidRef.current !== currentUser?.uid) {
        goOffline(uidRef.current);
      }

      // Marca novo usuário como online
      if (currentUser?.uid) {
        uidRef.current = currentUser.uid;
        setCurrentUid(currentUser.uid);
        goOnline(currentUser.uid);
      } else {
        uidRef.current = null;
        setCurrentUid(undefined);
      }
    });
    return () => unsubscribe();
  }, []);

  // Marca offline ao fechar/recarregar a página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (uidRef.current) {
        goOffline(uidRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (uidRef.current) {
        goOffline(uidRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-4">
        <div className="relative flex flex-col items-center justify-center animate-pulse">
          <NoctalBrand className="flex-col sm:flex-row [&_.noctal-brand-text]:!inline [&_.noctal-brand-text]:text-base" />
        </div>
      </div>
    );
  }

  const guard = (node: ReactElement) => (user ? node : <Navigate to="/login" replace />);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-4">
          <div className="relative flex flex-col items-center justify-center animate-pulse">
            <NoctalBrand className="flex-col sm:flex-row [&_.noctal-brand-text]:!inline [&_.noctal-brand-text]:text-base" />
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

        <Route path="/" element={guard(<Home />)} />
        <Route path="/profile" element={guard(<Profile />)} />

        <Route path="/em-cartaz" element={guard(<EmCartazPage />)} />
        <Route path="/em-cartaz/filme/:tmdbId" element={guard(<MovieDetailPage />)} />
        <Route path="/explorar" element={guard(<ExplorarPessoasPage />)} />
        <Route path="/u/:uid/seguidores" element={guard(<UserConnectionsPage />)} />
        <Route path="/u/:uid/seguindo" element={guard(<UserConnectionsPage />)} />
        <Route path="/u/:uid" element={guard(<Profile />)} />
        <Route path="/mensagens" element={guard(<MensagensPage />)} />
        <Route path="/mensagens/:uid" element={guard(<MensagemThreadPage />)} />

        <Route path="/painel" element={guard(<PainelMensalPage />)} />
        <Route path="/avaliacoes" element={guard(<MinhasAvaliacoesPage />)} />
        <Route path="/lista-para-ver" element={guard(<ListaParaVerPage />)} />
        <Route path="/seguidores" element={guard(<SeguidoresRedePage />)} />
        <Route path="/comunidades" element={guard(<PlaceholderPage title="Comunidades" subtitle="Grupos e fóruns em breve." />)} />
        <Route path="/configuracoes" element={guard(<ConfiguracoesPage />)} />
        <Route path="/notificacoes" element={guard(<NotificacoesPage />)} />

        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
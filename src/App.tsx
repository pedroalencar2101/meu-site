import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, type ReactElement } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';

import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import EmCartazPage from './pages/EmCartazPage';
import MovieDetailPage from './pages/MovieDetailPage';
import ExplorarPessoasPage from './pages/ExplorarPessoasPage';
import UserConnectionsPage from './pages/UserConnectionsPage';
import MensagensPage from './pages/MensagensPage';
import MensagemThreadPage from './pages/MensagemThreadPage';
import PlaceholderPage from './pages/PlaceholderPage';
import PainelMensalPage from './pages/PainelMensalPage';
import MinhasAvaliacoesPage from './pages/MinhasAvaliacoesPage';
import SeguidoresRedePage from './pages/SeguidoresRedePage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import NotificacoesPage from './pages/NotificacoesPage';
import ListaParaVerPage from './pages/ListaParaVerPage';

export default function App() {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-4">
        <div className="relative flex flex-col items-center justify-center animate-pulse">
          <img src="/logo.png" alt="Noctal" className="h-16 w-auto mb-4 object-contain sm:h-20 drop-shadow-md" />
          <h1 className="font-black uppercase tracking-[0.2em] text-slate-400 text-sm sm:text-base">
            Noctal
          </h1>
        </div>
      </div>
    );
  }

  const guard = (node: ReactElement) => (user ? node : <Navigate to="/login" replace />);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

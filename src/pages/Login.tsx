import { Lock, Film, Mail, ArrowRight, Phone, UserCircle } from 'lucide-react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { buildDisplaySearch } from '../utils/userDisplaySearch';

type PosterItem = { url: string; title: string };

export default function Login() {
  const navigate = useNavigate();
  const [posters, setPosters] = useState<PosterItem[]>([]);

  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
        if (!TMDB_KEY) {
          console.error('Defina VITE_TMDB_API_KEY no ficheiro .env na raiz do projeto.');
          return;
        }
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&api_key=${TMDB_KEY}`
        );
        const data = await response.json();
        const items: PosterItem[] = data.results.slice(0, 8).map(
          (movie: { poster_path: string | null; title?: string }) => ({
            url: `https://image.tmdb.org/t/p/w500${movie.poster_path ?? ''}`,
            title: movie.title || 'Poster',
          })
        );
        setPosters(items);
      } catch {
        console.error('Erro ao carregar catálogo.');
      } finally {
      }
    };
    fetchMovies();
  }, []);

  const scrollList = posters.length > 0 ? [...posters, ...posters, ...posters] : [];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        await setDoc(doc(db, 'users', user.uid), {
          fullName,
          phone,
          email,
          displaySearch: buildDisplaySearch(fullName, email),
          createdAt: serverTimestamp(),
        });

        await signOut(auth);
        setPassword('');
        setConfirmPassword('');
        setMessage(
          'Conta criada! Verifique seu e-mail para confirmar o cadastro; em seguida faça login.'
        );
        setIsRegistering(false);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await signOut(auth);
          setError('Por favor, confirme seu e-mail antes de acessar a conta.');
          return;
        }
        navigate('/');
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential')
        setError('Senha ou e-mail inválidos. Tente novamente.');
      else setError('Não foi possível concluir. Tente novamente.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Insira seu e-mail para verificação.');
      return;
    }
    setError('');
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        setError('Este e-mail não consta em nossa base de dados.');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de recuperação enviado com sucesso!');
    } catch {
      setError('Erro ao processar solicitação.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = cred.user;

      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email ?? '',
          fullName: user.displayName ?? '',
          displaySearch: buildDisplaySearch(user.displayName || undefined, user.email || undefined),
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      navigate('/');
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      if (code === 'auth/popup-closed-by-user') return;
      setError('Não foi possível entrar com o Google. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-gray-50 border-r border-gray-200/60">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-transparent to-gray-100 z-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-transparent to-transparent z-20 pointer-events-none"></div>

        <div className="absolute z-30 text-center flex flex-col items-center justify-center p-10 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 shadow-lg">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Film className="w-5 h-5 text-slate-500" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">
            Explore o cinema
            <br />
            que você{' '}
            <span className="bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-black">
              ama.
            </span>
          </h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">
            Descubra obras-primas em cartaz e conecte-se.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-6 transform -rotate-[8deg] scale-110">
          <div className="flex gap-6 animate-scroll-left hover:[animation-play-state:paused] transition-all">
            {scrollList.map((item, index) => (
              <img
                key={`row1-${index}`}
                src={item.url}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-48 h-72 object-cover rounded-2xl shadow-xl border border-slate-200/60 transition-transform duration-300 hover:scale-105"
              />
            ))}
          </div>
          <div className="flex gap-6 animate-scroll-right hover:[animation-play-state:paused] transition-all">
            {scrollList.map((item, index) => (
              <img
                key={`row2-${index}`}
                src={item.url}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-48 h-72 object-cover rounded-2xl shadow-xl border border-slate-200/60 transition-transform duration-300 hover:scale-105"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col relative z-10 bg-slate-100 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white rounded-full blur-[100px] opacity-90 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-slate-200/50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative z-20">
          <div className="w-full max-w-[500px] bg-white/60 backdrop-blur-3xl border border-white/80 rounded-[2.5rem] p-8 sm:p-14 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <img
                src="/logo.png"
                alt="Noctal"
                className="h-28 w-auto mb-1 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] object-contain"
              />
              <h2 className="text-5xl font-black tracking-[0.3em] uppercase bg-gradient-to-b from-gray-300 via-gray-400 to-gray-600 bg-clip-text text-transparent drop-shadow-sm ml-4">
                Noctal
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded-r-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-xs font-bold rounded-r-xl">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4 mb-6">
              {isRegistering && (
                <>
                  <div className="relative flex items-center group/input">
                    <UserCircle className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within/input:text-gray-700" />
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nome Completo"
                      className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 outline-none h-[56px] focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                  <div className="relative flex items-center group/input">
                    <Phone className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within/input:text-gray-700" />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Telefone"
                      className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 outline-none h-[56px] focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                </>
              )}

              <div className="relative flex items-center group/input">
                <Mail className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within/input:text-gray-700" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 outline-none h-[56px] focus:ring-4 focus:ring-gray-100"
                />
              </div>

              <div className="relative flex items-center group/input">
                <Lock className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within/input:text-gray-700" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 outline-none h-[56px] focus:ring-4 focus:ring-gray-100"
                />
              </div>

              {isRegistering && (
                <div className="relative flex items-center group/input">
                  <Lock className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within/input:text-gray-700" />
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetir Senha"
                    className="w-full bg-white/80 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-800 outline-none h-[56px] focus:ring-4 focus:ring-gray-100"
                  />
                </div>
              )}

              {!isRegistering && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-right text-[10px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-[0.2em]"
                >
                  Esqueceu a senha?
                </button>
              )}

              <button
                type="submit"
                className="w-full relative overflow-hidden bg-gradient-to-b from-gray-500 via-gray-600 to-gray-700 text-white font-bold py-4 rounded-2xl border border-gray-500 mt-2 h-[56px] flex items-center justify-center gap-2 shadow-lg"
              >
                {isRegistering ? 'Criar Conta' : 'Fazer Login'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setMessage('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                {isRegistering ? 'Já possui acesso? Faça Login' : 'Novo por aqui? Cadastre-se agora'}
              </button>
            </div>

            <div className="flex items-center gap-4 my-6 opacity-60">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-400"></div>
              <span className="text-gray-500 text-[11px] font-extrabold uppercase tracking-[0.2em]">Ou</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-400"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 h-[56px] shadow-sm hover:shadow-md transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar com o Google
            </button>
          </div>
        </div>

        <div className="relative z-20 w-full p-4 sm:p-6 mt-auto">
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-4 flex flex-col xl:flex-row items-center justify-between text-[11px] text-gray-500 font-medium shadow-sm">
            <span>Copyright © 2026 Noctal Inc. Todos os direitos reservados.</span>
            <div className="flex gap-4">
              <span className="font-bold uppercase text-gray-500">Brasil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

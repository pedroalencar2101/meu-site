import {
  Users,
  LayoutDashboard,
  Star,
  Image as ImageIcon,
  Settings,
  Send,
  Film,
  UserRoundSearch,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { useLiveUserCard } from '../hooks/useLiveUserCard';
import { useNoctalFeed } from '../hooks/useNoctalFeed';
import CommentsModal from '../components/CommentsModal';
import MobileBottomNav from '../components/MobileBottomNav';
import AppTopBar from '../components/AppTopBar';
import ConfirmModal from '../components/ConfirmModal';
import { deletePost } from '../services/feedPosts';
import { subscribeMyNotifications } from '../services/notifications';
import FeedPost from '../components/FeedPost';
import ShareModal from '../components/ShareModal';

type TmdbMovie = { id: number; title: string; poster_path: string | null };

function initialsFromUser(user: User | null): string {
  if (!user) return '?';
  const n = (user.displayName || user.email || '?').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function firstName(user: User | null): string {
  if (!user?.displayName?.trim()) return 'você';
  return user.displayName.trim().split(/\s+/)[0] ?? 'você';
}

export default function NoctalFeed() {
  const navigate = useNavigate();
  const { user, posts, error, handleCreatePost, handleReaction, followingCount } = useNoctalFeed();

  const [nowPlaying, setNowPlaying] = useState<TmdbMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<{ id: string; content: string } | null>(null);

  const displayName = user?.displayName || user?.email || 'Utilizador';
  const myInitials = initialsFromUser(user);
  const liveMe = useLiveUserCard(user?.uid);
  const navAvatarSrc = liveMe?.photo || user?.photoURL || null;
  const navAvatarInitials = liveMe?.initials || myInitials;
  const composerDisplayName = liveMe?.label?.trim() || displayName;

  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
        if (!TMDB_KEY) {
          console.error('Defina VITE_TMDB_API_KEY no .env');
          return;
        }
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&api_key=${TMDB_KEY}`
        );
        const data = await response.json();
        setNowPlaying((data.results ?? []).slice(0, 6) as TmdbMovie[]);
      } catch {
        console.error('Erro na API TMDB');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      const t = setTimeout(() => setNotifUnread(0), 0);
      return () => clearTimeout(t);
    }
    return subscribeMyNotifications(
      user.uid,
      (list) => setNotifUnread(list.filter((n) => !n.read).length),
      (e) => console.error(e)
    );
  }, [user?.uid]);

  const onCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !newPostText.trim() || isSubmittingPost) return;
    setIsSubmittingPost(true);
    try {
      await handleCreatePost(newPostText.trim(), null);
      setNewPostText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const openComments = (postId: string) => {
    setCommentsPostId(postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      await deletePost(postId, user.uid);
      if (commentsPostId === postId) setCommentsPostId(null);
    } catch (err) {
      console.error(err);
      alert('Não foi possível apagar o post. Verifica as regras do Firestore.');
    } finally {
      setConfirmDeletePostId(null);
    }
  };

  const commentsSnippet =
    posts.find((p) => p.id === commentsPostId)?.content.slice(0, 120) ?? '';

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 selection:bg-slate-300 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <AppTopBar
        activeNav="home"
        user={user}
        notifUnread={notifUnread}
        navAvatarSrc={navAvatarSrc}
        navAvatarInitials={navAvatarInitials}
        navAvatarAlt={composerDisplayName}
      />

      <main className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-6 px-3 pb-8 pt-[4.25rem] sm:px-4 sm:pt-20 lg:flex-row lg:justify-between lg:gap-6 lg:px-4 lg:pt-[5.25rem]">
        <aside className="sticky top-[4.5rem] hidden h-fit w-full min-w-0 max-w-[280px] flex-col gap-1 lg:flex lg:top-[5.5rem] xl:max-w-[300px]">
          <Link
            to="/profile"
            className="noctal-interactive mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm"
          >
            {navAvatarSrc ? (
              <img
                src={navAvatarSrc}
                alt={composerDisplayName}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-bold text-white">
                {navAvatarInitials}
              </div>
            )}
            <span className="text-[15px] font-bold text-slate-800">{composerDisplayName}</span>
          </Link>

          <Link
            to="/painel"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <LayoutDashboard className="h-6 w-6 text-slate-500 transition-colors group-hover:text-slate-700" />
            <span className="text-[15px] font-semibold">Painel Mensal</span>
          </Link>

          <Link
            to="/avaliacoes"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <Star className="h-6 w-6 text-slate-500" />
            <span className="text-[15px] font-semibold">Minhas Avaliações</span>
          </Link>

          <Link
            to="/lista-para-ver"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <Film className="h-6 w-6 text-slate-500" />
            <span className="text-[15px] font-semibold">Lista para ver</span>
          </Link>

          <Link
            to="/explorar"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <UserRoundSearch className="h-6 w-6 text-slate-500" />
            <span className="text-[15px] font-semibold">Procurar pessoas</span>
          </Link>

          <Link
            to="/seguidores"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <Users className="h-6 w-6 text-slate-500" />
            <span className="text-[15px] font-semibold">Seguidores</span>
          </Link>

          <div className="mx-3 my-2 border-t border-slate-200" />

          <Link
            to="/configuracoes"
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-slate-700 transition-all duration-200 hover:bg-white hover:shadow-sm"
          >
            <Settings className="h-6 w-6 text-slate-500" />
            <span className="text-[15px] font-semibold">Configurações</span>
          </Link>
        </aside>

        <section className="flex min-w-0 w-full max-w-[540px] flex-1 flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {!error && user && followingCount === 0 && posts.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-center shadow-sm">
              <Users className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-base font-bold text-slate-900">Seu feed está vazio</p>
              <p className="mt-2 text-sm text-slate-500">
                Siga outras pessoas para ver as publicações e avaliações delas aqui.
              </p>
              <Link
                to="/explorar"
                className="noctal-btn-primary mt-4 inline-flex"
              >
                <UserRoundSearch className="h-4 w-4" /> Procurar pessoas
              </Link>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <form id="noctal-home-create-post" onSubmit={onCreatePost}>
              <div className="mb-3 flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {navAvatarSrc ? (
                    <img src={navAvatarSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    navAvatarInitials
                  )}
                </Link>
                <input
                  type="text"
                  name="noctal-home-post-body"
                  autoComplete="off"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Qual obra-prima você assistiu hoje, ${firstName(user)}?`}
                  disabled={!user}
                  className="w-full cursor-text rounded-full bg-[#f0f2f5] px-4 py-2.5 text-[15px] font-medium text-slate-700 outline-none transition-all duration-200 hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-300/50 disabled:opacity-50"
                />
              </div>
              <div className="flex flex-wrap justify-stretch gap-2 border-t border-slate-100 px-1 pt-3 sm:flex-nowrap sm:justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/em-cartaz')}
                  className="flex min-h-[2.75rem] min-w-[5.5rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold text-slate-600 transition-all duration-200 hover:bg-[#f0f2f5] hover:shadow-sm active:scale-[0.98] sm:text-[14px]"
                >
                  <ImageIcon className="h-5 w-5 shrink-0 text-green-600 sm:h-6 sm:w-6" /> <span>Cena</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/avaliacoes')}
                  className="flex min-h-[2.75rem] min-w-[5.5rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold text-slate-600 transition-all duration-200 hover:bg-[#f0f2f5] hover:shadow-sm active:scale-[0.98] sm:text-[14px]"
                >
                  <Star className="h-5 w-5 shrink-0 text-yellow-500 sm:h-6 sm:w-6" /> <span>Avaliar</span>
                </button>
                <button
                  type="submit"
                  disabled={!newPostText.trim() || !user || isSubmittingPost}
                  className={`flex min-h-[2.75rem] min-w-[5.5rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-bold transition-all duration-200 sm:text-[14px] ${
                    newPostText.trim() && user && !isSubmittingPost
                      ? 'bg-slate-800 text-white shadow-sm hover:bg-slate-900 hover:shadow-md active:scale-[0.98]'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  <Send className="h-5 w-5 shrink-0 sm:h-5" /> <span>{isSubmittingPost ? 'A enviar…' : 'Postar'}</span>
                </button>
              </div>
            </form>
          </div>

          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              onReact={handleReaction}
              onOpenComments={openComments}
              onDelete={(id) => setConfirmDeletePostId(id)}
              onOpenShareModal={(id, content) => setSharePost({ id, content })}
            />
          ))}
        </section>

        <aside className="sticky top-[4.5rem] hidden h-fit w-full min-w-0 max-w-[280px] flex-col gap-5 xl:flex xl:top-[5.5rem] xl:max-w-[300px]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-widest text-slate-800">
              Em Cartaz
            </h3>
            {isLoading ? (
              <div className="grid animate-pulse grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[2/3] w-full rounded-md bg-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {nowPlaying.map((movie) => (
                  <button
                    type="button"
                    key={movie.id}
                    onClick={() => navigate(`/em-cartaz/filme/${movie.id}`)}
                    className="cursor-pointer overflow-hidden rounded-md border border-slate-200 shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w200${movie.poster_path ?? ''}`}
                      alt={movie.title}
                      title={movie.title}
                      referrerPolicy="no-referrer"
                      className="aspect-[2/3] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <Link
              to="/em-cartaz"
              className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#f0f2f5] py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-200 hover:shadow-sm"
            >
              Ver todos
            </Link>
          </div>

          <div className="mx-2 border-t border-slate-200" />

          <div className="px-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-500">Conversas</h3>
            </div>
            <Link
              to="/mensagens"
              className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-4 text-sm font-bold text-slate-600 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
            >
              Abrir mensagens
            </Link>
          </div>
        </aside>
      </main>

      <ConfirmModal
        isOpen={!!confirmDeletePostId}
        title="Apagar Post"
        message="Tem certeza que quer apagar este post para sempre? Esta ação não pode ser desfeita."
        confirmLabel="Apagar"
        onConfirm={() => confirmDeletePostId && handleDeletePost(confirmDeletePostId)}
        onCancel={() => setConfirmDeletePostId(null)}
        isDestructive={true}
      />
      {user && (
        <>
          <CommentsModal
            open={!!commentsPostId}
            postId={commentsPostId}
            postSnippet={commentsSnippet}
            onClose={() => setCommentsPostId(null)}
            uid={user.uid}
            displayName={composerDisplayName}
            myInitials={navAvatarInitials}
          />
          <ShareModal
            open={!!sharePost}
            onClose={() => setSharePost(null)}
            postId={sharePost?.id ?? ''}
            postContent={sharePost?.content ?? ''}
            currentUserId={user.uid}
            currentUserDisplayName={composerDisplayName}
          />
        </>
      )}
      <MobileBottomNav />
    </div>
  );
}

import {
  Home,
  Users,
  Film,
  MessageCircle,
  Bell,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Star,
  UserRoundSearch,
  MapPin,
  GraduationCap,
  Send,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { usePostsByAuthor } from '../hooks/usePostsByAuthor';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { formatPostTime } from '../utils/formatPostTime';
import { sharePostContent } from '../utils/sharePost';
import CommentsModal from '../components/CommentsModal';
import FollowButton from '../components/FollowButton';
import MobileBottomNav from '../components/MobileBottomNav';
import { deletePost } from '../services/feedPosts';
import { privacyOn, type ProfilePrivacy } from '../utils/profilePrivacy';

type FirestoreUserProfile = {
  fullName?: string;
  email?: string;
  photoURL?: string;
  username?: string;
  privacy?: ProfilePrivacy;
  phone?: string;
  website?: string;
  educationSchool?: string;
  educationField?: string;
  bio?: string;
  city?: string;
  coverPhotoUrl?: string;
  coverPhotoDataUrl?: string | null;
  avatarCustomDataUrl?: string | null;
};

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

export default function UserPublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const { followers, following } = useFollowCounts(uid);
  const { posts, error, handleReaction, user: viewer } = usePostsByAuthor(uid);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [postMenuId, setPostMenuId] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  useEffect(() => {
    const close = () => setPostMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', uid)).then((s) => {
      if (cancelled) return;
      setProfile(s.exists() ? (s.data() as FirestoreUserProfile) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const displayName =
    (profile?.fullName && profile.fullName.trim()) || profile?.email?.split('@')[0] || 'Utilizador';
  const photo = profile?.avatarCustomDataUrl?.trim() || profile?.photoURL || null;
  const initials = initialsFromName(displayName);
  const coverSrc = profile?.coverPhotoDataUrl?.trim() || profile?.coverPhotoUrl?.trim() || null;
  const isOwn = authUser?.uid === uid;
  const viewerName = authUser?.displayName || authUser?.email || 'Utilizador';
  const viewerInitials = initialsFromName(viewerName);

  const onShare = (text: string) => {
    void sharePostContent(text, typeof window !== 'undefined' ? window.location.href : undefined);
  };

  const handleDeletePost = async (postId: string) => {
    if (!authUser) return;
    if (!window.confirm('Apagar este post para sempre?')) return;
    try {
      await deletePost(postId, authUser.uid);
      if (commentsPostId === postId) setCommentsPostId(null);
    } catch (err) {
      console.error(err);
      alert('Não foi possível apagar o post.');
    } finally {
      setPostMenuId(null);
    }
  };

  if (!uid) {
    return (
      <div className="p-6 font-sans">
        <p>Perfil inválido.</p>
        <Link to="/" className="mt-2 text-sm font-bold text-slate-800">
          Início
        </Link>
      </div>
    );
  }

  const commentsSnippet = posts.find((p) => p.id === commentsPostId)?.content.slice(0, 120) ?? '';

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-12">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex w-full max-w-[100vw] min-w-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5 lg:max-w-[1200px]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link to="/" className="shrink-0 rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Início">
              <Home className="h-5 w-5" />
            </Link>
            <span className="hidden truncate text-sm font-black uppercase tracking-wide text-slate-800 min-[380px]:inline sm:text-base">
              Perfil público
            </span>
          </div>

          <div className="hidden shrink-0 items-center gap-0.5 rounded-2xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60 lg:flex">
            <Link to="/" className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/90" title="Início">
              <Home className="h-6 w-6" />
            </Link>
            <Link to="/profile" className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/90" title="Perfil">
              <Users className="h-6 w-6" />
            </Link>
            <Link to="/em-cartaz" className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/90" title="Filmes">
              <Film className="h-6 w-6" />
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/explorar"
              className="hidden rounded-full bg-[#f0f2f5] p-2 text-slate-700 hover:bg-slate-200 min-[420px]:inline-flex"
              aria-label="Procurar pessoas"
            >
              <UserRoundSearch className="h-5 w-5" />
            </Link>
            <Link to="/mensagens" className="rounded-full bg-[#f0f2f5] p-2 text-slate-700 hover:bg-slate-200 sm:p-2.5" aria-label="Mensagens">
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link to="/notificacoes" className="rounded-full bg-[#f0f2f5] p-2 text-slate-700 hover:bg-slate-200 sm:p-2.5" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </Link>
            <Link to="/profile" className="ml-0.5 shrink-0 rounded-full hover:bg-slate-100 sm:ml-1">
              {authUser?.photoURL ? (
                <img src={authUser.photoURL} alt="" className="h-9 w-9 rounded-full border border-slate-300 object-cover sm:h-10 sm:w-10" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
                  {viewerInitials}
                </div>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full min-w-0 max-w-[540px] px-3 pb-20 pt-[4.25rem] sm:px-4 sm:pt-20 lg:pb-12 lg:pt-[5.25rem]">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-lg">
          {coverSrc ? (
            <>
              <div className="h-36 w-full sm:h-44">
                <img src={coverSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            </>
          ) : (
            <div className="h-24 bg-gradient-to-r from-violet-700 via-indigo-700 to-slate-900 sm:h-28" />
          )}
          <div className="relative -mt-12 px-4 pb-5 pt-2 sm:-mt-14 sm:px-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative -mt-16 shrink-0 sm:-mt-20">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-slate-200 shadow-2xl ring-2 ring-slate-200/80 sm:h-32 sm:w-32">
                    {photo ? (
                      <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-700 to-slate-900 text-3xl font-black text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:pt-2 sm:text-left">
                  <h1 className="text-2xl font-black text-slate-900">{displayName}</h1>
                  {profile?.username?.trim() && (
                    <p className="mt-0.5 text-sm font-bold text-violet-600">@{profile.username.trim()}</p>
                  )}
                  {profile?.bio?.trim() && (
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{profile.bio.trim()}</p>
                  )}
                  {privacyOn(profile, 'showCity') && profile?.city?.trim() && (
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 sm:justify-start">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.city.trim()}
                    </p>
                  )}
                  {privacyOn(profile, 'showPhone') && profile?.phone?.trim() && (
                    <p className="mt-1 text-xs font-medium text-slate-600">{profile.phone.trim()}</p>
                  )}
                  {privacyOn(profile, 'showWebsite') && profile?.website?.trim() && (
                    <a
                      href={
                        profile.website.trim().startsWith('http')
                          ? profile.website.trim()
                          : `https://${profile.website.trim()}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-amber-800 underline"
                    >
                      {profile.website.trim()}
                    </a>
                  )}
                  {privacyOn(profile, 'showEducation') &&
                    (profile?.educationSchool?.trim() || profile?.educationField?.trim()) && (
                      <p className="mt-3 flex items-start justify-center gap-2 text-left text-xs font-semibold text-slate-700 sm:justify-start">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {profile?.educationSchool?.trim()}
                          {profile?.educationField?.trim() ? ` · ${profile.educationField.trim()}` : ''}
                        </span>
                      </p>
                    )}
                  {privacyOn(profile, 'showEmail') && profile?.email?.trim() && (
                    <p className="mt-2 text-xs font-medium text-slate-500">{profile.email.trim()}</p>
                  )}
                  {isOwn && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-700">És tu · edita em Perfil</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Link
                      to={`/u/${uid}/seguidores`}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
                    >
                      {followers} seguidores
                    </Link>
                    <Link
                      to={`/u/${uid}/seguindo`}
                      className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-violet-700"
                    >
                      {following} seguindo
                    </Link>
                  </div>
                  {authUser && !isOwn && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <FollowButton viewerId={authUser.uid} targetId={uid} className="px-6 py-2" />
                      <Link
                        to={`/mensagens/${uid}`}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-violet-800 shadow-sm transition hover:bg-violet-100"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Mensagem
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Publicações</h2>

        {posts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
            Ainda não há posts aqui.
          </div>
        )}

        {posts.map((post) => {
          const userLiked = post.myReaction === 'like';
          const userDisliked = post.myReaction === 'dislike';
          const canDelete = authUser && post.authorId === authUser.uid;
          return (
            <article key={post.id} className="relative mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-200 font-bold text-slate-600">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-bold text-white">
                        {post.authorInitials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-slate-900">{post.authorName}</p>
                    <p className="text-[13px] text-slate-500">{formatPostTime(post.createdAt)}</p>
                  </div>
                </div>
                {canDelete && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostMenuId((id) => (id === post.id ? null : post.id));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="rounded-full p-2 text-slate-500 hover:bg-[#f0f2f5]"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {postMenuId === post.id && (
                      <div
                        className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => void handleDeletePost(post.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left font-bold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Apagar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{post.content}</p>
              {post.movie && (
                <div className="mb-3 flex gap-3 rounded-xl border border-slate-900 bg-gradient-to-br from-slate-800 to-slate-900 p-3">
                  <img
                    src={post.movie.poster}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-[100px] w-[68px] rounded object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-black uppercase text-white">{post.movie.title}</h4>
                    <p className="text-xs text-slate-300">
                      {post.movie.year} · {post.movie.genre}
                    </p>
                    <div className="mt-1 flex gap-0.5 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < post.movie!.rating ? 'fill-current' : 'text-slate-600'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-1 pt-1 sm:flex-nowrap sm:justify-between">
                <button
                  type="button"
                  onClick={() => void handleReaction(post.id, 'like')}
                  className={`flex min-h-[2.75rem] min-w-0 flex-1 basis-[45%] items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold sm:basis-auto ${
                    userLiked ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-[#f0f2f5]'
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 shrink-0 ${userLiked ? 'fill-current' : ''}`} />
                  <span className="truncate">Curtir</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleReaction(post.id, 'dislike')}
                  className={`flex min-h-[2.75rem] min-w-0 flex-1 basis-[45%] items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold sm:basis-auto ${
                    userDisliked ? 'bg-red-50 text-red-600' : 'text-slate-600 hover:bg-[#f0f2f5]'
                  }`}
                >
                  <ThumbsDown className={`h-4 w-4 shrink-0 ${userDisliked ? 'fill-current' : ''}`} />
                  <span className="truncate">Não curti</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommentsPostId(post.id);
                    setPostMenuId(null);
                  }}
                  className="flex min-h-[2.75rem] min-w-0 flex-1 basis-[45%] items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold text-slate-600 hover:bg-[#f0f2f5] sm:basis-auto"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Comentar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShare(post.content)}
                  className="hidden min-h-[2.75rem] flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold text-slate-600 hover:bg-[#f0f2f5] sm:flex"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Partilhar
                </button>
              </div>
            </article>
          );
        })}
      </main>

      {viewer && (
        <CommentsModal
          open={!!commentsPostId}
          postId={commentsPostId}
          postSnippet={commentsSnippet}
          onClose={() => setCommentsPostId(null)}
          uid={viewer.uid}
          displayName={viewerName}
          myInitials={viewerInitials}
        />
      )}
      <MobileBottomNav />
    </div>
  );
}

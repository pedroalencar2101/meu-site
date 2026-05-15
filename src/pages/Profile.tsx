import {
  Camera,
  Edit3,
  Plus,
  MapPin,
  GraduationCap,
  Film,
  Send,
  Settings,
  X,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState, useRef } from 'react';
import { deleteField, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, updateProfile, updateEmail } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useNoctalFeed } from '../hooks/useNoctalFeed';
import { usePostsByAuthor } from '../hooks/usePostsByAuthor';
import { useFollowCounts } from '../hooks/useFollowCounts';
import { buildDisplaySearch } from '../utils/userDisplaySearch';
import { formatPostTime } from '../utils/formatPostTime';
import CommentsModal from '../components/CommentsModal';
import MobileBottomNav from '../components/MobileBottomNav';
import AppTopBar from '../components/AppTopBar';
import { subscribeMyNotifications } from '../services/notifications';
import FollowButton from '../components/FollowButton';
import UserListCard from '../components/UserListCard';
import UserListPanel from '../components/UserListPanel';
import { deletePost } from '../services/feedPosts';
import WatchlistHomePanel from '../components/WatchlistHomePanel';
import { useLiveUserCard } from '../hooks/useLiveUserCard';
import type { UiPost } from '../types/feed';
import { subscribeFollowersOf, subscribeFollowingOf, type FollowDoc } from '../services/follows';
import { deleteMovieReview, subscribeMyMovieReviews } from '../services/movieReviews';
import type { MovieReview } from '../types/movieReview';
import ConfirmModal from '../components/ConfirmModal';
import FeedPost from '../components/FeedPost';
import ShareModal from '../components/ShareModal';
import { getTmdbKey, posterUrl, tmdbGet, type TmdbMovieListItem, type TmdbSearchResponse } from '../services/tmdbClient';
import { imageFileToJpegDataUrl, isAllowedImageUrl } from '../utils/profileMedia';
import { privacyOn, type ProfilePrivacy } from '../utils/profilePrivacy';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=2000&auto=format&fit=crop';

/** Capas em alta resolução (Unsplash) — seleção rápida sem upload. */
const COVER_PRESETS = [
  DEFAULT_COVER,
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517604931448-7e0c8ed2963c?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=85&w=2400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=85&w=2400&auto=format&fit=crop',
];

type FavoriteMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
};

type FirestoreUserProfile = {
  fullName?: string;
  phone?: string;
  email?: string;
  displaySearch?: string;
  /** Nome de utilizador público (apenas letras minúsculas, números e _). */
  username?: string;
  privacy?: ProfilePrivacy;
  bio?: string;
  city?: string;
  website?: string;
  educationSchool?: string;
  educationField?: string;
  /** Capa por URL (https). */
  coverPhotoUrl?: string;
  /** Capa carregada do dispositivo (JPEG data URL comprimida). */
  coverPhotoDataUrl?: string | null;
  /** Avatar carregado do dispositivo (sobrepor à foto da conta). */
  avatarCustomDataUrl?: string | null;
  favoriteMovies?: FavoriteMovie[];
  photoURL?: string;
};

type ProfileTab = 'all' | 'about' | 'friends' | 'movies';

function initialsFromUser(user: User | null, fullNameOverride?: string | null): string {
  const n = (fullNameOverride || user?.displayName || user?.email || '?').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function firstName(display: string): string {
  const p = display.trim().split(/\s+/).filter(Boolean);
  return p[0] || 'você';
}

function initialsFromDisplayName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

export default function NoctalProfile() {
  const { uid: routeUid } = useParams<{ uid: string }>();
  const { posts, error, handleCreatePost, handleReaction } = useNoctalFeed();
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const migratedDisplaySearch = useRef(false);
  const [profile, setProfile] = useState<FirestoreUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [notifUnread, setNotifUnread] = useState(0);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [sharePost, setSharePost] = useState<{ id: string; content: string } | null>(null);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);

  const [profileTab, setProfileTab] = useState<ProfileTab>('all');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState('');
  const [followerRows, setFollowerRows] = useState<FollowDoc[]>([]);
  const [followingRows, setFollowingRows] = useState<FollowDoc[]>([]);
  const [myReviews, setMyReviews] = useState<MovieReview[]>([]);
  const [deletingReviewTmdbId, setDeletingReviewTmdbId] = useState<number | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const coverFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [editDraft, setEditDraft] = useState({
    fullName: '',
    username: '',
    newEmail: '',
    phone: '',
    city: '',
    bio: '',
    website: '',
    educationSchool: '',
    educationField: '',
    privacy: {
      showEmail: true,
      showPhone: true,
      showCity: true,
      showWebsite: true,
      showEducation: true,
    } as ProfilePrivacy,
  });

  const [favSearch, setFavSearch] = useState('');
  const [favDebounced, setFavDebounced] = useState('');
  const [favResults, setFavResults] = useState<TmdbMovieListItem[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  const profileOwnerUid = routeUid ?? authUser?.uid;
  const isOwnProfile = !!(authUser && profileOwnerUid && authUser.uid === profileOwnerUid);
  const {
    posts: authorPosts,
    error: authorPostsError,
    handleReaction: handleAuthorPostReaction,
  } = usePostsByAuthor(!isOwnProfile && profileOwnerUid ? profileOwnerUid : undefined);

  const liveViewer = useLiveUserCard(authUser?.uid ?? undefined);
  const viewerNavAvatarSrc = liveViewer?.photo ?? authUser?.photoURL ?? null;
  const viewerNavInitials = liveViewer?.initials ?? initialsFromUser(authUser, null);
  const viewerCommentName = liveViewer?.label?.trim() || authUser?.displayName || authUser?.email || 'Utilizador';
  const viewerCommentInitials = liveViewer?.initials ?? initialsFromUser(authUser, null);
  const { followers, following } = useFollowCounts(profileOwnerUid);

  useEffect(() => {
    return onAuthStateChanged(auth, setAuthUser);
  }, []);

  useEffect(() => {
    if (!authUser?.uid) {
      const t = setTimeout(() => setNotifUnread(0), 0);
      return () => clearTimeout(t);
    }
    return subscribeMyNotifications(
      authUser.uid,
      (list) => setNotifUnread(list.filter((n) => !n.read).length),
      (e) => console.error(e)
    );
  }, [authUser?.uid]);

  useEffect(() => {
    if (!profileOwnerUid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    if (!isOwnProfile) {
      let cancelled = false;
      setProfileLoading(true);
      void getDoc(doc(db, 'users', profileOwnerUid)).then((snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? (snap.data() as FirestoreUserProfile) : null);
        setProfileLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const u = authUser;
    if (!u) {
      setProfile(null);
      setProfileLoading(true);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    const ref = doc(db, 'users', u.uid);
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              email: u.email || null,
              fullName: u.displayName?.trim() || '',
              photoURL: u.photoURL || null,
              displaySearch: buildDisplaySearch(u.displayName || undefined, u.email || undefined),
              favoriteMovies: [],
              privacy: {
                showEmail: true,
                showPhone: true,
                showCity: true,
                showWebsite: true,
                showEducation: true,
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          const snap2 = await getDoc(ref);
          if (!cancelled) setProfile(snap2.exists() ? (snap2.data() as FirestoreUserProfile) : null);
        } else {
          setProfile(snap.data() as FirestoreUserProfile);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, profileOwnerUid, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !authUser || !profile || migratedDisplaySearch.current) return;
    if (profile.displaySearch) return;
    migratedDisplaySearch.current = true;
    void setDoc(
      doc(db, 'users', authUser.uid),
      {
        displaySearch: buildDisplaySearch(profile.fullName, profile.email || authUser.email || undefined),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [authUser, profile]);

  useEffect(() => {
    if (!profileOwnerUid || profileTab !== 'friends') {
      setFollowerRows([]);
      setFollowingRows([]);
      return;
    }
    const u1 = subscribeFollowersOf(profileOwnerUid, setFollowerRows);
    const u2 = subscribeFollowingOf(profileOwnerUid, setFollowingRows);
    return () => {
      u1();
      u2();
    };
  }, [profileOwnerUid, profileTab]);

  useEffect(() => {
    if (!profileOwnerUid || profileTab !== 'movies') {
      setMyReviews([]);
      return;
    }
    return subscribeMyMovieReviews(profileOwnerUid, setMyReviews);
  }, [profileOwnerUid, profileTab]);

  useEffect(() => {
    const t = window.setTimeout(() => setFavDebounced(favSearch.trim()), 400);
    return () => window.clearTimeout(t);
  }, [favSearch]);

  useEffect(() => {
    if (!favoritesModalOpen || !getTmdbKey()) {
      setFavResults([]);
      return;
    }
    if (favDebounced.length < 2) {
      setFavResults([]);
      return;
    }
    let cancelled = false;
    setFavLoading(true);
    void tmdbGet<TmdbSearchResponse>('/search/movie', { query: favDebounced, page: '1' })
      .then((res) => {
        if (!cancelled) setFavResults(res.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setFavResults([]);
      })
      .finally(() => {
        if (!cancelled) setFavLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [favDebounced, favoritesModalOpen]);

  const displayName =
    (profile?.fullName && profile.fullName.trim()) ||
    (isOwnProfile ? authUser?.displayName || authUser?.email : profile?.email?.split('@')[0]) ||
    'Utilizador';
  const myInitials = isOwnProfile
    ? initialsFromUser(authUser, profile?.fullName ?? null)
    : initialsFromDisplayName(displayName);

  const myPostsFromFeed = useMemo(() => {
    if (!authUser) return [];
    return posts.filter((p) => p.authorId === authUser.uid);
  }, [posts, authUser]);

  const displayPosts: UiPost[] = isOwnProfile ? myPostsFromFeed : authorPosts;
  const postsListError = isOwnProfile ? error : authorPostsError;
  const reactToPost = isOwnProfile ? handleReaction : handleAuthorPostReaction;

  const coverSrc =
    (profile?.coverPhotoDataUrl && profile.coverPhotoDataUrl.trim()) ||
    (profile?.coverPhotoUrl && profile.coverPhotoUrl.trim()) ||
    DEFAULT_COVER;

  const avatarSrc =
    (profile?.avatarCustomDataUrl && profile.avatarCustomDataUrl.trim()) ||
    (isOwnProfile ? authUser?.photoURL || null : profile?.photoURL?.trim() || null) ||
    null;

  const memberSinceLabel = useMemo(() => {
    if (!isOwnProfile) return null;
    const raw = authUser?.metadata?.creationTime;
    if (!raw) return null;
    try {
      return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(raw));
    } catch {
      return null;
    }
  }, [isOwnProfile, authUser?.metadata?.creationTime]);

  const favoriteList = profile?.favoriteMovies?.length ? profile.favoriteMovies : [];

  const hasVisiblePersonalCard =
    (privacyOn(profile, 'showCity') && !!profile?.city?.trim()) ||
    (privacyOn(profile, 'showEmail') &&
      (isOwnProfile ? !!authUser?.email : !!(profile?.email && profile.email.trim()))) ||
    (privacyOn(profile, 'showPhone') && !!profile?.phone?.trim()) ||
    (privacyOn(profile, 'showWebsite') && !!profile?.website?.trim());

  async function handleDeleteMyReview(tmdbId: number, movieLabel: string) {
    if (!authUser) return;
    setConfirmAction({
      title: 'Apagar avaliação',
      message: `Tem certeza que deseja apagar a sua avaliação de «${movieLabel}»? Isso também removerá a publicação do feed.`,
      onConfirm: async () => {
        setDeletingReviewTmdbId(tmdbId);
        try {
          await deleteMovieReview(tmdbId, authUser.uid);
        } catch (e) {
          console.error(e);
          alert('Não foi possível apagar a avaliação.');
        } finally {
          setDeletingReviewTmdbId(null);
        }
      }
    });
  }

  function openEditModal() {
    const pr = profile?.privacy ?? {};
    setEditDraft({
      fullName: profile?.fullName?.trim() || authUser?.displayName || '',
      username: profile?.username?.trim() || '',
      newEmail: authUser?.email || '',
      phone: profile?.phone?.trim() || '',
      city: profile?.city?.trim() || '',
      bio: profile?.bio?.trim() || '',
      website: profile?.website?.trim() || '',
      educationSchool: profile?.educationSchool?.trim() || '',
      educationField: profile?.educationField?.trim() || '',
      privacy: {
        showEmail: pr.showEmail !== false,
        showPhone: pr.showPhone !== false,
        showCity: pr.showCity !== false,
        showWebsite: pr.showWebsite !== false,
        showEducation: pr.showEducation !== false,
      },
    });
    setEditModalOpen(true);
  }

  async function refreshProfileFromServer() {
    if (!authUser) return;
    const snap = await getDoc(doc(db, 'users', authUser.uid));
    setProfile(snap.exists() ? (snap.data() as FirestoreUserProfile) : null);
  }

  async function persistUserPatch(data: Record<string, unknown>) {
    if (!authUser) return;
    await setDoc(
      doc(db, 'users', authUser.uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await refreshProfileFromServer();
  }

  async function onSaveEditModal(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser) return;
    setSavingProfile(true);
    try {
      const fullName = editDraft.fullName.trim();
      const phone = editDraft.phone.trim().slice(0, 32);
      const city = editDraft.city.trim().slice(0, 120);
      const bio = editDraft.bio.trim().slice(0, 500);
      const website = editDraft.website.trim().slice(0, 200);
      const educationSchool = editDraft.educationSchool.trim().slice(0, 160);
      const educationField = editDraft.educationField.trim().slice(0, 120);

      const uRaw = editDraft.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (uRaw.length > 0 && uRaw.length < 3) {
        alert('O nome de utilizador precisa de pelo menos 3 caracteres (a-z, 0-9 ou _).');
        return;
      }
      if (uRaw.length > 24) {
        alert('O nome de utilizador pode ter no máximo 24 caracteres.');
        return;
      }

      const emailTrim = editDraft.newEmail.trim().toLowerCase();
      if (emailTrim && emailTrim !== (authUser.email || '').toLowerCase()) {
        try {
          await updateEmail(authUser, emailTrim);
        } catch (emErr: unknown) {
          console.error(emErr);
          alert(
            'Não foi possível alterar o e-mail. Em muitas contas o Firebase exige que voltes a iniciar sessão recentemente. Tenta sair e entrar de novo, ou confirma o e-mail atual antes de mudar.'
          );
          return;
        }
      }

      const currentAuth = auth.currentUser;
      const resolvedEmail = currentAuth?.email || authUser.email || null;

      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          fullName,
          username: uRaw.length >= 3 ? uRaw : deleteField(),
          phone: phone || deleteField(),
          city: city || deleteField(),
          bio: bio || deleteField(),
          website: website || deleteField(),
          educationSchool: educationSchool || deleteField(),
          educationField: educationField || deleteField(),
          email: resolvedEmail,
          privacy: editDraft.privacy,
          displaySearch: buildDisplaySearch(fullName || undefined, resolvedEmail || undefined),
          photoURL: currentAuth?.photoURL || authUser.photoURL || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (fullName && fullName !== (authUser.displayName || '')) {
        await updateProfile(authUser, { displayName: fullName });
      }

      await refreshProfileFromServer();
      setEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível guardar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function applyCoverFromUrl() {
    if (!authUser) return;
    const url = coverUrlDraft.trim();
    if (!isAllowedImageUrl(url)) {
      alert('Indica um link válido (http ou https) para a imagem de capa.');
      return;
    }
    setSavingCover(true);
    try {
      await persistUserPatch({
        coverPhotoUrl: url,
        coverPhotoDataUrl: deleteField(),
      });
      setCoverUrlDraft('');
      setCoverModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível atualizar a capa.');
    } finally {
      setSavingCover(false);
    }
  }

  async function applyCoverPreset(url: string) {
    if (!authUser) return;
    setSavingCover(true);
    try {
      await persistUserPatch({
        coverPhotoUrl: url,
        coverPhotoDataUrl: deleteField(),
      });
      setCoverModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível atualizar a capa.');
    } finally {
      setSavingCover(false);
    }
  }

  async function onCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !authUser) return;
    setSavingCover(true);
    try {
      const out = await imageFileToJpegDataUrl(file, { maxDim: 900, maxDataUrlChars: 450_000 });
      if ('error' in out) {
        alert(out.error);
        return;
      }
      await persistUserPatch({
        coverPhotoDataUrl: out.dataUrl,
        coverPhotoUrl: deleteField(),
      });
      setCoverModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar a imagem de capa.');
    } finally {
      setSavingCover(false);
    }
  }

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !authUser) return;
    setSavingAvatar(true);
    try {
      const out = await imageFileToJpegDataUrl(file, { maxDim: 400, maxDataUrlChars: 120_000 });
      if ('error' in out) {
        alert(out.error);
        return;
      }
      await persistUserPatch({ avatarCustomDataUrl: out.dataUrl });
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar a foto de perfil.');
    } finally {
      setSavingAvatar(false);
    }
  }

  function clearCustomAvatar() {
    if (!authUser) return;
    setConfirmAction({
      title: 'Remover foto',
      message: 'Remover a foto personalizada e voltar a usar a foto padrão da conta?',
      onConfirm: async () => {
        setSavingAvatar(true);
        try {
          await persistUserPatch({ avatarCustomDataUrl: deleteField() });
        } finally {
          setSavingAvatar(false);
        }
      }
    });
  }

  async function addFavoriteMovie(m: TmdbMovieListItem) {
    if (!authUser) return;
    const current = [...(profile?.favoriteMovies ?? [])];
    if (current.some((x) => x.tmdbId === m.id)) return;
    if (current.length >= 6) {
      alert('Máximo de 6 filmes favoritos.');
      return;
    }
    const next: FavoriteMovie[] = [
      ...current,
      { tmdbId: m.id, title: m.title, posterPath: m.poster_path },
    ];
    await persistUserPatch({ favoriteMovies: next });
  }

  async function removeFavoriteMovie(tmdbId: number) {
    if (!authUser) return;
    const next = (profile?.favoriteMovies ?? []).filter((x) => x.tmdbId !== tmdbId);
    await persistUserPatch({ favoriteMovies: next });
  }

  const onCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authUser || !newPostText.trim() || isSubmittingPost) return;
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

  const handleDeletePost = async (postId: string) => {
    if (!authUser) return;
    try {
      await deletePost(postId, authUser.uid);
      if (commentsPostId === postId) setCommentsPostId(null);
    } catch (err) {
      console.error(err);
      alert('Não foi possível apagar o post. Verifica as regras do Firestore.');
    } finally {
      setConfirmDeletePostId(null);
    }
  };

  const tabBtn = (id: ProfileTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setProfileTab(id)}
      className={`rounded-t-lg px-4 py-4 text-sm font-bold transition-colors ${
        profileTab === id
          ? 'border-b-[3px] border-slate-800 text-slate-800'
          : 'text-slate-500 hover:bg-[#f0f2f5]'
      }`}
    >
      {label}
    </button>
  );

  function openCoverEditor() {
    setCoverUrlDraft(profile?.coverPhotoUrl?.trim() || '');
    setCoverModalOpen(true);
  }

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] bg-[#f0f2f5] font-sans text-slate-900 selection:bg-slate-300 [overflow-x:clip] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <AppTopBar
        activeNav={isOwnProfile ? 'profile' : 'home'}
        user={authUser}
        notifUnread={notifUnread}
        navAvatarSrc={viewerNavAvatarSrc}
        navAvatarInitials={viewerNavInitials}
        navAvatarAlt={viewerCommentName}
      />


      <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={onCoverFileChange} />
      <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />

      <div className="mx-auto w-full min-w-0 max-w-[1000px] px-3 pb-24 pt-[4.25rem] sm:px-5 sm:pt-20 lg:pb-10 lg:pt-[5.25rem]">
        <header className="bg-gradient-to-b from-slate-200/40 to-[#f0f2f5] pb-1 shadow-inner">
          <div className="relative w-full">
            <div className="group relative isolate h-[200px] w-full overflow-hidden rounded-t-2xl bg-slate-950 sm:h-[260px] md:h-[300px]">
              <img
                src={coverSrc}
                alt="Capa do perfil"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => openCoverEditor()}
                  className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 sm:text-sm"
                >
                  {savingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Editar capa
                </button>
              )}
            </div>

            <div className="relative z-10 -mt-12 px-0 sm:-mt-16">
              <div className="relative rounded-2xl border border-slate-200/90 bg-white px-4 pb-5 pt-16 shadow-xl sm:px-7 sm:pb-6 sm:pt-7 sm:pl-[10.75rem]">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[42%] sm:left-8 sm:translate-x-0 sm:-translate-y-1/2">
                <div className="relative">
                  <div className="h-[7.25rem] w-[7.25rem] overflow-hidden rounded-full border-[5px] border-white bg-slate-200 shadow-2xl ring-2 ring-slate-200/80 sm:h-36 sm:w-36">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={displayName} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-700 to-slate-900 text-4xl font-black text-white sm:text-5xl">
                        {myInitials}
                      </div>
                    )}
                  </div>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={savingAvatar}
                      className="absolute bottom-1 right-1 rounded-full border-2 border-white bg-slate-100 p-2 text-slate-700 shadow-md transition-colors hover:bg-slate-200 disabled:opacity-50"
                      title="Alterar foto de perfil"
                    >
                      {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="text-center sm:mt-1 sm:text-left">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm sm:text-3xl">{displayName}</h1>
                {profile?.username?.trim() && (
                  <p className="mt-1 text-sm font-bold tracking-wide text-violet-600">@{profile.username.trim()}</p>
                )}
                {profile?.bio?.trim() ? (
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:mx-0 sm:mr-auto">{profile.bio.trim()}</p>
                ) : (
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {isOwnProfile && memberSinceLabel
                      ? `Membro desde ${memberSinceLabel}`
                      : isOwnProfile
                        ? 'Membro Noctal'
                        : profile
                          ? 'Membro Noctal'
                          : 'Perfil ainda sem dados públicos.'}
                  </p>
                )}
                {profileOwnerUid && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {isOwnProfile && (
                      <Link
                        to={`/u/${profileOwnerUid}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-800 hover:bg-white"
                      >
                        Ver público
                      </Link>
                    )}
                    <Link
                      to={`/u/${profileOwnerUid}/seguidores`}
                      className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:from-slate-200 hover:to-slate-300"
                    >
                      <span className="text-slate-900">{followers}</span> seguidores
                    </Link>
                    <Link
                      to={`/u/${profileOwnerUid}/seguindo`}
                      className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:from-slate-200 hover:to-slate-300"
                    >
                      <span className="text-slate-900">{following}</span> seguindo
                    </Link>
                    {authUser && (
                      <Link
                        to="/explorar"
                        className="rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-amber-950 hover:bg-amber-100"
                      >
                        Procurar pessoas
                      </Link>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-4 sm:justify-start">
                  {isOwnProfile ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate('/em-cartaz')}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800"
                      >
                        <Film className="h-4 w-4" /> Avaliar filme
                      </button>
                      <button
                        type="button"
                        onClick={() => openCoverEditor()}
                        disabled={savingCover}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Camera className="h-4 w-4" /> Capa
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" /> Editar perfil
                      </button>
                      <Link
                        to="/configuracoes"
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                      >
                        <Settings className="h-4 w-4" /> Definições
                      </Link>
                    </>
                  ) : (
                    authUser &&
                    profileOwnerUid &&
                    authUser.uid !== profileOwnerUid && (
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                        <FollowButton viewerId={authUser.uid} targetId={profileOwnerUid} className="px-6 py-2.5" />
                        <Link
                          to={`/mensagens/${profileOwnerUid}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-violet-800 shadow-sm transition hover:bg-violet-100"
                        >
                          <Send className="h-4 w-4" />
                          Mensagem
                        </Link>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-1 py-1 shadow-sm sm:px-3">
            {tabBtn('all', 'Tudo')}
            {tabBtn('about', 'Sobre')}
            {tabBtn('friends', 'Amigos')}
            {tabBtn('movies', 'Filmes')}
          </div>
        </div>
      </header>

      <main className="flex w-full min-w-0 flex-col gap-4 pt-4">
        {profileTab === 'all' && (
          <div className="flex w-full min-w-0 flex-col gap-4 md:flex-row">
            <div className="flex w-full flex-col gap-4 md:w-[360px]">
              {postsListError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{postsListError}</div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Dados pessoais</h2>
                {profileLoading ? (
                  <p className="text-sm font-medium text-slate-500">A carregar perfil…</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {privacyOn(profile, 'showCity') && profile?.city?.trim() && (
                      <div className="flex items-start gap-3 text-slate-800">
                        <MapPin className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
                        <span className="text-[15px] font-medium">
                          Mora em <strong>{profile.city.trim()}</strong>
                        </span>
                      </div>
                    )}
                    {privacyOn(profile, 'showEmail') &&
                      (isOwnProfile ? !!authUser?.email : !!(profile?.email && profile.email.trim())) && (
                      <div className="flex flex-col gap-1 text-[15px] text-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</span>
                        <span>{isOwnProfile ? authUser?.email : profile?.email?.trim()}</span>
                      </div>
                    )}
                    {privacyOn(profile, 'showPhone') && profile?.phone?.trim() && (
                      <div className="flex flex-col gap-1 text-[15px] text-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</span>
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {privacyOn(profile, 'showWebsite') && profile?.website?.trim() && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Website</span>
                        <a
                          href={
                            profile.website.trim().startsWith('http')
                              ? profile.website.trim()
                              : `https://${profile.website.trim()}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-bold text-amber-800 underline"
                        >
                          {profile.website.trim()} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                    {!profileLoading && !hasVisiblePersonalCard && (
                      <p className="text-sm font-medium text-slate-500">
                        {isOwnProfile
                          ? 'Nenhum dado visível aqui. Preenche campos e escolhe o que mostrar em "Editar perfil".'
                          : 'Este utilizador não partilhou dados pessoais aqui.'}
                      </p>
                    )}
                  </div>
                )}

                {privacyOn(profile, 'showEducation') &&
                  (profile?.educationSchool?.trim() || profile?.educationField?.trim()) && (
                    <>
                      <h3 className="mb-3 mt-6 text-lg font-bold text-slate-900">Educação</h3>
                      <div className="flex items-start gap-3 text-slate-800">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <GraduationCap className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold">{profile?.educationSchool?.trim() || '—'}</span>
                          <span className="text-sm text-slate-500">{profile?.educationField?.trim() || ''}</span>
                        </div>
                      </div>
                    </>
                  )}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => openEditModal()}
                    className="mt-6 w-full rounded-lg bg-[#f0f2f5] py-2 text-[15px] font-bold text-slate-800 transition-colors hover:bg-slate-200"
                  >
                    Editar detalhes
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Filmes favoritos</h2>
                <div className="grid grid-cols-3 gap-2">
                  {favoriteList.map((m) => (
                    <Link
                      key={m.tmdbId}
                      to={`/em-cartaz/filme/${m.tmdbId}`}
                      className="group relative aspect-[2/3] overflow-hidden rounded-md border border-slate-200 shadow-sm"
                    >
                      {m.posterPath ? (
                        <img
                          src={posterUrl(m.posterPath, 'w185')}
                          alt={m.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-bold text-slate-600">
                          {m.title}
                        </div>
                      )}
                    </Link>
                  ))}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setFavSearch('');
                        setFavResults([]);
                        setFavoritesModalOpen(true);
                      }}
                      className="flex aspect-[2/3] cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-[#f0f2f5] transition-colors hover:bg-slate-200"
                      title="Adicionar filme"
                    >
                      <Plus className="h-6 w-6 text-slate-400" />
                    </button>
                  )}
                </div>
                {isOwnProfile && !getTmdbKey() && (
                  <p className="mt-2 text-xs font-medium text-amber-800">Define VITE_TMDB_API_KEY para pesquisar filmes.</p>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {isOwnProfile && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <form id="noctal-profile-create-post" onSubmit={onCreatePost}>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-bold text-white">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          myInitials
                        )}
                      </div>
                      <input
                        type="text"
                        name="profile-new-post"
                        autoComplete="off"
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder={`Em que estás a pensar, ${firstName(displayName)}?`}
                        disabled={!authUser}
                        className="w-full cursor-text rounded-full border border-transparent bg-[#f0f2f5] py-2.5 px-4 text-[15px] font-medium text-slate-700 outline-none transition-colors hover:bg-slate-200 focus:border-slate-200 disabled:opacity-50"
                      />
                    </div>
                    <div className="flex justify-end border-t border-slate-100 pt-3">
                      <button
                        type="submit"
                        disabled={!newPostText.trim() || !authUser || isSubmittingPost}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-bold ${
                          newPostText.trim() && authUser && !isSubmittingPost
                            ? 'bg-slate-800 text-white hover:bg-slate-900'
                            : 'cursor-not-allowed bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        {isSubmittingPost ? 'A enviar…' : 'Publicar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <h2 className="text-xl font-bold text-slate-900">{isOwnProfile ? 'Os meus posts' : 'Posts'}</h2>
              </div>

          {displayPosts.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
              {isOwnProfile
                ? 'Ainda não tens posts públicos. Publica algo acima ou volta ao feed.'
                : 'Ainda não há posts públicos aqui.'}
            </div>
          )}

          {displayPosts.map((post: UiPost) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={authUser?.uid}
              onReact={reactToPost}
              onOpenComments={(id) => setCommentsPostId(id)}
              onDelete={isOwnProfile ? (id) => setConfirmDeletePostId(id) : undefined}
              onOpenShareModal={(id, content) => setSharePost({ id, content })}
            />
          ))}
            </div>
          </div>
        )}

        {profileTab === 'about' && (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">{isOwnProfile ? 'Sobre ti' : 'Sobre'}</h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                {profile?.bio?.trim() ||
                  (isOwnProfile
                    ? 'Ainda não escreveste uma bio. Usa "Editar perfil" para te apresentares à comunidade.'
                    : 'Sem bio pública.')}
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                {profile?.username?.trim() && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">Utilizador</dt>
                    <dd className="text-right font-bold text-violet-600">@{profile.username.trim()}</dd>
                  </div>
                )}
                {privacyOn(profile, 'showCity') && profile?.city?.trim() && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">Local</dt>
                    <dd className="text-right font-medium text-slate-900">{profile.city.trim()}</dd>
                  </div>
                )}
                {privacyOn(profile, 'showEmail') &&
                  (isOwnProfile ? authUser?.email : profile?.email?.trim()) && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">E-mail</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {isOwnProfile ? authUser?.email : profile?.email?.trim()}
                    </dd>
                  </div>
                )}
                {privacyOn(profile, 'showPhone') && profile?.phone?.trim() && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">Telefone</dt>
                    <dd className="text-right font-medium text-slate-900">{profile.phone.trim()}</dd>
                  </div>
                )}
                {privacyOn(profile, 'showWebsite') && profile?.website?.trim() && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">Website</dt>
                    <dd className="text-right font-medium text-slate-900">
                      <a
                        href={
                          profile.website.trim().startsWith('http')
                            ? profile.website.trim()
                            : `https://${profile.website.trim()}`
                        }
                        className="text-amber-800 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.website.trim()}
                      </a>
                    </dd>
                  </div>
                )}
                {privacyOn(profile, 'showEducation') &&
                  (profile?.educationSchool?.trim() || profile?.educationField?.trim()) && (
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                      <dt className="font-bold text-slate-500">Formação</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {profile?.educationSchool?.trim() || ''}
                        {profile?.educationField?.trim() ? ` · ${profile.educationField.trim()}` : ''}
                      </dd>
                    </div>
                  )}
                {memberSinceLabel && (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                    <dt className="font-bold text-slate-500">Membro desde</dt>
                    <dd className="text-right font-medium capitalize text-slate-900">{memberSinceLabel}</dd>
                  </div>
                )}
              </dl>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => openEditModal()}
                  className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-slate-800"
                >
                  Editar informações
                </button>
              )}
            </div>
          </div>
        )}

        {profileTab === 'friends' && profileOwnerUid && (
          <div className="mx-auto w-full max-w-4xl space-y-6 py-6 md:py-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <UserListPanel
                title="Seguidores"
                description="Quem acompanha este perfil"
                viewAllHref={`/u/${profileOwnerUid}/seguidores`}
                count={followerRows.length}
                isEmpty={followerRows.length === 0}
                emptyTitle="Sem seguidores ainda"
              >
                {followerRows.map((r) => (
                  <UserListCard key={r.id} uid={r.followerId} showChevron />
                ))}
              </UserListPanel>
              <UserListPanel
                title="Seguindo"
                description="Contas que este perfil segue"
                viewAllHref={`/u/${profileOwnerUid}/seguindo`}
                count={followingRows.length}
                isEmpty={followingRows.length === 0}
                emptyTitle={isOwnProfile ? 'Ainda não segues ninguém' : 'Ainda não segue ninguém'}
              >
                {followingRows.map((r) => (
                  <UserListCard key={r.id} uid={r.followingId} showChevron />
                ))}
              </UserListPanel>
            </div>
          </div>
        )}

        {profileTab === 'movies' && profileOwnerUid && (
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">Favoritos TMDB</h2>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setFavSearch('');
                      setFavResults([]);
                      setFavoritesModalOpen(true);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800"
                  >
                    Gerir favoritos
                  </button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {favoriteList.map((m) => (
                  <Link key={m.tmdbId} to={`/em-cartaz/filme/${m.tmdbId}`} className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    {m.posterPath ? (
                      <img src={posterUrl(m.posterPath, 'w185')} alt="" className="aspect-[2/3] w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex aspect-[2/3] items-center justify-center bg-slate-100 p-1 text-center text-[10px] font-bold">
                        {m.title}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            <WatchlistHomePanel uid={profileOwnerUid} isOwner={isOwnProfile} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">{isOwnProfile ? 'As tuas avaliações' : 'Avaliações'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isOwnProfile ? 'Últimas classificações na comunidade.' : 'Classificações públicas na comunidade.'}
              </p>
              <ul className="mt-4 divide-y divide-slate-100">
                {myReviews.length === 0 ? (
                  <li className="py-8 text-center text-sm text-slate-500">Sem avaliações ainda.</li>
                ) : (
                  myReviews.map((r) => {
                    const label = r.movieTitle?.trim() || `Filme #${r.tmdbId}`;
                    return (
                      <li key={r.id} className="flex gap-2 py-3">
                        <div className="flex h-16 w-11 shrink-0 overflow-hidden rounded-md bg-slate-200">
                          {r.moviePosterPath ? (
                            <img src={posterUrl(r.moviePosterPath, 'w185')} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-500">TMDB</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/em-cartaz/filme/${r.tmdbId}`} className="font-bold text-slate-900 hover:underline">
                            {label}
                          </Link>
                          <p className="text-xs text-amber-600">
                            {r.stars} estrelas · {r.updatedAt ? formatPostTime(r.updatedAt) : r.createdAt ? formatPostTime(r.createdAt) : '—'}
                          </p>
                          {r.text?.trim() && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.text.trim()}</p>}
                        </div>
                        {isOwnProfile && (
                          <button
                            type="button"
                            disabled={deletingReviewTmdbId === r.tmdbId}
                            className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            aria-label={`Apagar avaliação: ${label}`}
                            onClick={() => void handleDeleteMyReview(r.tmdbId, label)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
              {isOwnProfile && (
                <Link to="/avaliacoes" className="mt-4 inline-block text-sm font-bold text-amber-800 underline">
                  Ver todas as avaliações
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {coverModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cover-modal-title"
          onClick={() => !savingCover && setCoverModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="cover-modal-title" className="text-lg font-black text-slate-900">
                Capa do perfil
              </h2>
              <button
                type="button"
                onClick={() => !savingCover && setCoverModalOpen(false)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Escolhe um preset, cola um link de imagem (http/https) ou carrega um ficheiro — comprimimos automaticamente.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Presets</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COVER_PRESETS.map((u) => (
                <button
                  key={u}
                  type="button"
                  disabled={savingCover}
                  onClick={() => void applyCoverPreset(u)}
                  className="aspect-video overflow-hidden rounded-lg border-2 border-transparent ring-slate-200 transition hover:border-slate-900 disabled:opacity-50"
                >
                  <img src={u} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
            <label className="mt-5 block text-xs font-black uppercase tracking-wide text-slate-500">Link da imagem</label>
            <input
              value={coverUrlDraft}
              onChange={(e) => setCoverUrlDraft(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="https://…"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingCover}
                onClick={() => void applyCoverFromUrl()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingCover ? 'A guardar…' : 'Aplicar link'}
              </button>
              <button
                type="button"
                disabled={savingCover}
                onClick={() => coverFileRef.current?.click()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Carregar ficheiro
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onClick={() => !savingProfile && setEditModalOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="edit-modal-title" className="text-lg font-black text-slate-900">
                Editar perfil
              </h2>
              <button
                type="button"
                onClick={() => !savingProfile && setEditModalOpen(false)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={onSaveEditModal}>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Nome completo</label>
                <input
                  required
                  value={editDraft.fullName}
                  onChange={(e) => setEditDraft((d) => ({ ...d, fullName: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Nome de utilizador</label>
                <input
                  value={editDraft.username}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                  placeholder="ex.: maria_silva (3–24 caracteres, opcional)"
                  maxLength={24}
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">Aparece como @nome no perfil. Só letras minúsculas, números e _.</p>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">E-mail da conta</label>
                <input
                  type="email"
                  value={editDraft.newEmail}
                  onChange={(e) => setEditDraft((d) => ({ ...d, newEmail: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                  autoComplete="email"
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Alterar o e-mail pode exigir que voltes a iniciar sessão (regra do Firebase).
                </p>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Bio</label>
                <textarea
                  value={editDraft.bio}
                  onChange={(e) => setEditDraft((d) => ({ ...d, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                  placeholder="Uma frase sobre ti…"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Cidade / região</label>
                <input
                  value={editDraft.city}
                  onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Telefone</label>
                <input
                  value={editDraft.phone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Website</label>
                <input
                  value={editDraft.website}
                  onChange={(e) => setEditDraft((d) => ({ ...d, website: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                  placeholder="exemplo.com ou https://…"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Instituição (educação)</label>
                <input
                  value={editDraft.educationSchool}
                  onChange={(e) => setEditDraft((d) => ({ ...d, educationSchool: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Curso / área</label>
                <input
                  value={editDraft.educationField}
                  onChange={(e) => setEditDraft((d) => ({ ...d, educationField: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Mostrar no perfil público</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Desmarca para esconder blocos vazios ou dados que preferes não exibir.</p>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-800">
                  {(
                    [
                      ['showEmail', 'E-mail'],
                      ['showPhone', 'Telefone'],
                      ['showCity', 'Cidade'],
                      ['showWebsite', 'Website'],
                      ['showEducation', 'Educação'],
                    ] as const
                  ).map(([key, label]) => (
                    <li key={key}>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          checked={editDraft.privacy[key] !== false}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              privacy: { ...d.privacy, [key]: e.target.checked },
                            }))
                          }
                        />
                        {label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {profile?.avatarCustomDataUrl && (
                  <button
                    type="button"
                    disabled={savingProfile || savingAvatar}
                    onClick={() => void clearCustomAvatar()}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Remover foto personalizada
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingProfile ? 'A guardar…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {favoritesModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setFavoritesModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">Filmes favoritos</h2>
              <button
                type="button"
                onClick={() => setFavoritesModalOpen(false)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!getTmdbKey() ? (
              <p className="mt-3 text-sm text-amber-800">Configura VITE_TMDB_API_KEY para pesquisar filmes.</p>
            ) : (
              <>
                <input
                  value={favSearch}
                  onChange={(e) => setFavSearch(e.target.value)}
                  placeholder="Pesquisar filme…"
                  className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium"
                />
                {favLoading && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> A pesquisar…
                  </p>
                )}
                <ul className="mt-3 max-h-[40vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {favResults.map((m) => {
                    const already = favoriteList.some((x) => x.tmdbId === m.id);
                    return (
                      <li key={m.id} className="flex items-center gap-3 p-3">
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-slate-200">
                          {m.poster_path ? (
                            <img src={posterUrl(m.poster_path, 'w185')} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[8px] font-bold text-slate-500">—</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{m.title}</p>
                          {m.release_date && <p className="text-xs text-slate-500">{m.release_date.slice(0, 4)}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={already}
                          onClick={() => void addFavoriteMovie(m)}
                          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {already ? 'Já está' : 'Adicionar'}
                        </button>
                      </li>
                    );
                  })}
                  {favDebounced.length >= 2 && !favLoading && favResults.length === 0 && (
                    <li className="p-4 text-center text-sm text-slate-500">Sem resultados.</li>
                  )}
                </ul>
              </>
            )}
            <h3 className="mt-6 text-xs font-black uppercase tracking-wide text-slate-500">Os teus favoritos</h3>
            <ul className="mt-2 space-y-2">
              {favoriteList.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum filme favorito ainda.</li>
              ) : (
                favoriteList.map((m) => (
                  <li key={m.tmdbId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm font-bold text-slate-800">{m.title}</span>
                    <button
                      type="button"
                      onClick={() => void removeFavoriteMovie(m.tmdbId)}
                      className="shrink-0 text-xs font-bold text-red-700 underline"
                    >
                      Remover
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
        isDestructive={true}
        confirmLabel="Confirmar"
      />
      <ConfirmModal
        isOpen={!!confirmDeletePostId}
        title="Apagar Post"
        message="Tem certeza que quer apagar este post para sempre? Esta ação não pode ser desfeita."
        confirmLabel="Apagar"
        onConfirm={() => confirmDeletePostId && handleDeletePost(confirmDeletePostId)}
        onCancel={() => setConfirmDeletePostId(null)}
        isDestructive={true}
      />
      {authUser && (
        <>
          <CommentsModal
            open={!!commentsPostId}
            postId={commentsPostId}
            postSnippet={displayPosts.find((p) => p.id === commentsPostId)?.content ?? ''}
            onClose={() => setCommentsPostId(null)}
            uid={authUser.uid}
            displayName={viewerCommentName}
            myInitials={viewerCommentInitials}
          />
          <ShareModal
            open={!!sharePost}
            onClose={() => setSharePost(null)}
            postId={sharePost?.id ?? ''}
            postContent={sharePost?.content ?? ''}
            currentUserId={authUser.uid}
            currentUserDisplayName={viewerCommentName}
          />
        </>
      )}
      <MobileBottomNav />
    </div>
  );
}

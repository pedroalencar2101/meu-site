import { Link } from 'react-router-dom';
import { Bell, Film, MessageCircle, Users } from 'lucide-react';
import AppPageShell from '../components/AppPageShell';

export default function NotificacoesPage() {
  return (
    <AppPageShell
      title="Notificações"
      description="Alertas da tua rede e da comunidade."
      backTo="/"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
        <div className="border-b border-slate-100 px-6 py-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Bell className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-black tracking-tight text-slate-900">Centro de notificações</h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-slate-600">
            Ainda não há alertas por aqui. Quando seguires mais pessoas e interagires com filmes e mensagens, este espaço
            concentrará gostos, comentários e novidades da rede.
          </p>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          <Link
            to="/explorar"
            className="flex flex-col items-center gap-2 bg-white px-4 py-6 text-center transition hover:bg-slate-50"
          >
            <Users className="h-6 w-6 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-wide text-slate-800">Explorar</span>
            <span className="text-[11px] font-medium text-slate-500">Encontrar perfis</span>
          </Link>
          <Link
            to="/em-cartaz"
            className="flex flex-col items-center gap-2 bg-white px-4 py-6 text-center transition hover:bg-slate-50"
          >
            <Film className="h-6 w-6 text-amber-600" />
            <span className="text-xs font-black uppercase tracking-wide text-slate-800">Cinema</span>
            <span className="text-[11px] font-medium text-slate-500">Avaliações TMDB</span>
          </Link>
          <Link
            to="/mensagens"
            className="flex flex-col items-center gap-2 bg-white px-4 py-6 text-center transition hover:bg-slate-50"
          >
            <MessageCircle className="h-6 w-6 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-wide text-slate-800">Mensagens</span>
            <span className="text-[11px] font-medium text-slate-500">Conversas privadas</span>
          </Link>
        </div>
      </div>
    </AppPageShell>
  );
}

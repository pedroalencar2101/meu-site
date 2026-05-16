import type { Timestamp } from 'firebase/firestore';

export function formatRelativeTime(ts: Timestamp | null): string {
  if (!ts) return 'Agora mesmo';

  const now = new Date();
  const date = ts.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'Agora mesmo';
  if (diffMin < 1) return `há ${diffSec} seg`;
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export type DateSeparatorLabel = 'today' | 'yesterday' | 'date';

/** Retorna o rótulo para um separador de data */
export function getDateSeparatorLabel(ts: Timestamp | null): string {
  if (!ts) return '';
  const now = new Date();
  const date = ts.toDate();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Hoje';
  if (msgDate.getTime() === yesterday.getTime()) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Retorna o timestamp do início do dia (meia-noite) para agrupar mensagens */
export function getDayKey(ts: Timestamp | null): string {
  if (!ts) return 'unknown';
  const d = ts.toDate();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
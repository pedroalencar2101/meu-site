import type { Timestamp } from 'firebase/firestore';

export function formatPostTime(ts: Timestamp | null): string {
  if (!ts) return 'Agora mesmo';
  const d = ts.toDate();
  return d.toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export async function sharePostContent(text: string, url?: string): Promise<void> {
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const payload: ShareData = { title: 'Noctal', text, url: shareUrl };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  const clip = [text, shareUrl].filter(Boolean).join('\n\n');
  try {
    await navigator.clipboard.writeText(clip);
    alert('Conteúdo copiado para a área de transferência.');
  } catch {
    alert('Não foi possível partilhar nem copiar. Copia manualmente o texto.');
  }
}
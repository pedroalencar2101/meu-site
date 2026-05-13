/** Valida URL para usar como foto de capa (http/https). */
export function isAllowedImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Redimensiona e comprime uma imagem local para JPEG data URL (para gravar em Firestore).
 * Respeita um teto de caracteres no data URL para não ultrapassar limites do documento.
 */
export async function imageFileToJpegDataUrl(
  file: File,
  opts: { maxDim: number; maxDataUrlChars: number; initialQuality?: number }
): Promise<{ dataUrl: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Escolhe um ficheiro de imagem (JPG, PNG, etc.).' };
  }

  const { maxDim, maxDataUrlChars, initialQuality = 0.82 } = opts;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w <= 0 || h <= 0) {
        resolve({ error: 'Imagem inválida.' });
        return;
      }
      const scale = Math.min(maxDim / w, maxDim / h, 1);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ error: 'Não foi possível processar a imagem neste dispositivo.' });
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      let q = initialQuality;
      for (let step = 0; step < 10; step++) {
        const dataUrl = canvas.toDataURL('image/jpeg', q);
        if (dataUrl.length <= maxDataUrlChars) {
          resolve({ dataUrl });
          return;
        }
        q -= 0.08;
        if (q < 0.22) break;
      }
      const last = canvas.toDataURL('image/jpeg', 0.22);
      if (last.length <= maxDataUrlChars) {
        resolve({ dataUrl: last });
        return;
      }
      resolve({
        error: 'A imagem continua grande demais. Tenta outra foto ou cola um link HTTPS (por exemplo Unsplash).',
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ error: 'Não foi possível ler esta imagem.' });
    };
    img.src = objectUrl;
  });
}

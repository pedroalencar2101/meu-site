/** Mapa de gêneros TMDB → nome PT-BR simplificado */
export const GENRE_MAP: Record<number, string> = {
  28:    'Ação',
  12:    'Aventura',
  16:    'Animação',
  35:    'Comédia',
  80:    'Crime',
  99:    'Documentário',
  18:    'Drama',
  10751: 'Família',
  14:    'Fantasia',
  36:    'História',
  27:    'Terror',
  10402: 'Música',
  9648:  'Mistério',
  10749: 'Romance',
  878:   'Ficção Científica',
  10770: 'TV Movie',
  53:    'Suspense',
  10752: 'Guerra',
  37:    'Faroeste',
};

/** Ordem de exibição dos gêneros */
export const GENRE_ORDER: string[] = [
  'Ação', 'Aventura', 'Comédia', 'Drama', 'Terror', 'Suspense',
  'Ficção Científica', 'Fantasia', 'Romance', 'Animação', 'Mistério',
  'Crime', 'Família', 'Documentário', 'Música', 'Guerra', 'Faroeste',
  'História', 'TV Movie',
];
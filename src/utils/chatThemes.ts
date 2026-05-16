export const CHAT_THEMES = [
  { id: 'default', label: 'Padrão', bg: 'bg-[#f0f2f5]', chatBg: 'bg-white/40 sm:bg-white/60' },
  { id: 'green', label: 'Verde Claro', bg: 'bg-[#d9fdd3]', chatBg: 'bg-white/50 sm:bg-white/70' },
  { id: 'blue', label: 'Azul Suave', bg: 'bg-[#d4e9ff]', chatBg: 'bg-white/50 sm:bg-white/70' },
  { id: 'pink', label: 'Rosa Claro', bg: 'bg-[#ffdce5]', chatBg: 'bg-white/50 sm:bg-white/70' },
  { id: 'dark', label: 'Escuro', bg: 'bg-[#1a1a2e]', chatBg: 'bg-[#16213e]/40 sm:bg-[#16213e]/80' },
  { id: 'purple', label: 'Lavanda', bg: 'bg-[#e8dfff]', chatBg: 'bg-white/50 sm:bg-white/70' },
  { id: 'peach', label: 'Pêssego', bg: 'bg-[#ffedd5]', chatBg: 'bg-white/50 sm:bg-white/70' },
] as const;

export type ChatThemeId = (typeof CHAT_THEMES)[number]['id'];
export const DEFAULT_CHAT_THEME: ChatThemeId = 'default';

export function getChatTheme(themeId: string | undefined) {
  return CHAT_THEMES.find((t) => t.id === themeId) ?? CHAT_THEMES[0];
}
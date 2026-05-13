import { Search, Bell, MessageSquare, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-noctal-slate/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-noctal-silver to-noctal-charcoal rounded-md flex items-center justify-center">
            <span className="text-noctal-slate font-bold text-lg">K</span> {/* Logo provisória */}
          </div>
          <span className="font-semibold text-lg tracking-wide text-white">NOCTAL</span>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-noctal-dark border border-white/5 rounded-full px-4 py-1.5 w-1/3 transition-all focus-within:border-white/20 focus-within:bg-noctal-charcoal">
          <Search className="w-4 h-4 text-noctal-silver mr-2" />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-transparent border-none outline-none text-sm text-white placeholder-noctal-silver w-full"
          />
        </div>

        {/* Ícones do Usuário */}
        <div className="flex items-center gap-5">
          <MessageSquare className="w-5 h-5 text-noctal-silver hover:text-white cursor-pointer transition-colors" />
          <Bell className="w-5 h-5 text-noctal-silver hover:text-white cursor-pointer transition-colors" />
          <div className="w-8 h-8 rounded-full bg-noctal-charcoal border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden hover:border-white/30 transition-all">
            <User className="w-5 h-5 text-noctal-silver" />
          </div>
        </div>

      </div>
    </nav>
  );
}
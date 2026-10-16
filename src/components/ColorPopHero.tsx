import { resolveImageUrl } from '../utils/imageUrl';
import React from 'react';
import {
  Heart,
  UserPlus,
  BookPlus,
  Contact,
  Link2,
  Users,
  BookOpen,
  MessageCircle,
  Image as ImageIcon,
  Puzzle,
  FileText,
  Settings,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

interface ColorPopHeroProps {
  onQuickAction: (actionId: string) => void;
  onOpenCharacterModal: () => void;
  onOpenLorebookModal: () => void;
  onOpenPersonaModal: () => void;
  onOpenChats: () => void;
  onOpenPlugins: () => void;
  onOpenSettings: () => void;
  heroImage?: string;
  onOpenGallery?: () => void;
}

export const ColorPopHero: React.FC<ColorPopHeroProps> = ({
  onQuickAction,
  onOpenCharacterModal,
  onOpenLorebookModal,
  onOpenPersonaModal,
  onOpenChats,
  onOpenPlugins,
  onOpenSettings,
  heroImage,
  onOpenGallery,
}) => {
  const quickLinks = [
    { id: 'loreberry', label: 'Loreberry', icon: <Heart className="w-4 h-4 text-pink-400 fill-pink-500/40" />, glow: 'from-pink-600 to-rose-500', action: () => onQuickAction('loreberry') },
    { id: 'create_char', label: 'Create Character', icon: <UserPlus className="w-4 h-4 text-blue-300" />, glow: 'from-blue-600 to-cyan-500', action: onOpenCharacterModal },
    { id: 'create_lore', label: 'Create Lorebook', icon: <BookPlus className="w-4 h-4 text-rose-300" />, glow: 'from-rose-600 to-amber-500', action: onOpenLorebookModal },
    { id: 'create_persona', label: 'Create Persona', icon: <Contact className="w-4 h-4 text-purple-300" />, glow: 'from-purple-600 to-pink-500', action: onOpenPersonaModal },
    { id: 'chub_ai', label: 'Chub AI', icon: <Link2 className="w-4 h-4 text-cyan-300" />, glow: 'from-cyan-600 to-blue-500', action: () => window.open('https://chub.ai', '_blank') },
    { id: 'characters', label: 'Characters', icon: <Users className="w-4 h-4 text-amber-300" />, glow: 'from-amber-600 to-orange-500', action: () => onQuickAction('characters') },
    { id: 'lorebooks', label: 'Lorebooks', icon: <BookOpen className="w-4 h-4 text-orange-300" />, glow: 'from-orange-600 to-rose-500', action: () => onQuickAction('lorebooks') },
    { id: 'my_chats', label: 'My Chats', icon: <MessageCircle className="w-4 h-4 text-pink-300" />, glow: 'from-pink-600 to-purple-500', action: onOpenChats },
    { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-4 h-4 text-emerald-300" />, glow: 'from-emerald-600 to-teal-500', action: () => onQuickAction('gallery') },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle className="w-4 h-4 text-fuchsia-300" />, glow: 'from-fuchsia-600 to-pink-500', action: onOpenPlugins },
    { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4 text-rose-300" />, glow: 'from-rose-600 to-red-500', action: () => onQuickAction('templates') },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-violet-300" />, glow: 'from-violet-600 to-indigo-500', action: onOpenSettings },
  ];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 px-4 sm:px-6">
      {/* Left / Main Banner: Romantic Couple in Luxury Scene */}
      <div className="lg:col-span-8 relative group">
        <div className="relative rounded-3xl overflow-hidden border-2 border-[#ff3399]/60 shadow-[0_0_35px_rgba(255,51,153,0.45)] bg-[#12040e] aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-auto lg:h-[460px]">
          <img
            src={resolveImageUrl(heroImage || "/colorpop_hero.jpg")}
            alt="ColorPop Luxury Couple"
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

          {onOpenGallery && <button onClick={onOpenGallery} className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-full bg-black/60 border border-white/30 text-white text-[11px] font-semibold backdrop-blur-md hover:bg-black/80">Change home picture</button>}
          <div className="absolute top-4 left-4 text-[#ff99cc] drop-shadow-[0_0_10px_#ff007f] pointer-events-none">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-10">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-[#ff007f]/40 backdrop-blur-md border border-[#ff80bf]/50 text-white font-mono text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 w-fit shadow-[0_0_15px_rgba(255,0,128,0.5)]">
                <Sparkles className="w-3 h-3 text-[#ffd6eb]" /> ColorPop Elite Universe
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                The Sovereign Billionaires &bull; Chapter IV
              </h2>
              <p className="text-xs text-[#ffd6eb]/90 max-w-lg hidden sm:block drop-shadow">
                Immerse yourself in high-stakes romance, opulent penthouses, and unforgettable dynamic roleplay powered by OpenRouter.
              </p>
            </div>

            <button
              onClick={onOpenChats}
              className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white text-xs font-bold rounded-2xl shadow-[0_0_20px_rgba(255,0,128,0.8)] transition-all flex items-center space-x-1.5"
            >
              <span>Enter Story</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Quick Links Sidebar with 12 Jewel Buttons */}
      <div className="lg:col-span-4 bg-[#140410]/90 backdrop-blur-md border-2 border-[#ff3399]/40 rounded-3xl p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(255,51,153,0.3)]">
        <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <h3
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#ff99cc] to-[#ff3399]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Quick Links
            </h3>
            <span className="text-xs text-[#ff4d94]">&#10084;</span>
          </div>
          <button className="text-[#ff99cc] hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-y-3.5 gap-x-2 my-auto">
          {quickLinks.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex flex-col items-center justify-center space-y-1.5 group p-1 rounded-2xl hover:bg-[#250720]/50 transition-all"
            >
              <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#ffffff]/40 via-[#ff66b2] to-[#ffffff]/80 shadow-[0_0_15px_rgba(255,77,148,0.4)] group-hover:shadow-[0_0_22px_rgba(255,77,148,0.8)] group-hover:scale-110 transition-all">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${item.glow} flex items-center justify-center border border-white/40 shadow-inner`}>
                  {item.icon}
                </div>
                <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#ffd6eb]/90 group-hover:text-white text-center leading-tight transition-colors line-clamp-1">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

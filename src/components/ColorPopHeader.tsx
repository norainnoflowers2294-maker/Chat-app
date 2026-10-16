import { resolveImageUrl } from '../utils/imageUrl';
import React from 'react';
import {
  Bell,
  Heart,
  Search,
  Sparkles,
  Wifi,
  WifiOff,
  Cloud,
  GitBranch,
} from 'lucide-react';
import { ConnectionDiagnostic } from '../types/roleplay';

interface ColorPopHeaderProps {
  diagnostic: ConnectionDiagnostic;
  firebaseConnected: boolean;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenFavorites: () => void;
  onOpenGitPush: () => void;
  userAvatar?: string;
  userName?: string;
}

export const ColorPopHeader: React.FC<ColorPopHeaderProps> = ({
  diagnostic,
  firebaseConnected,
  onOpenSettings,
  onOpenSearch,
  onOpenFavorites,
  onOpenGitPush,
  userAvatar = '/colorpop_hero.jpg',
  userName = 'Siren',
}) => {
  const isConnected = diagnostic.status === 'connected';
  const hasError = diagnostic.status === 'error';

  return (
    <header className="relative w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between z-30">
      {/* Left Action Icons */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onOpenFavorites}
          className="relative w-10 h-10 rounded-full bg-[#1e0818]/80 border border-[#ff4d94]/40 hover:border-[#ff4d94] flex items-center justify-center text-[#ff66b2] shadow-[0_0_15px_rgba(255,77,148,0.25)] hover:shadow-[0_0_20px_rgba(255,77,148,0.5)] transition-all group"
          title="Notifications & Activity"
        >
          <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ff007f] rounded-full ring-2 ring-black animate-pulse" />
        </button>

        <button
          onClick={onOpenFavorites}
          className="w-10 h-10 rounded-full bg-[#1e0818]/80 border border-[#ff4d94]/40 hover:border-[#ff4d94] flex items-center justify-center text-[#ff66b2] shadow-[0_0_15px_rgba(255,77,148,0.25)] hover:shadow-[0_0_20px_rgba(255,77,148,0.5)] transition-all group"
          title="Favorites"
        >
          <Heart className="w-4 h-4 fill-[#ff4d94]/40 group-hover:fill-[#ff4d94] transition-all" />
        </button>

        {/* GitHub Quick Sync Pill */}
        <button
          onClick={onOpenGitPush}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#1e0818]/80 border border-[#ff4d94]/40 hover:border-[#ff4d94] text-[11px] font-semibold text-[#ffb3d9] shadow-[0_0_15px_rgba(255,77,148,0.2)] hover:shadow-[0_0_20px_rgba(255,77,148,0.4)] transition-all"
          title="Push to GitHub (norainnoflowers2294-maker/Chat-app)"
        >
          <GitBranch className="w-3.5 h-3.5 text-[#ff4d94]" />
          <span>Sync GitHub</span>
        </button>
      </div>

      {/* Center Branding: "Pretty Little Fantasies" with Diamond Sparkles & Crown */}
      <div className="flex flex-col items-center justify-center cursor-pointer select-none">
        <div className="relative flex items-center justify-center">
          <div className="absolute -top-3.5 flex items-center justify-center space-x-1 text-[#ff80bf]">
            <span className="text-[10px]">&bull;</span>
            <span className="text-sm font-serif">&#9813;</span>
            <span className="text-[10px]">&bull;</span>
          </div>

          <h1
            className="text-xl sm:text-2xl md:text-4xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#ff99cc] to-[#ff1a8c] drop-shadow-[0_0_25px_rgba(255,51,153,0.85)] filter"
            style={{
              fontFamily: "'Playfair Display', cursive, serif",
              textShadow: '0 0 20px rgba(255, 77, 148, 0.7), 0 0 40px rgba(255, 0, 128, 0.4)',
            }}
          >
            Pretty Little <span className="text-[#ff3399]">Fantasies</span>
          </h1>

          <Sparkles className="w-4 h-4 text-white absolute -top-1 -right-4 animate-spin text-[#ffd6eb]" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      {/* Right Controls: Search, OpenRouter Status & Profile Avatar */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onOpenSettings}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all shadow-md ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : hasError
              ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
          }`}
          title="OpenRouter connection status & diagnostics"
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className="hidden lg:inline">
            {isConnected ? 'OpenRouter Connected' : hasError ? 'Connection Issue' : 'Setup OpenRouter'}
          </span>
        </button>

        <button
          onClick={onOpenSearch}
          className="w-10 h-10 rounded-full bg-[#1e0818]/80 border border-[#ff4d94]/40 hover:border-[#ff4d94] flex items-center justify-center text-[#ff66b2] shadow-[0_0_15px_rgba(255,77,148,0.25)] hover:shadow-[0_0_20px_rgba(255,77,148,0.5)] transition-all group"
          title="Search characters, lore, and chats"
        >
          <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>

        <div
          onClick={onOpenSettings}
          className="relative cursor-pointer group"
          title={`${userName} (Firebase & Settings)`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#ff007f] via-[#ffb3d9] to-[#ffffff] shadow-[0_0_20px_rgba(255,77,148,0.6)] group-hover:shadow-[0_0_25px_rgba(255,77,148,0.9)] transition-all">
            <img
              src={resolveImageUrl(userAvatar)}
              alt={userName}
              className="w-full h-full rounded-full object-cover ring-1 ring-black"
            />
          </div>
          {firebaseConnected && (
            <div
              title="Firebase Cloud Synced"
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full ring-2 ring-black flex items-center justify-center text-[8px] text-white"
            >
              <Cloud className="w-2 h-2" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

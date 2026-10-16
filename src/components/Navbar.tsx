import { resolveImageUrl } from '../utils/imageUrl';
import React from 'react';
import {
  Github,
  LogOut,
  HelpCircle,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { GitHubUser, RateLimit } from '../types';

interface NavbarProps {
  user: GitHubUser | null;
  rateLimit?: RateLimit;
  isGuest: boolean;
  onOpenConnect: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  rateLimit,
  isGuest,
  onOpenConnect,
  onOpenGuide,
  onLogout,
}) => {
  const remaining = rateLimit?.remaining ? parseInt(rateLimit.remaining, 10) : null;
  const limit = rateLimit?.limit ? parseInt(rateLimit.limit, 10) : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#161b22]/90 backdrop-blur-md border-b border-[#30363d] px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-md">
            <Github className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-base tracking-tight">GitHub Connect</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Hub
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] hidden sm:block">Unified GitHub Explorer &amp; Dashboard</p>
          </div>
        </div>

        {/* Center / Stats (Rate limit) */}
        {remaining !== null && limit !== null && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-[#0d1117] border border-[#30363d] rounded-full text-xs text-[#8b949e]">
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>API Quota:</span>
            <span className={`font-mono font-medium ${remaining < 100 ? 'text-red-400' : 'text-[#f0f6fc]'}`}>
              {remaining.toLocaleString()} / {limit.toLocaleString()}
            </span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenGuide}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#58a6ff]" />
            <span className="hidden sm:inline">OAuth Setup Guide</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#30363d]">
              <a
                href={user.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-all group"
              >
                <img
                  src={resolveImageUrl(user.avatar_url)}
                  alt={user.login}
                  className="w-7 h-7 rounded-full ring-1 ring-[#30363d]"
                />
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-[#f0f6fc] leading-none group-hover:text-blue-400 flex items-center gap-1">
                    {user.name || user.login}
                    {isGuest && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
                        Preview
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8b949e] font-mono leading-tight mt-0.5">
                    @{user.login}
                  </div>
                </div>
              </a>

              <button
                onClick={onLogout}
                title={isGuest ? 'Exit preview mode' : 'Disconnect GitHub account'}
                className="p-2 text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenConnect}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Github className="w-4 h-4 fill-current" />
              <span>Connect GitHub</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

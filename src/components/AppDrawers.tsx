import React, { useEffect, useState } from 'react';
import {
  BookOpen, FileText, FolderOpen, Home, Image, MessageSquare,
  PanelLeft, PanelRight, Puzzle, Settings, Sparkles, Users, UserRound, WalletCards, X,
  Bookmark, GitBranch, AtSign, Edit2,
} from 'lucide-react';
import type { Chat } from '../types/roleplay';
import type { NavTab } from './TopNavPill';

interface AppDrawersProps {
  activeTab: NavTab;
  chats: Chat[];
  activeChat: Chat | null;
  onNavigate: (tab: NavTab) => void;
  onSelectChat: (id: string) => void;
  onOpenWallet: (view: 'dashboard' | 'activity') => void;
  onOpenSettings: () => void;
  onOpenPlugins: () => void;
  onOpenStoryNotes: () => void;
  onOpenSavedMessages: () => void;
  onOpenScenes: () => void;
  onOpenGitHubSync: () => void;
  onOpenSocialMedia: () => void;
}

const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
  { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { id: 'chats', label: 'Chats', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'characters', label: 'Characters', icon: <Users className="h-4 w-4" /> },
  { id: 'lorebooks', label: 'Lorebooks', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'personas', label: 'Personas', icon: <UserRound className="h-4 w-4" /> },
  { id: 'gallery', label: 'Gallery', icon: <Image className="h-4 w-4" /> },
  { id: 'files', label: 'Files', icon: <FolderOpen className="h-4 w-4" /> },
  { id: 'perchance', label: 'Perchance AI', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'scratchpad', label: 'Scratchpad', icon: <Edit2 className="h-4 w-4" /> },
  { id: 'social', label: 'Social Media', icon: <AtSign className="h-4 w-4" /> },
];

export const AppDrawers: React.FC<AppDrawersProps> = (props) => {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  useEffect(() => {
    if (!leftOpen && !rightOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [leftOpen, rightOpen]);

  const close = () => { setLeftOpen(false); setRightOpen(false); };
  const run = (action: () => void) => { close(); action(); };

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" aria-label="Open app navigation drawer" aria-expanded={leftOpen}
          onClick={() => { setRightOpen(false); setLeftOpen(true); }}
          className="rounded-full border border-[#ff3399]/60 bg-[#ff007f]/20 p-2.5 text-white shadow-[0_0_14px_rgba(255,0,128,0.25)] hover:bg-[#ff007f]/40">
          <PanelLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Open app tools drawer" aria-expanded={rightOpen}
          onClick={() => { setLeftOpen(false); setRightOpen(true); }}
          className="rounded-full border border-[#ff3399]/60 bg-[#9b51e0]/20 p-2.5 text-white shadow-[0_0_14px_rgba(155,81,224,0.25)] hover:bg-[#9b51e0]/40">
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      {(leftOpen || rightOpen) && (
        <div className="fixed inset-0 z-[80]" onClick={close}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside role="dialog" aria-modal="true" aria-label="App navigation drawer"
            onClick={(event) => event.stopPropagation()}
            className={`absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col border-r border-[#ff66b2]/60 bg-[#140410] shadow-[10px_0_40px_rgba(255,0,128,0.35)] transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between border-b border-[#ff3399]/30 p-4">
              <div><h2 className="font-bold text-white">App navigation</h2><p className="text-xs text-[#ffd6eb]/65">Go to any section</p></div>
              <button type="button" aria-label="Close navigation drawer" onClick={() => setLeftOpen(false)} className="rounded-xl bg-white/10 p-2 text-white"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <button key={item.id} type="button" aria-current={props.activeTab === item.id ? 'page' : undefined}
                  onClick={() => run(() => props.onNavigate(item.id))}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm ${props.activeTab === item.id ? 'bg-[#ff007f]/25 font-semibold text-white' : 'text-[#ffd6eb]/85 hover:bg-white/10'}`}>
                  {item.icon}<span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-white/10 pt-3">
                <h3 className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff99cc]">Recent chats</h3>
                {props.chats.length ? props.chats.map((chat) => (
                  <button key={chat.id} type="button"
                    onClick={() => run(() => props.onSelectChat(chat.id))}
                    className={`mb-1 w-full rounded-xl p-3 text-left ${props.activeChat?.id === chat.id ? 'bg-[#ff007f]/20' : 'bg-white/5 hover:bg-white/10'}`}>
                    <span className="block truncate text-sm font-semibold text-white">{chat.title || 'Untitled chat'}</span>
                    <span className="block truncate text-[10px] text-[#ffd6eb]/60">{chat.messages[chat.messages.length - 1]?.content || 'No messages yet'}</span>
                  </button>
                )) : <p className="rounded-xl bg-white/5 p-3 text-xs text-[#ffd6eb]/60">Your chats will appear here.</p>}
              </div>
            </nav>
          </aside>

          <aside role="dialog" aria-modal="true" aria-label="App tools drawer"
            onClick={(event) => event.stopPropagation()}
            className={`absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col border-l border-[#ff66b2]/60 bg-[#140410] shadow-[-10px_0_40px_rgba(255,0,128,0.35)] transition-transform duration-300 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between border-b border-[#ff3399]/30 p-4">
              <div><h2 className="font-bold text-white">App tools</h2><p className="text-xs text-[#ffd6eb]/65">Your story systems and settings</p></div>
              <button type="button" aria-label="Close tools drawer" onClick={() => setRightOpen(false)} className="rounded-xl bg-white/10 p-2 text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              <button type="button" disabled={!props.activeChat} onClick={() => run(() => props.onOpenWallet('dashboard'))}
                className="flex w-full items-center gap-3 rounded-xl border border-[#ff66b2]/30 bg-gradient-to-r from-[#ff007f]/15 to-[#9b51e0]/15 p-3 text-left text-white enabled:hover:bg-[#ff007f]/25 disabled:cursor-not-allowed disabled:opacity-45">
                <WalletCards className="h-5 w-5 text-[#ff99cc]" /><span><strong className="block text-sm">Money system · Story Wallet</strong><small className="text-[10px] text-[#ffd6eb]/65">{props.activeChat ? 'Balances and character transfers' : 'Open a chat to use its wallet'}</small></span>
              </button>
              <button type="button" onClick={() => run(props.onOpenSocialMedia)} className="flex w-full items-center gap-3 rounded-xl border border-[#ff66b2]/25 bg-[#ff007f]/10 p-3 text-left text-sm text-white hover:bg-[#ff007f]/20"><AtSign className="h-4 w-4 text-pink-300" />Social Media world</button>
              <button type="button" onClick={() => run(props.onOpenStoryNotes)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><FileText className="h-4 w-4 text-indigo-300" />Story Notes &amp; Memories</button>
              <button type="button" onClick={() => run(props.onOpenSavedMessages)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><Bookmark className="h-4 w-4 text-emerald-300" />Saved Messages</button>
              <button type="button" onClick={() => run(props.onOpenScenes)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><Image className="h-4 w-4 text-cyan-300" />Scene Gallery</button>
              <button type="button" onClick={() => run(props.onOpenPlugins)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><Puzzle className="h-4 w-4 text-fuchsia-300" />Plugins</button>
              <button type="button" onClick={() => run(props.onOpenSettings)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><Settings className="h-4 w-4 text-[#ff99cc]" />Settings &amp; diagnostics</button>
              <button type="button" onClick={() => run(props.onOpenGitHubSync)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-sm text-white hover:bg-white/10"><GitBranch className="h-4 w-4 text-sky-300" />GitHub backup</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

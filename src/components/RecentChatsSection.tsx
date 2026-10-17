import { resolveImageUrl } from '../utils/imageUrl';
import React from 'react';
import {
  MessageSquare,
  Sparkles,
  FileText,
  Bookmark,
  ArrowRight,
  MoreHorizontal,
  Clock,
} from 'lucide-react';
import { Chat } from '../types/roleplay';

interface RecentChatsSectionProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  onContinueLastChat: () => void;
  onGenerateSceneImage: () => void;
  onOpenStoryNotes: () => void;
  onOpenSavedMessages: () => void;
  onViewAllChats: () => void;
}

function chatActivityTime(chat: Chat): number {
  const lastMessageTime = chat.messages[chat.messages.length - 1]?.timestamp || 0;
  const updatedAtTime = new Date(chat.updatedAt).getTime();
  return Math.max(lastMessageTime, Number.isFinite(updatedAtTime) ? updatedAtTime : 0);
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return 'No messages yet';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}

export const RecentChatsSection: React.FC<RecentChatsSectionProps> = ({
  chats,
  onSelectChat,
  onContinueLastChat,
  onGenerateSceneImage,
  onOpenStoryNotes,
  onOpenSavedMessages,
  onViewAllChats,
}) => {
  const recentChats = [...chats].sort((a, b) => chatActivityTime(b) - chatActivityTime(a));
  const latestChat = recentChats[0];

  return (
    <div className="w-full px-4 sm:px-6 py-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Chats (8 cols) */}
        <div className="lg:col-span-8 bg-[#140410]/90 backdrop-blur-md border-2 border-[#ff3399]/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(255,51,153,0.3)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-3 mb-4">
            <h3
              className="text-xl font-bold text-white tracking-wide"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Recent Chats
            </h3>

            <div className="flex items-center space-x-2">
              <button
                onClick={onViewAllChats}
                className="flex items-center space-x-1 px-3 py-1 bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff66b2]/50 rounded-full text-xs font-semibold text-[#ffd6eb] transition-all"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="text-[#ff99cc] hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentChats.slice(0, 4).map((chat) => {
              const bgImg = chat.bgImage || '/penthouse.jpg';
              const msgCount = chat.messages.length;
              const timeAgo = formatTimeAgo(chatActivityTime(chat));

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="group relative rounded-2xl overflow-hidden border border-[#ff3399]/40 hover:border-[#ff3399] bg-[#1a0515] shadow-lg hover:shadow-[0_0_20px_rgba(255,51,153,0.5)] transition-all duration-300 cursor-pointer flex flex-col justify-between aspect-[3/4]"
                >
                  <img
                    src={resolveImageUrl(bgImg)}
                    alt={chat.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                  <div className="relative p-2 flex justify-end z-10">
                    <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white shadow">
                      <MessageSquare className="w-3 h-3 text-[#ff66b2]" />
                      <span>{msgCount}</span>
                    </div>
                  </div>

                  <div className="relative p-3 z-10 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate drop-shadow group-hover:text-[#ff99cc] transition-colors">
                        {chat.title}
                      </h4>
                      <MoreHorizontal className="w-3.5 h-3.5 text-[#ffd6eb]/70" />
                    </div>
                    <p className="text-[10px] text-[#ffd6eb]/80 truncate flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 inline" />
                      <span>Last message {timeAgo}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Continue Action Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-[#140410]/90 backdrop-blur-md border-2 border-[#ff3399]/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(255,51,153,0.3)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-3 mb-4">
            <h3
              className="text-xl font-bold text-white tracking-wide"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Continue
            </h3>
            <button className="text-[#ff99cc] hover:text-white transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 my-auto">
            <button
              onClick={onContinueLastChat}
              disabled={!latestChat}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white font-bold text-xs shadow-[0_0_20px_rgba(255,0,128,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">{latestChat ? `Continue ${latestChat.title}` : 'No recent chat yet'}</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGenerateSceneImage}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00b4db] to-[#0083b0] hover:from-[#1ac6ea] hover:to-[#0098cc] text-white font-bold text-xs shadow-[0_0_20px_rgba(0,180,219,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Generate Scene Image</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenStoryNotes}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#8e2de2] to-[#4a00e0] hover:from-[#9d44e8] hover:to-[#570fe6] text-white font-bold text-xs shadow-[0_0_20px_rgba(142,45,226,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4" />
                <span>Story Notes</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSavedMessages}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#0ba360] to-[#3cba92] hover:from-[#11b86e] hover:to-[#4ec9a2] text-white font-bold text-xs shadow-[0_0_20px_rgba(11,163,96,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <Bookmark className="w-4 h-4" />
                <span>Saved Messages</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

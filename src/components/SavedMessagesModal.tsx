import React, { useState } from 'react';
import { X, Bookmark, Trash2, ArrowRight, MessageSquare, Copy, Check } from 'lucide-react';
import { Chat } from '../types/roleplay';

interface SavedMessage {
  id: string;
  chatId: string;
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: number;
}

interface SavedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMessages: SavedMessage[];
  chats: Chat[];
  onRemoveSavedMessage: (id: string) => void;
  onOpenChat: (chatId: string) => void;
}

export const SavedMessagesModal: React.FC<SavedMessagesModalProps> = ({
  isOpen,
  onClose,
  savedMessages,
  chats,
  onRemoveSavedMessage,
  onOpenChat,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,51,153,0.4)] flex flex-col max-h-[85vh] overflow-hidden text-[#ffd6eb]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#0ba360] to-[#3cba92] text-white shadow-[0_0_15px_rgba(11,163,96,0.6)]">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Saved Messages &amp; Quotes
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Favorite roleplay quotes, confessions, and iconic character moments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] hover:text-white transition-all"
            title="Close (X)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Saved Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {savedMessages.length === 0 ? (
            <div className="text-center py-12 text-[#ffd6eb]/60 space-y-2">
              <Bookmark className="w-10 h-10 mx-auto opacity-40 text-[#ff66b2]" />
              <p className="text-sm font-semibold">No saved messages yet.</p>
              <p className="text-xs">
                During chat, bookmark iconic lines or save roleplay dialogue to review here.
              </p>
            </div>
          ) : (
            savedMessages.map((msg) => {
              const chat = chats.find((c) => c.id === msg.chatId);
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="p-4 bg-[#1b0517] border border-[#ff3399]/30 hover:border-[#ff3399] rounded-2xl space-y-2 group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={msg.avatar || '/lucious.jpg'}
                        alt={msg.senderName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#ff007f]"
                      />
                      <span className="text-xs font-bold text-white">{msg.senderName}</span>
                      {chat && (
                        <span className="text-[10px] text-[#ff99cc] bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          {chat.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 text-[#ffd6eb]/70 hover:text-white transition-colors"
                        title="Copy text"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => onRemoveSavedMessage(msg.id)}
                        className="p-1 text-[#ff66b2] hover:text-rose-400 transition-colors"
                        title="Delete saved quote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#ffd6eb] whitespace-pre-wrap leading-relaxed italic border-l-2 border-[#ff007f] pl-3 py-1">
                    "{msg.content}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#ffd6eb]/60 pt-1">
                    <span>{new Date(msg.timestamp).toLocaleString()}</span>
                    {chat && (
                      <button
                        onClick={() => {
                          onOpenChat(chat.id);
                          onClose();
                        }}
                        className="text-[#ff99cc] hover:text-white flex items-center gap-1 font-semibold"
                      >
                        <span>Jump to Chat</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

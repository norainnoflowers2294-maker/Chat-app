import React, { useState } from 'react';
import { X, FileText, Plus, Trash2, Bookmark, Sparkles, BookOpen } from 'lucide-react';
import { StoryMemory, Chat } from '../types/roleplay';

interface StoryNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: StoryMemory[];
  chats: Chat[];
  activeChatId?: string;
  onSaveMemory: (memory: StoryMemory) => void;
  onDeleteMemory: (id: string) => void;
  onOpenChat: (chatId: string) => void;
}

export const StoryNotesModal: React.FC<StoryNotesModalProps> = ({
  isOpen,
  onClose,
  memories,
  chats,
  activeChatId,
  onSaveMemory,
  onDeleteMemory,
  onOpenChat,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'note' | 'quote' | 'recap'>('note');
  const [selectedChatId, setSelectedChatId] = useState<string>(activeChatId || chats[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newMem: StoryMemory = {
      id: `mem_${Date.now()}`,
      chatId: selectedChatId || undefined,
      title: title.trim(),
      type,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    onSaveMemory(newMem);
    setTitle('');
    setContent('');
  };

  const filtered = memories.filter((m) => {
    if (filterType === 'all') return true;
    return m.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,51,153,0.4)] flex flex-col max-h-[90vh] overflow-hidden text-[#ffd6eb]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#ff3399] text-white shadow-[0_0_15px_rgba(255,0,128,0.6)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Story Notes &amp; Memories
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Track memorable quotes, roleplay recaps, plot twists, and secret thoughts
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

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 mb-4">
          {['all', 'note', 'quote', 'recap'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                filterType === t
                  ? 'bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white shadow-[0_0_15px_rgba(255,0,128,0.5)]'
                  : 'bg-white/10 text-[#ffd6eb]/80 hover:bg-white/20'
              }`}
            >
              {t === 'all' ? 'All Memories' : t + 's'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Create New Form */}
          <form
            onSubmit={handleAddNote}
            className="p-4 bg-[#1e071a] border border-[#ff3399]/30 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#ff99cc] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add New Memory Note
              </span>
              <div className="flex items-center space-x-2">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="bg-[#12040e] border border-[#ff3399]/40 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="note">Note</option>
                  <option value="quote">Quote</option>
                  <option value="recap">Story Recap</option>
                </select>

                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="bg-[#12040e] border border-[#ff3399]/40 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none max-w-[130px] truncate"
                >
                  {chats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="Note Title (e.g. Penthouse Promise, The Secret Deal)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#12040e] border border-[#ff3399]/30 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
            />

            <textarea
              rows={2}
              placeholder="Write the roleplay memory, excerpt, or secret plot notes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#12040e] border border-[#ff3399]/30 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="px-4 py-2 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(255,0,128,0.6)] transition-all disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </form>

          {/* List of Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((mem) => {
              const chat = chats.find((c) => c.id === mem.chatId);
              return (
                <div
                  key={mem.id}
                  className="p-4 bg-[#1b0517] border border-[#ff3399]/30 hover:border-[#ff3399] rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#ff007f]/20 text-[#ff99cc] border border-[#ff007f]/40 font-bold">
                        {mem.type}
                      </span>
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#ff66b2] hover:text-rose-400 transition-opacity p-1"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{mem.title}</h4>
                    <p className="text-xs text-[#ffd6eb]/80 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {mem.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#ffd6eb]/60">
                    <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                    {chat && (
                      <button
                        onClick={() => {
                          onOpenChat(chat.id);
                          onClose();
                        }}
                        className="text-[#ff99cc] hover:text-white flex items-center gap-1 font-semibold"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{chat.title}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

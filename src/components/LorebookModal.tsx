import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Upload,
  Trash2,
  Key,
} from 'lucide-react';
import { Lorebook, LoreEntry } from '../types/roleplay';
import { parseLorebookFile } from '../utils/pngParser';

interface LorebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lorebooks: Lorebook[];
  onSaveLorebook: (lorebook: Lorebook) => void;
}

export const LorebookModal: React.FC<LorebookModalProps> = ({
  isOpen,
  onClose,
  lorebooks,
  onSaveLorebook,
}) => {
  const [selectedLorebook, setSelectedLorebook] = useState<Lorebook>(lorebooks[0] || null);

  const [entryKeys, setEntryKeys] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryComment, setEntryComment] = useState('');
  const [isConstant, setIsConstant] = useState(false);

  const [isNewBookModal, setIsNewBookModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseLorebookFile(file);
      const newLore: Lorebook = {
        id: `lore_${Date.now()}`,
        name: parsed.name || 'Imported Lorebook',
        description: parsed.description || 'Imported world info',
        avatar: parsed.avatar || '/mansion.jpg',
        scan_depth: parsed.scan_depth || 4,
        token_budget: parsed.token_budget || 1500,
        recursive_scanning: Boolean(parsed.recursive_scanning),
        entries: parsed.entries || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveLorebook(newLore);
      setSelectedLorebook(newLore);
    } catch (err) {
      console.error('Failed to import lorebook:', err);
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryKeys.trim() || !entryContent.trim() || !selectedLorebook) return;

    const newEntry: LoreEntry = {
      id: `le_${Date.now()}`,
      keys: entryKeys.split(',').map((k) => k.trim()).filter(Boolean),
      comment: entryComment.trim() || entryKeys.split(',')[0],
      content: entryContent.trim(),
      constant: isConstant,
      selective: false,
      insertion_order: (selectedLorebook.entries.length + 1) * 10,
      position: 'before_char',
      enabled: true,
    };

    const updated: Lorebook = {
      ...selectedLorebook,
      entries: [...selectedLorebook.entries, newEntry],
      updatedAt: new Date().toISOString(),
    };

    onSaveLorebook(updated);
    setSelectedLorebook(updated);
    setEntryKeys('');
    setEntryContent('');
    setEntryComment('');
    setIsConstant(false);
  };

  const removeEntry = (entryId: string) => {
    if (!selectedLorebook) return;
    const updated: Lorebook = {
      ...selectedLorebook,
      entries: selectedLorebook.entries.filter((e) => e.id !== entryId),
      updatedAt: new Date().toISOString(),
    };
    onSaveLorebook(updated);
    setSelectedLorebook(updated);
  };

  const handleCreateNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) return;

    const newBook: Lorebook = {
      id: `lore_${Date.now()}`,
      name: newBookName.trim(),
      description: newBookDesc.trim(),
      avatar: '/mansion.jpg',
      scan_depth: 4,
      token_budget: 1500,
      recursive_scanning: true,
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveLorebook(newBook);
    setSelectedLorebook(newBook);
    setIsNewBookModal(false);
    setNewBookName('');
    setNewBookDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff3399]/30 bg-[#0d020b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff6f61] to-[#ff8577] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,111,97,0.6)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Lorebook &amp; World Info Studio</h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Create and import PNG or JSON lorebooks with smart keyword scanning
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer px-3 py-1.5 bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff66b2]/50 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Import PNG / JSON</span>
              <input type="file" accept=".png,.json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setIsNewBookModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,0,128,0.5)] flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Lorebook</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#ffd6eb]/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 text-xs text-[#ffd6eb]">
          <div className="w-full md:w-64 space-y-2 shrink-0">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-2">
              Your Lorebooks ({lorebooks.length})
            </div>
            {lorebooks.map((lb) => (
              <div
                key={lb.id}
                onClick={() => setSelectedLorebook(lb)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                  selectedLorebook?.id === lb.id
                    ? 'bg-[#ff007f]/20 border-[#ff007f] shadow-[0_0_15px_rgba(255,0,128,0.4)]'
                    : 'bg-[#1a0515] border-[#ff3399]/20 hover:border-[#ff3399]/50'
                }`}
              >
                <img
                  src={resolveImageUrl(lb.avatar || '/mansion.jpg')}
                  alt={lb.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
                />
                <div className="overflow-hidden flex-1">
                  <div className="font-bold text-white truncate">{lb.name}</div>
                  <div className="text-[10px] text-[#ffd6eb]/70">{lb.entries.length} entries</div>
                </div>
              </div>
            ))}
          </div>

          {selectedLorebook ? (
            <div className="flex-1 space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-1">
                <h3 className="text-base font-bold text-white">{selectedLorebook.name}</h3>
                <p className="text-xs text-[#ffd6eb]/80">{selectedLorebook.description || 'No description provided.'}</p>
              </div>

              <form onSubmit={handleAddEntry} className="p-4 bg-[#1e0818] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#ff3399]" />
                  <span>Add World Info Entry</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-white">Trigger Keys (comma separated) *</label>
                    <input
                      type="text"
                      placeholder="e.g. penthouse, suite, rooftop"
                      value={entryKeys}
                      onChange={(e) => setEntryKeys(e.target.value)}
                      required
                      className="w-full bg-[#12040e] border border-[#ff3399]/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-white">Comment / Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Skyfall Penthouse Description"
                      value={entryComment}
                      onChange={(e) => setEntryComment(e.target.value)}
                      className="w-full bg-[#12040e] border border-[#ff3399]/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white">Entry Content / Lore *</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the setting, secret, organization, or historical fact to inject when triggered..."
                    value={entryContent}
                    onChange={(e) => setEntryContent(e.target.value)}
                    required
                    className="w-full bg-[#12040e] border border-[#ff3399]/40 rounded-xl p-3 text-xs text-white focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isConstant}
                      onChange={(e) => setIsConstant(e.target.checked)}
                      className="accent-[#ff007f] rounded"
                    />
                    <span>Constant (Always active in prompt)</span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Add Entry
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <div className="font-bold text-white uppercase text-[11px] tracking-wider">
                  Entries in {selectedLorebook.name} ({selectedLorebook.entries.length})
                </div>

                {selectedLorebook.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-[#1a0515] border border-[#ff3399]/30 rounded-xl space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Key className="w-3.5 h-3.5 text-[#ff66b2]" />
                        <span className="font-bold text-white">{entry.comment || entry.keys[0]}</span>
                        <div className="flex flex-wrap gap-1">
                          {entry.keys.map((k) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-[#ffb3d9]"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-white/40 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-[#ffd6eb]/90 leading-relaxed font-sans">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#ffd6eb]/50">
              Select or create a lorebook to begin editing entries
            </div>
          )}
        </div>

        {isNewBookModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-20">
            <form onSubmit={handleCreateNewBook} className="bg-[#1e0818] border-2 border-[#ff3399] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">Create New Lorebook</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white">Lorebook Name</label>
                <input
                  type="text"
                  placeholder="e.g. Luxury Syndicate Lore"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  required
                  className="w-full bg-[#12040e] border border-[#ff3399]/40 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white">Description</label>
                <textarea
                  rows={2}
                  placeholder="World facts and lore..."
                  value={newBookDesc}
                  onChange={(e) => setNewBookDesc(e.target.value)}
                  className="w-full bg-[#12040e] border border-[#ff3399]/40 rounded-xl p-3 text-xs text-white resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewBookModal(false)}
                  className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white rounded-xl text-xs font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

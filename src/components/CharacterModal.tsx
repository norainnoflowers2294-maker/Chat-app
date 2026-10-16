import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  Plus,
  Users,
  Search,
  MessageSquare,
  Edit,
} from 'lucide-react';
import { Character } from '../types/roleplay';
import { parseCharacterFile, exportCharacterJson } from '../utils/pngParser';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onSaveCharacter: (char: Character) => void;
  onStartChatWithCharacter: (char: Character) => void;
  onOpenCreateCharacter?: (characterToEdit?: Character | null) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  characters,
  onSaveCharacter,
  onStartChatWithCharacter,
  onOpenCreateCharacter,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseCharacterFile(file);
      if (onOpenCreateCharacter) {
        onClose();
        onOpenCreateCharacter(parsed as Character);
      }
    } catch (err) {
      console.error('Failed to parse file:', err);
    }
  };

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff3399]/30 bg-[#0d020b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#ff3399] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,0,128,0.6)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Character Studio &amp; Library
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Import PNG or JSON cards, create bespoke characters, and start roleplays
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer px-3 py-1.5 bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff66b2]/50 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-[0_0_10px_rgba(255,0,128,0.3)]">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Card</span>
              <input
                type="file"
                accept=".png,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                onClose();
                if (onOpenCreateCharacter) {
                  onOpenCreateCharacter(null);
                }
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,0,128,0.5)] flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Character Page</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#ffd6eb]/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Character Library View */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#ff99cc]" />
            <input
              type="text"
              placeholder="Search characters by name or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCharacters.map((char) => (
              <div
                key={char.id}
                className="bg-[#1a0515] border border-[#ff3399]/40 hover:border-[#ff3399] rounded-2xl p-4 shadow-lg hover:shadow-[0_0_20px_rgba(255,51,153,0.3)] transition-all flex flex-col justify-between group"
              >
                <div className="flex items-start space-x-3.5">
                  <img
                    src={resolveImageUrl(char.avatar)}
                    alt={char.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#ff3399]/50 shadow-md shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white truncate group-hover:text-[#ff99cc] transition-colors">
                        {char.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => exportCharacterJson(char)}
                          title="Export Character JSON"
                          className="p-1 text-[#ffd6eb]/70 hover:text-white rounded"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#ffd6eb]/80 line-clamp-2 leading-relaxed">
                      {char.summary || char.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {char.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.2 rounded-md bg-[#ff007f]/20 border border-[#ff66b2]/30 text-[#ffd6eb] text-[10px] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#ff3399]/20">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenCreateCharacter) {
                        onOpenCreateCharacter(char);
                      }
                    }}
                    className="text-xs text-[#ffd6eb]/80 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#ff99cc]" />
                    <span>Edit Character</span>
                  </button>

                  <button
                    onClick={() => {
                      onStartChatWithCharacter(char);
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white text-xs font-bold rounded-xl shadow-[0_0_12px_rgba(255,0,128,0.5)] transition-all flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Start Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

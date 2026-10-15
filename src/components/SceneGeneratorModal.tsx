import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Download, Check, RefreshCw } from 'lucide-react';
import { Chat } from '../types/roleplay';

interface SceneGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  activeChatId?: string;
  onApplySceneBackground: (chatId: string, bgUrl: string) => void;
}

export const SceneGeneratorModal: React.FC<SceneGeneratorModalProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onApplySceneBackground,
}) => {
  const [prompt, setPrompt] = useState('Opulent multi-level glass penthouse overlooking futuristic neon skyline at 2 AM, violet and magenta rim lights, luxury marble terrace');
  const [style, setStyle] = useState('Photorealistic Luxury');
  const [aspect, setAspect] = useState('16:9');
  const [selectedChatId, setSelectedChatId] = useState<string>(activeChatId || chats[0]?.id || '');
  const [selectedImage, setSelectedImage] = useState<string>('/penthouse.jpg');

  // Curated scene collection presets
  const scenePresets = [
    {
      title: 'Skyfall Penthouse Terrace',
      url: '/penthouse.jpg',
      category: 'Luxury',
      desc: 'Marble terrace overlooking neon magenta city lights.',
    },
    {
      title: 'Beverly Hills Citadel',
      url: '/mansion.jpg',
      category: 'Estate',
      desc: '30,000-sq-ft private compound with infinity pool and palm trees.',
    },
    {
      title: 'Midnight Highway Run',
      url: '/roadtrip.jpg',
      category: 'Action',
      desc: 'Twin-turbo exotic supercars speeding along the coastal highway.',
    },
    {
      title: 'ColorPop VIP Lounge',
      url: '/colorpop_hero.jpg',
      category: 'Nightlife',
      desc: 'Diamond chandeliers, black velvet booths, and vintage champagne.',
    },
    {
      title: 'Billionaire Suite Intimacy',
      url: '/lucious.jpg',
      category: 'Intimate',
      desc: 'Smoky ambient amber glow with private balcony lounge.',
    },
  ];

  if (!isOpen) return null;

  const handleApply = () => {
    if (selectedChatId && selectedImage) {
      onApplySceneBackground(selectedChatId, selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,51,153,0.4)] flex flex-col max-h-[90vh] overflow-hidden text-[#ffd6eb]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#00b4db] to-[#0083b0] text-white shadow-[0_0_15px_rgba(0,180,219,0.6)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Scene Image Visualizer
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Generate high-fashion backgrounds and set dynamic backdrops for your roleplay chats
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Prompt Box */}
          <div className="p-4 bg-[#1e071a] border border-[#ff3399]/30 rounded-2xl space-y-3">
            <label className="text-xs font-bold text-[#ff99cc] block">
              Scene Prompt &amp; Atmosphere
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-[#12040e] border border-[#ff3399]/30 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-[#ffd6eb]/70">Style:</span>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="bg-[#12040e] border border-[#ff3399]/30 rounded-xl px-2.5 py-1 text-xs text-white"
                >
                  <option value="Photorealistic Luxury">Photorealistic Luxury</option>
                  <option value="Anime Cyberpunk">Anime Cyberpunk</option>
                  <option value="Cinematic Noir">Cinematic Noir</option>
                  <option value="Fantasy Oil Painting">Fantasy Oil Painting</option>
                </select>

                <select
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value)}
                  className="bg-[#12040e] border border-[#ff3399]/30 rounded-xl px-2.5 py-1 text-xs text-white"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-[#ffd6eb]/70">Target Chat:</span>
                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="bg-[#12040e] border border-[#ff3399]/30 rounded-xl px-2.5 py-1 text-xs text-white"
                >
                  {chats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preset Scene Gallery */}
          <div>
            <h3 className="text-xs font-bold text-[#ff99cc] uppercase tracking-wider mb-2.5">
              Available Scene &amp; Atmosphere Presets
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {scenePresets.map((preset) => {
                const isSelected = selectedImage === preset.url;
                return (
                  <div
                    key={preset.url}
                    onClick={() => setSelectedImage(preset.url)}
                    className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-[16/10] group ${
                      isSelected
                        ? 'border-[#00b4db] ring-2 ring-[#00b4db]/50 shadow-[0_0_20px_rgba(0,180,219,0.5)] scale-[1.02]'
                        : 'border-[#ff3399]/30 hover:border-[#ff3399]'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-[#00b4db] text-white shadow">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 border border-white/20">
                        {preset.category}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate mt-0.5">{preset.title}</h4>
                      <p className="text-[10px] text-[#ffd6eb]/80 truncate">{preset.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-[#ff3399]/30 flex items-center justify-between">
          <p className="text-xs text-[#ffd6eb]/70">
            Selected: <strong className="text-white">{scenePresets.find((p) => p.url === selectedImage)?.title || 'Custom Scene'}</strong>
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[#ffd6eb] rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-[#00b4db] to-[#0083b0] hover:from-[#1ac6ea] hover:to-[#0098cc] text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,180,219,0.7)] transition-all hover:scale-105"
            >
              Set as Chat Backdrop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

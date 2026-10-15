import React, { useState } from 'react';
import {
  X,
  Puzzle,
  Heart,
  Briefcase,
  CloudMoon,
  Dices,
  Sparkles,
  Check,
  Plus,
  Sliders,
} from 'lucide-react';
import { Plugin } from '../types/roleplay';

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  plugins: Plugin[];
  onTogglePlugin: (pluginId: string) => void;
  onSavePlugin: (plugin: Plugin) => void;
}

export const PluginModal: React.FC<PluginModalProps> = ({
  isOpen,
  onClose,
  plugins,
  onTogglePlugin,
  onSavePlugin,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [category, setCategory] = useState<'mechanics' | 'immersion' | 'utility' | 'style'>('immersion');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlugin: Plugin = {
      id: `plugin_${Date.now()}`,
      name: name.trim(),
      icon: 'Puzzle',
      description: description.trim(),
      category,
      enabled: true,
      config: {},
      customPrompt: customPrompt.trim(),
      badge: 'Active Plugin',
    };

    onSavePlugin(newPlugin);
    setIsCreating(false);
    setName('');
    setDescription('');
    setCustomPrompt('');
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Heart':
        return <Heart className="w-5 h-5 text-rose-400 fill-rose-500/30" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-amber-400" />;
      case 'CloudMoon':
        return <CloudMoon className="w-5 h-5 text-sky-400" />;
      case 'Dices':
        return <Dices className="w-5 h-5 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-fuchsia-400" />;
      default:
        return <Puzzle className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff3399]/30 bg-[#0d020b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00b4db] to-[#0083b0] flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,180,219,0.5)]">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Plugin Studio &amp; Library</h2>
              <p className="text-xs text-[#ffd6eb]/70">
                5 active plugins per roleplay session (Affinity, Inventory, Weather, Dice, Style)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'View Plugins' : 'New Plugin'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-[#ffd6eb]/70 hover:text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-[#ffd6eb]">
          {isCreating ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-white">Plugin Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Relationship Affinity Meter, Soundscape Generator..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-white">Description</label>
                <input
                  type="text"
                  placeholder="What does this plugin do in chat?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-white">Custom System Prompt Injection</label>
                <textarea
                  rows={4}
                  placeholder="Directives injected into OpenRouter system prompt for every message..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 rounded-xl p-3 text-xs text-white resize-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ff3399]/20">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-white/10 rounded-xl text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#ff007f] to-[#ff3399] rounded-xl text-white font-bold shadow-md"
                >
                  Save Plugin
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[#ffd6eb]/70 pb-1">
                <span>Active Plugins ({plugins.filter((p) => p.enabled).length} / 5 Selected)</span>
                <span>Each chat uses up to 5 plugins simultaneously</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      plugin.enabled
                        ? 'bg-[#ff007f]/15 border-[#ff007f] shadow-[0_0_15px_rgba(255,0,128,0.3)]'
                        : 'bg-[#1a0515] border-[#ff3399]/20 opacity-70'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center">
                            {getIcon(plugin.icon)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{plugin.name}</h4>
                            <span className="text-[10px] font-mono uppercase text-[#ff99cc]">
                              {plugin.category}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onTogglePlugin(plugin.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            plugin.enabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          {plugin.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </div>

                      <p className="text-xs text-[#ffd6eb]/80 leading-relaxed">
                        {plugin.description}
                      </p>
                    </div>

                    {plugin.badge && (
                      <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-[#ffd6eb]/60">Live Output:</span>
                        <span className="font-mono text-[#ff80bf] font-bold">{plugin.badge}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

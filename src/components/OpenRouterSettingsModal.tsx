import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Sliders,
  Database,
  GitBranch,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  Search,
  RotateCcw,
  FileText,
  Copy,
  Check,
  Download,
  Upload,
  Cpu,
  Bot,
  User,
  Zap,
  HelpCircle,
  Trash2,
  Play,
  Layers,
  Sparkle,
} from 'lucide-react';
import {
  OpenRouterConfig,
  ConnectionDiagnostic,
  SupabaseConfig,
  PromptsConfig,
  GenerationConfig,
  ChatBehaviorConfig,
  OpenRouterModelItem,
  RequestDiagnosticLog,
} from '../types/roleplay';
import {
  DEFAULT_PROMPTS,
  DEFAULT_GENERATION,
  DEFAULT_CHAT_BEHAVIOR,
  DEFAULT_OPENROUTER_CONFIG,
  exportSettingsJSON,
  importSettingsJSON,
} from '../lib/storage';
import { buildOpenRouterMessages, getUnknownVariables, KNOWN_PROMPT_VARIABLES } from '../utils/promptAssembler';
import { signInWithGoogle, logOutFirebase } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface OpenRouterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OpenRouterConfig;
  onSaveConfig: (cfg: OpenRouterConfig) => void;
  diagnostic: ConnectionDiagnostic;
  onTestConnection: (key?: string, model?: string) => Promise<void>;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (cfg: SupabaseConfig) => void;
  firebaseUser: FirebaseUser | null;
}

type TabType = 'models' | 'prompts' | 'generation' | 'chat' | 'connections' | 'storage';

export const OpenRouterSettingsModal: React.FC<OpenRouterSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  diagnostic,
  onTestConnection,
  supabaseConfig,
  onSaveSupabaseConfig,
  firebaseUser,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('models');

  // Connection & Keys
  const [provider, setProvider] = useState<string>(config.provider || 'openrouter');
  const [apiKey, setApiKey] = useState<string>(config.apiKey || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Models
  const [model, setModel] = useState<string>(config.model || 'gryphe/mythomax-l2-13b');
  const [fallbackModel, setFallbackModel] = useState<string>(
    config.fallbackModel || 'meta-llama/llama-3.3-70b-instruct'
  );
  const [modelSearch, setModelSearch] = useState<string>('');
  const [dynamicModels, setDynamicModels] = useState<OpenRouterModelItem[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // Prompts
  const [prompts, setPrompts] = useState<PromptsConfig>({
    ...DEFAULT_PROMPTS,
    ...(config.prompts || {}),
  });
  const [activePromptKey, setActivePromptKey] = useState<keyof PromptsConfig>('mainSystemPrompt');
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);

  // Generation
  const [generation, setGeneration] = useState<GenerationConfig>({
    ...DEFAULT_GENERATION,
    ...(config.generation || {}),
  });

  // Chat Behavior
  const [chatBehavior, setChatBehavior] = useState<ChatBehaviorConfig>({
    ...DEFAULT_CHAT_BEHAVIOR,
    ...(config.chatBehavior || {}),
  });

  // Diagnostics & Logs
  const [testing, setTesting] = useState<boolean>(false);
  const [diagnosticsHistory, setDiagnosticsHistory] = useState<RequestDiagnosticLog[]>(
    config.diagnosticsHistory || []
  );

  // Supabase & Cloud
  const [supaUrl, setSupaUrl] = useState<string>(supabaseConfig.url || '');
  const [supaKey, setSupaKey] = useState<string>(supabaseConfig.anonKey || '');

  // Storage Import / Export
  const [importMessage, setImportMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [copiedPreview, setCopiedPreview] = useState<boolean>(false);

  // Git Push
  const [pushingGit, setPushingGit] = useState(false);
  const [gitPushResult, setGitPushResult] = useState<{ success: boolean; message: string; output?: string } | null>(
    null
  );

  // Fetch dynamic models list from OpenRouter API
  const fetchOpenRouterModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/openrouter/models', {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          setDynamicModels(data.models);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch OpenRouter models:', e);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOpenRouterModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    const start = Date.now();
    await onTestConnection(apiKey, model);
    const durationMs = Date.now() - start;

    const newLog: RequestDiagnosticLog = {
      id: `diag_${Date.now()}`,
      timestamp: Date.now(),
      provider: 'OpenRouter',
      model,
      statusCode: diagnostic.status === 'connected' ? 200 : diagnostic.statusCode || 400,
      durationMs,
      sanitizedError: diagnostic.status === 'error' ? diagnostic.errorMessage : undefined,
    };
    setDiagnosticsHistory((prev) => [newLog, ...prev].slice(0, 20));
    setTesting(false);
  };

  const handleSaveAll = () => {
    const updatedConfig: OpenRouterConfig = {
      ...config,
      apiKey: apiKey.trim(),
      provider,
      model,
      fallbackModel,
      temperature: generation.temperature,
      maxTokens: generation.maxTokens,
      topP: generation.topP,
      frequencyPenalty: generation.frequencyPenalty,
      presencePenalty: generation.presencePenalty,
      prompts,
      generation,
      chatBehavior,
      diagnosticsHistory,
    };

    onSaveConfig(updatedConfig);
    onSaveSupabaseConfig({
      url: supaUrl,
      anonKey: supaKey,
      connected: Boolean(supaUrl && supaKey),
    });

    onClose();
  };

  const handleInsertVariable = (varName: string) => {
    setPrompts((prev) => ({
      ...prev,
      [activePromptKey]: (prev[activePromptKey] || '') + ` ${varName} `,
    }));
  };

  const handleResetPrompts = () => {
    setPrompts(DEFAULT_PROMPTS);
  };

  const handleResetAllSettings = () => {
    setApiKey('');
    setModel(DEFAULT_OPENROUTER_CONFIG.model);
    setFallbackModel(DEFAULT_OPENROUTER_CONFIG.fallbackModel || '');
    setPrompts(DEFAULT_PROMPTS);
    setGeneration(DEFAULT_GENERATION);
    setChatBehavior(DEFAULT_CHAT_BEHAVIOR);
    setConfirmReset(false);
  };

  const handleExportJSON = (includeKey: boolean) => {
    const jsonStr = exportSettingsJSON(
      {
        ...config,
        apiKey,
        provider,
        model,
        fallbackModel,
        prompts,
        generation,
        chatBehavior,
      },
      includeKey
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colorpop-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importSettingsJSON(content);
      if (res.success && res.config) {
        if (res.config.apiKey) setApiKey(res.config.apiKey);
        if (res.config.model) setModel(res.config.model);
        if (res.config.fallbackModel) setFallbackModel(res.config.fallbackModel);
        if (res.config.prompts) setPrompts(res.config.prompts);
        if (res.config.generation) setGeneration(res.config.generation);
        if (res.config.chatBehavior) setChatBehavior(res.config.chatBehavior);
        setImportMessage({ success: true, text: 'Settings imported successfully!' });
      } else {
        setImportMessage({ success: false, text: res.error || 'Failed to parse settings JSON file.' });
      }
      setTimeout(() => setImportMessage(null), 4000);
    };
    reader.readAsText(file);
  };

  // Assembled Sample Prompt Preview
  const sampleMessages = buildOpenRouterMessages({
    characters: [
      {
        id: 'char_sample',
        name: 'Lucious',
        avatar: '/lucious.jpg',
        summary: 'Seductive corporate billionaire',
        description: 'Tall, striking blue eyes, tailored suit.',
        personality: 'Charming, dominant, intensely loyal.',
        scenario: 'Penthouse terrace overlooking city lights.',
        first_mes: 'Did you really think you could tease me and leave?',
        mes_example: '<start>\nLucious: "You belong right here."',
        tags: ['billionaire'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    persona: {
      id: 'pers_sample',
      name: 'The Muse',
      avatar: '/colorpop_hero.jpg',
      description: 'An enigmatic artist who defies expectations.',
      speaking_style: 'Witty, confident, poetic.',
      traits: ['Creative', 'Bold'],
      is_default: true,
      createdAt: new Date().toISOString(),
    },
    lorebooks: [],
    plugins: [],
    chat: {
      id: 'chat_sample',
      title: 'Sample Chat',
      characterIds: ['char_sample'],
      personaId: 'pers_sample',
      lorebookIds: [],
      pluginIds: [],
      scenario: 'High-stakes evening in Skyfall Penthouse',
      messages: [
        {
          id: 'm1',
          senderId: 'user',
          senderName: 'The Muse',
          content: 'You always make such dramatic entrances.',
          timestamp: Date.now() - 60000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    prompts,
    chatBehavior,
  });

  const assembledSystemText = sampleMessages[0]?.content || '';

  const popularModelsList = [
    { id: 'gryphe/mythomax-l2-13b', name: 'Mythomax L2 13B', badge: 'Roleplay Gold Standard', ctx: '8k' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', badge: 'High Intelligence', ctx: '128k' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', badge: 'Ultra Vivid Prose', ctx: '200k' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001', badge: 'Fast & Multimodal', ctx: '1M' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 Chat', badge: 'Fast & Rich', ctx: '64k' },
    { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2411', badge: 'Complex Dialogues', ctx: '128k' },
    { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 Llama 3.1 405B', badge: 'Unfiltered Masterclass', ctx: '128k' },
    { id: 'gryphe/mythomax-l2-13b:free', name: 'Mythomax L2 13B (Free)', badge: 'Free Tier', ctx: '8k' },
  ];

  const filteredDynamicModels = dynamicModels.filter((m) =>
    modelSearch
      ? m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(modelSearch.toLowerCase())
      : true
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[92vh] text-[#ffd6eb]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ff3399]/30 bg-[#0d020b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#ff3399] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,0,128,0.6)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                ColorPop Settings &amp; Diagnostics
              </h2>
              <p className="text-[11px] text-[#ffd6eb]/70">
                AI Models, Prompts, Generation, Chat Rules, Connections &amp; Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#ffd6eb]/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRESERVED TOP HORIZONTAL SWIPEABLE SETTINGS TAB BAR */}
        <div className="flex overflow-x-auto snap-x scrollbar-none border-b border-[#ff3399]/30 bg-[#1a0515]/80 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('models')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'models'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. AI &amp; Models</span>
          </button>

          <button
            onClick={() => setActiveTab('prompts')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'prompts'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>2. Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('generation')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'generation'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>3. Generation</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'chat'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>4. Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'connections'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Connections</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                diagnostic.status === 'connected' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
              }`}
            >
              {diagnostic.status === 'connected' ? 'Connected' : 'Configure'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-2.5 px-3 whitespace-nowrap rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 snap-start ${
              activeTab === 'storage'
                ? 'border-[#ff007f] text-white bg-[#ff007f]/20 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>6. Storage</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* TAB 1: AI & MODELS */}
          {activeTab === 'models' && (
            <div className="space-y-5">
              {/* Provider Selection */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>AI Provider Selection</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Primary: OpenRouter
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setProvider('openrouter')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      provider === 'openrouter'
                        ? 'bg-[#ff007f]/20 border-[#ff007f] text-white shadow-[0_0_12px_rgba(255,0,128,0.3)]'
                        : 'bg-white/5 border-white/10 hover:border-[#ff3399]/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold">OpenRouter Unified API</div>
                      <div className="text-[10px] text-[#ffd6eb]/70">Access 200+ AI models (Llama, Mythomax, Claude, Gemini, DeepSeek)</div>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 ${provider === 'openrouter' ? 'text-[#ff007f]' : 'opacity-0'}`} />
                  </div>
                </div>
              </div>

              {/* OpenRouter Model Picker & Fallback Model */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Active &amp; Fallback Models</h4>
                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Search and select models dynamically fetched from OpenRouter. Pricing and availability may fluctuate.
                    </p>
                  </div>

                  <button
                    onClick={fetchOpenRouterModels}
                    disabled={loadingModels}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1 border border-white/20"
                  >
                    {loadingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Refresh API</span>
                  </button>
                </div>

                {/* Search Models Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#ff3399] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search OpenRouter models by name or ID (e.g. gemini, mythomax, llama)..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full bg-[#12040e] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                {/* Popular Models Grid */}
                <div className="space-y-2">
                  <div className="font-bold text-white text-xs">Featured Roleplay Models:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popularModelsList.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          model === m.id
                            ? 'bg-[#ff007f]/25 border-[#ff007f] text-white shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                            : 'bg-[#12040e] border-[#ff3399]/20 hover:border-[#ff3399]/50 text-[#ffd6eb]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold truncate text-xs">{m.name}</div>
                          <div className="font-mono text-[9px] text-[#ff99cc] truncate">{m.id}</div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#ffd6eb] border border-white/20">
                            {m.badge}
                          </span>
                          <span className="text-[8px] text-cyan-300 font-mono mt-0.5">{m.ctx}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Search Results */}
                {dynamicModels.length > 0 && modelSearch && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t border-[#ff3399]/20">
                    <div className="text-[10px] uppercase font-bold text-cyan-300">
                      OpenRouter API Results ({filteredDynamicModels.length}):
                    </div>
                    {filteredDynamicModels.slice(0, 15).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          model === m.id ? 'bg-[#ff007f]/30 border-[#ff007f]' : 'bg-black/40 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold text-white text-xs truncate">{m.name || m.id}</div>
                          <div className="font-mono text-[9px] text-[#ff99cc] truncate">{m.id}</div>
                        </div>
                        {m.context_length && (
                          <span className="text-[9px] font-mono text-cyan-300">
                            {(m.context_length / 1024).toFixed(0)}k ctx
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Model ID & Fallback Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#ff3399]/20">
                  <div className="space-y-1">
                    <label className="font-bold text-white text-xs">Primary Model ID</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. gryphe/mythomax-l2-13b"
                      className="w-full bg-[#12040e] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white text-xs">Fallback Model ID (Optional)</label>
                    <input
                      type="text"
                      value={fallbackModel}
                      onChange={(e) => setFallbackModel(e.target.value)}
                      placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                      className="w-full bg-[#12040e] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              {/* Quick Variable Insertion Bar */}
              <div className="p-3 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Insert Prompt Variables</span>
                  </span>
                  <span className="text-[10px] text-[#ffd6eb]/60">Click variable to insert into active prompt field</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {KNOWN_PROMPT_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="px-2.5 py-1 bg-[#ff007f]/20 hover:bg-[#ff007f]/40 border border-[#ff3399]/50 rounded-lg font-mono text-[11px] text-[#ff99cc] hover:text-white transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Editor Selection Tabs */}
              <div className="flex overflow-x-auto gap-1 pb-1 border-b border-[#ff3399]/20 text-[11px] font-bold">
                <button
                  onClick={() => setActivePromptKey('mainSystemPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'mainSystemPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  Main System
                </button>

                <button
                  onClick={() => setActivePromptKey('roleplayStylePrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'roleplayStylePrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  Roleplay Style
                </button>

                <button
                  onClick={() => setActivePromptKey('characterBehaviorPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'characterBehaviorPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  Character Behavior
                </button>

                <button
                  onClick={() => setActivePromptKey('userPersonaPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'userPersonaPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  User Persona
                </button>

                <button
                  onClick={() => setActivePromptKey('memoryContinuityPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'memoryContinuityPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  Memory / Lore
                </button>

                <button
                  onClick={() => setActivePromptKey('narratorPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'narratorPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  Narrator
                </button>

                <button
                  onClick={() => setActivePromptKey('oocPrompt')}
                  className={`px-3 py-1.5 rounded-t-xl transition-all ${
                    activePromptKey === 'oocPrompt'
                      ? 'bg-[#ff007f] text-white'
                      : 'bg-white/5 text-[#ffd6eb]/70 hover:text-white'
                  }`}
                >
                  OOC Prompt
                </button>
              </div>

              {/* Active Prompt Multiline Editor */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-xs uppercase tracking-wider text-[#ff99cc]">
                    Editing: {activePromptKey}
                  </label>

                  {/* Unknown Variable Validation Banner */}
                  {getUnknownVariables(prompts[activePromptKey] || '').length > 0 && (
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                      ⚠ Unknown variables: {getUnknownVariables(prompts[activePromptKey] || '').join(', ')}
                    </span>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={prompts[activePromptKey] || ''}
                  onChange={(e) =>
                    setPrompts((prev) => ({
                      ...prev,
                      [activePromptKey]: e.target.value,
                    }))
                  }
                  className="w-full bg-[#12040e] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl p-3 text-xs text-white placeholder-white/30 font-mono focus:outline-none resize-y leading-relaxed"
                />

                <p className="text-[10px] text-[#ffd6eb]/60">
                  Safety Note: Jailbreak or prompt override statements must not be used to bypass provider safety systems.
                </p>
              </div>

              {/* Action Buttons: Reset to Default, Preview Final Prompt */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleResetPrompts}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#ffd6eb] rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Prompts to Defaults</span>
                </button>

                <button
                  onClick={() => setShowPromptPreview(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Assembled System Prompt</span>
                </button>
              </div>

              {/* Prompt Preview Modal / Drawer */}
              {showPromptPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                  <div className="relative w-full max-w-2xl bg-[#140410] border-2 border-amber-500/80 rounded-3xl p-5 space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.4)] max-h-[85vh] flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5 text-amber-400" />
                        <h3 className="font-bold text-white text-sm">Assembled System Prompt Preview</h3>
                      </div>

                      <button
                        onClick={() => setShowPromptPreview(false)}
                        className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Below is the exact system prompt sent to OpenRouter API with sample chat context, variables replaced, and missing values distinguished.
                    </p>

                    <div className="flex-1 overflow-y-auto p-4 bg-[#0d020b] border border-amber-500/40 rounded-2xl font-mono text-[11px] text-amber-100 whitespace-pre-wrap leading-relaxed select-text">
                      {assembledSystemText}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(assembledSystemText);
                          setCopiedPreview(true);
                          setTimeout(() => setCopiedPreview(false), 2000);
                        }}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5"
                      >
                        {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPreview ? 'Copied to Clipboard!' : 'Copy Assembled Text'}</span>
                      </button>

                      <button
                        onClick={() => setShowPromptPreview(false)}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERATION */}
          {activeTab === 'generation' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-fuchsia-400" />
                  <span>Generation Parameters</span>
                </h4>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Creativity (Temperature)</span>
                    <span className="font-mono text-[#ff66b2]">{generation.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={generation.temperature}
                    onChange={(e) =>
                      setGeneration((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#ff007f]"
                  />
                  <p className="text-[10px] text-[#ffd6eb]/60">Higher = more expressive, lower = deterministic</p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Max Output Tokens</span>
                    <span className="font-mono text-[#ff66b2]">{generation.maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="8192"
                    step="128"
                    value={generation.maxTokens}
                    onChange={(e) =>
                      setGeneration((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-[#ff007f]"
                  />
                  <p className="text-[10px] text-[#ffd6eb]/60">Maximum completion tokens per generated response</p>
                </div>

                {/* Top P */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Top-P (Nucleus Sampling)</span>
                    <span className="font-mono text-[#ff66b2]">{generation.topP}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={generation.topP}
                    onChange={(e) =>
                      setGeneration((prev) => ({ ...prev, topP: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#ff007f]"
                  />
                </div>

                {/* Frequency & Presence Penalties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#ff3399]/20">
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-bold text-white">
                      <span>Frequency Penalty</span>
                      <span className="font-mono text-[#ff66b2]">{generation.frequencyPenalty}</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="2.0"
                      step="0.1"
                      value={generation.frequencyPenalty}
                      onChange={(e) =>
                        setGeneration((prev) => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-[#ff007f]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-bold text-white">
                      <span>Presence Penalty</span>
                      <span className="font-mono text-[#ff66b2]">{generation.presencePenalty}</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="2.0"
                      step="0.1"
                      value={generation.presencePenalty}
                      onChange={(e) =>
                        setGeneration((prev) => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-[#ff007f]"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-amber-300 font-mono">
                  Note: Frequency/presence penalties are automatically sanitized for Google Gemini models to ensure API compatibility.
                </p>

                {/* Response Length Preference */}
                <div className="space-y-2 pt-2 border-t border-[#ff3399]/20">
                  <label className="font-bold text-white">Response Length Preference</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['short', 'medium', 'long', 'unlimited'] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setGeneration((prev) => ({ ...prev, responseLength: len }))}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                          generation.responseLength === len
                            ? 'bg-[#ff007f] border-[#ff3399] text-white shadow-[0_0_10px_rgba(255,0,128,0.5)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#ffd6eb]'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHAT BEHAVIOR */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>Chat Behavior &amp; Rules</span>
                </h4>

                {/* Point of View Preference */}
                <div className="space-y-2">
                  <label className="font-bold text-white">Point-of-View (POV) Preference</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChatBehavior((prev) => ({ ...prev, pov: 'third_person' }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        chatBehavior.pov === 'third_person'
                          ? 'bg-[#ff007f] border-[#ff3399] text-white shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                          : 'bg-white/5 border-white/10 text-[#ffd6eb]'
                      }`}
                    >
                      3rd Person ("He / She / They...")
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatBehavior((prev) => ({ ...prev, pov: 'first_person' }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        chatBehavior.pov === 'first_person'
                          ? 'bg-[#ff007f] border-[#ff3399] text-white shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                          : 'bg-white/5 border-white/10 text-[#ffd6eb]'
                      }`}
                    >
                      1st Person ("I...")
                    </button>
                  </div>
                </div>

                {/* Never Speak For User Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Never Speak or Act for User Persona</div>
                    <p className="text-[10px] text-[#ffd6eb]/70">
                      Enforces strict instructions directing AI to never write dialogue or actions for {"{{user}}"}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setChatBehavior((prev) => ({
                        ...prev,
                        neverSpeakForUser: !prev.neverSpeakForUser,
                      }))
                    }
                    className={`shrink-0 w-10 h-5 rounded-full p-0.5 transition-colors ${
                      chatBehavior.neverSpeakForUser ? 'bg-[#ff007f]' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        chatBehavior.neverSpeakForUser ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Narrator Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Narrator Atmospheric Updates</div>
                    <p className="text-[10px] text-[#ffd6eb]/70">
                      Includes environmental description instructions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setChatBehavior((prev) => ({
                        ...prev,
                        narratorEnabled: !prev.narratorEnabled,
                      }))
                    }
                    className={`shrink-0 w-10 h-5 rounded-full p-0.5 transition-colors ${
                      chatBehavior.narratorEnabled ? 'bg-[#ff007f]' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        chatBehavior.narratorEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Memory & Lorebook inclusion toggles */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="font-bold text-white">Include Memories</span>
                    <button
                      type="button"
                      onClick={() =>
                        setChatBehavior((prev) => ({ ...prev, includeMemory: !prev.includeMemory }))
                      }
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                        chatBehavior.includeMemory ? 'bg-[#ff007f]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          chatBehavior.includeMemory ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="font-bold text-white">Include Lorebooks</span>
                    <button
                      type="button"
                      onClick={() =>
                        setChatBehavior((prev) => ({ ...prev, includeLorebook: !prev.includeLorebook }))
                      }
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                        chatBehavior.includeLorebook ? 'bg-[#ff007f]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          chatBehavior.includeLorebook ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border ${
                  diagnostic.status === 'connected'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                } space-y-2`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {diagnostic.status === 'connected' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {diagnostic.status === 'connected'
                          ? 'OpenRouter API Connection Verified & Active'
                          : 'OpenRouter Connection Issue'}
                      </h4>
                      {diagnostic.latencyMs && (
                        <p className="text-[11px] opacity-80 font-mono">
                          API Response Latency: {diagnostic.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1.5 border border-white/20 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Test Connection</span>
                  </button>
                </div>

                {diagnostic.status === 'error' && (
                  <div className="pt-2 border-t border-rose-500/30 space-y-1 text-xs">
                    <p className="font-semibold text-rose-300">
                      Diagnostic Error: {diagnostic.errorMessage}
                    </p>
                    {diagnostic.suggestedFix && (
                      <p className="text-[11px] text-white/90">
                        Suggested Action: {diagnostic.suggestedFix}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Secure API Key Entry */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#ff3399]" />
                    <span>OpenRouter API Key</span>
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#ff66b2] hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>openrouter.ai/keys</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#12040e] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-white/60 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[10px] text-[#ffd6eb]/70 leading-relaxed">
                  Security Note: Keys stored locally in browser storage carry exposure risks on shared machines. Never commit raw secrets to public git repositories.
                </p>
              </div>

              {/* Diagnostics History */}
              {diagnosticsHistory.length > 0 && (
                <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-2">
                  <h4 className="font-bold text-white text-xs">Request Diagnostics Log</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {diagnosticsHistory.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between font-mono text-[10px]"
                      >
                        <div>
                          <span className="text-[#ff99cc]">{log.model}</span> &bull;{' '}
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={
                              log.statusCode === 200 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                            }
                          >
                            HTTP {log.statusCode}
                          </span>
                          <span className="text-cyan-300">{log.durationMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STORAGE */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              {/* Cloud Sync Status */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Cloud Sync Status</h4>
                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Firebase Firestore &amp; Supabase database integration
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ff3399]/20 flex items-center justify-between text-xs">
                  <span>Firebase Auth User:</span>
                  <span className="font-bold text-white">
                    {firebaseUser ? firebaseUser.displayName || firebaseUser.email : 'Not signed in'}
                  </span>
                </div>
              </div>

              {/* Import / Export Settings JSON */}
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-sm">Import &amp; Export Settings JSON</h4>

                {importMessage && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      importMessage.success
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                    }`}
                  >
                    {importMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportJSON(false)}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border border-white/20 transition-all"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Export Settings (Safely Masked)</span>
                  </button>

                  <label className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border border-white/20 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Import Settings JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Reset Settings to Defaults */}
              <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-200 text-sm">Reset Settings to Defaults</h4>
                    <p className="text-[11px] text-rose-300/80">
                      Resets model config, generation values, and prompts without deleting user chats or characters.
                    </p>
                  </div>

                  {!confirmReset ? (
                    <button
                      onClick={() => setConfirmReset(true)}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 rounded-xl font-bold text-xs transition-colors shrink-0"
                    >
                      Reset Defaults
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={handleResetAllSettings}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs"
                      >
                        Confirm Reset
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1.5 bg-white/10 text-white rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#ff3399]/30 bg-[#0d020b] shrink-0">
          <div className="text-[11px] text-[#ffd6eb]/60 font-mono">
            {activeTab.toUpperCase()} &bull; ColorPop Settings
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,0,128,0.7)] transition-all"
            >
              Save All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

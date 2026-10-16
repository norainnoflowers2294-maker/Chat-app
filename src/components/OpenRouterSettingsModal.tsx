import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState } from 'react';
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
  Copy,
  Check,
  Activity,
  Cpu,
  Zap,
  MessageSquareText,
  Radio,
} from 'lucide-react';
import {
  OpenRouterConfig,
  GeminiConfig,
  AIProvider,
  ConnectionDiagnostic,
  SupabaseConfig,
} from '../types/roleplay';
import { signInWithGoogle, logOutFirebase } from '../lib/firebase';
import { User } from 'firebase/auth';

interface OpenRouterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: AIProvider;
  onChangeProvider: (p: AIProvider) => void;
  openRouterConfig: OpenRouterConfig;
  onSaveOpenRouterConfig: (cfg: OpenRouterConfig) => void;
  geminiConfig: GeminiConfig;
  onSaveGeminiConfig: (cfg: GeminiConfig) => void;
  diagnostic: ConnectionDiagnostic;
  onTestConnection: (provider: AIProvider, apiKey?: string, model?: string) => Promise<void>;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (cfg: SupabaseConfig) => void;
  firebaseUser: User | null;
}

export const OpenRouterSettingsModal: React.FC<OpenRouterSettingsModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onChangeProvider,
  openRouterConfig,
  onSaveOpenRouterConfig,
  geminiConfig,
  onSaveGeminiConfig,
  diagnostic,
  onTestConnection,
  supabaseConfig,
  onSaveSupabaseConfig,
  firebaseUser,
}) => {
  // Provider Selection
  const [provider, setProvider] = useState<AIProvider>(activeProvider);

  // OpenRouter Local Form State
  const [orApiKey, setOrApiKey] = useState(openRouterConfig.apiKey);
  const [orModel, setOrModel] = useState(openRouterConfig.model);
  const [orTemperature, setOrTemperature] = useState(openRouterConfig.temperature);
  const [orMaxTokens, setOrMaxTokens] = useState(openRouterConfig.maxTokens);
  const [orTopP, setOrTopP] = useState(openRouterConfig.topP);

  // Gemini Local Form State
  const [gemApiKey, setGemApiKey] = useState(geminiConfig.apiKey);
  const [gemModel, setGemModel] = useState(geminiConfig.model);
  const [gemTemperature, setGemTemperature] = useState(geminiConfig.temperature);
  const [gemMaxTokens, setGemMaxTokens] = useState(geminiConfig.maxTokens);
  const [gemTopP, setGemTopP] = useState(geminiConfig.topP);

  // UI Toggles
  const [showOrKey, setShowOrKey] = useState(false);
  const [showGemKey, setShowGemKey] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Supabase Local State
  const [supaUrl, setSupaUrl] = useState(supabaseConfig.url);
  const [supaKey, setSupaKey] = useState(supabaseConfig.anonKey);

  const [activeTab, setActiveTab] = useState<'openrouter' | 'gemini' | 'firebase' | 'supabase' | 'github'>('openrouter');
  const [testing, setTesting] = useState(false);

  const [pushingGit, setPushingGit] = useState(false);
  const [gitPushResult, setGitPushResult] = useState<{ success: boolean; message: string; output?: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    const targetKey = provider === 'gemini' ? gemApiKey : orApiKey;
    const targetModel = provider === 'gemini' ? gemModel : orModel;
    await onTestConnection(provider, targetKey, targetModel);
    setTesting(false);
  };

  const handleSave = () => {
    onChangeProvider(provider);
    onSaveOpenRouterConfig({
      ...openRouterConfig,
      apiKey: orApiKey,
      model: orModel,
      temperature: orTemperature,
      maxTokens: orMaxTokens,
      topP: orTopP,
    });
    onSaveGeminiConfig({
      ...geminiConfig,
      apiKey: gemApiKey,
      model: gemModel,
      temperature: gemTemperature,
      maxTokens: gemMaxTokens,
      topP: gemTopP,
    });
    onSaveSupabaseConfig({
      url: supaUrl,
      anonKey: supaKey,
      connected: Boolean(supaUrl && supaKey),
    });
    onClose();
  };

  const handleCopyReport = () => {
    const reportText = diagnostic.diagnosticReport || `=== COLORPOP AI CONNECTION DIAGNOSTIC SUMMARY ===
Provider: ${provider.toUpperCase()}
Status: ${diagnostic.status.toUpperCase()}
Error Category: ${diagnostic.errorCategory || 'None'}
Message: ${diagnostic.errorMessage || 'No error details reported'}
Suggested Fix: ${diagnostic.suggestedFix || 'None'}
Latency: ${diagnostic.latencyMs ? `${diagnostic.latencyMs}ms` : 'N/A'}
Last Checked: ${diagnostic.lastChecked ? new Date(diagnostic.lastChecked).toLocaleString() : 'Never'}
`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleGitPush = async () => {
    setPushingGit(true);
    setGitPushResult(null);
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: 'https://github.com/norainnoflowers2294-maker/Chat-app.git',
          commitMsg: `Update ColorPop Connection Doctor & Gemini API Proxy - ${new Date().toLocaleTimeString()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to push to GitHub');

      setGitPushResult({
        success: true,
        message: 'All applet code and Connection Doctor systems successfully pushed to GitHub!',
        output: data.output,
      });
    } catch (err: any) {
      setGitPushResult({
        success: false,
        message: err.message || 'Push failed. Please verify your token permissions.',
      });
    } finally {
      setPushingGit(false);
    }
  };

  const popularOpenRouterModels = [
    { id: 'gryphe/mythomax-l2-13b', label: 'Mythomax L2 13B (Recommended Roleplay)', badge: 'Gold Standard' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', badge: 'High Intelligence' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', badge: 'Ultra Vivid Prose' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', badge: 'Fast & Rich' },
    { id: 'mistralai/mistral-large-2411', label: 'Mistral Large 2411', badge: 'Complex Dialogues' },
    { id: 'nousresearch/hermes-3-llama-3.1-405b', label: 'Hermes 3 Llama 3.1 405B', badge: 'Masterclass' },
    { id: 'gryphe/mythomax-l2-13b:free', label: 'Mythomax L2 13B (Free Tier)', badge: 'Free' },
  ];

  const popularGeminiModels = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default & Ultra Fast)', badge: 'Fast & Smart' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep Reasoning & Prose)', badge: 'Pro Quality' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'High Throughput' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', badge: 'Long Context' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', badge: 'Lightweight' },
  ];

  const renderStageBadge = (status?: string) => {
    if (status === 'success') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
          <Check className="w-3 h-3" /> PASS
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
          <X className="w-3 h-3" /> FAIL
        </span>
      );
    }
    if (status === 'running') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /> TESTING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/50 font-mono text-[10px] font-bold border border-white/10">
        PENDING
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl shadow-[0_0_50px_rgba(255,0,128,0.5)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ff3399]/30 bg-[#0d020b]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#ff3399] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,0,128,0.6)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>ColorPop AI Connection Doctor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase font-mono">
                  v2.5 Repair Suite
                </span>
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Diagnose OpenRouter &amp; Google Gemini connections, masked keys, models, and cloud persistence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#ffd6eb]/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#ff3399]/30 bg-[#1a0515]/60 px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('openrouter');
              setProvider('openrouter');
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'openrouter'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-pink-400" />
            <span>OpenRouter AI</span>
            {provider === 'openrouter' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                Active
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('gemini');
              setProvider('gemini');
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'gemini'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Google Gemini</span>
            {provider === 'gemini' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                Active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'firebase'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Firebase Cloud</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'supabase'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'github'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>GitHub Push</span>
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[#ffd6eb]">
          {/* Active AI Provider Switch Banner */}
          {(activeTab === 'openrouter' || activeTab === 'gemini') && (
            <div className="p-3 bg-[#1a0515] border border-[#ff3399]/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#ff3399] animate-pulse" />
                <span className="font-bold text-white text-xs">Active Roleplay Provider:</span>
                <span className="font-mono text-[#ffb3d9] uppercase font-bold px-2 py-0.5 rounded-lg bg-white/10 border border-white/20">
                  {provider}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setProvider('openrouter')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    provider === 'openrouter'
                      ? 'bg-[#ff007f] text-white border-[#ff66b2] shadow-[0_0_12px_rgba(255,0,128,0.5)]'
                      : 'bg-white/5 text-[#ffd6eb]/70 border-white/10 hover:text-white'
                  }`}
                >
                  OpenRouter
                </button>
                <button
                  onClick={() => setProvider('gemini')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    provider === 'gemini'
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'bg-white/5 text-[#ffd6eb]/70 border-white/10 hover:text-white'
                  }`}
                >
                  Google Gemini
                </button>
              </div>
            </div>
          )}

          {/* AI Connection Doctor Diagnostics Widget */}
          {(activeTab === 'openrouter' || activeTab === 'gemini') && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  diagnostic.status === 'connected'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : diagnostic.status === 'error'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                } space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    {diagnostic.status === 'connected' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>
                          {diagnostic.status === 'connected'
                            ? `${provider.toUpperCase()} Provider Connected & Verified`
                            : diagnostic.status === 'error'
                            ? `${provider.toUpperCase()} Connection Issue Detected`
                            : `${provider.toUpperCase()} Connection Not Verified`}
                        </span>
                        {diagnostic.statusCode && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-black/40 text-rose-300 border border-rose-500/30">
                            HTTP {diagnostic.statusCode}
                          </span>
                        )}
                      </h4>
                      {diagnostic.latencyMs !== undefined && (
                        <p className="text-[11px] opacity-80 font-mono">
                          API Latency: {diagnostic.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyReport}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1 border border-white/20"
                      title="Copy Secret-Free Diagnostic Report to Clipboard"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReport ? 'Copied!' : 'Copy Report'}</span>
                    </button>

                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="px-3.5 py-1 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1 shadow-md disabled:opacity-50"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Run Doctor Diagnostics</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step Stage Indicators */}
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <div className="text-[#ffd6eb]/70 font-semibold flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-[#ff3399]" />
                      <span>1. API Key Auth</span>
                    </div>
                    <div>{renderStageBadge(diagnostic.stages?.apiKeyCheck)}</div>
                  </div>

                  <div className="p-2 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <div className="text-[#ffd6eb]/70 font-semibold flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      <span>2. Model Access</span>
                    </div>
                    <div>{renderStageBadge(diagnostic.stages?.modelCheck)}</div>
                  </div>

                  <div className="p-2 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <div className="text-[#ffd6eb]/70 font-semibold flex items-center gap-1">
                      <MessageSquareText className="w-3 h-3 text-emerald-400" />
                      <span>3. Text Gen</span>
                    </div>
                    <div>{renderStageBadge(diagnostic.stages?.textGenCheck)}</div>
                  </div>

                  <div className="p-2 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <div className="text-[#ffd6eb]/70 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>4. Stream Check</span>
                    </div>
                    <div>{renderStageBadge(diagnostic.stages?.streamCheck)}</div>
                  </div>
                </div>

                {/* Error Banner & Actionable Fix */}
                {diagnostic.status === 'error' && (
                  <div className="pt-2 border-t border-rose-500/30 space-y-1.5">
                    <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <span>Error Diagnostic:</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-rose-900/60 text-white uppercase">
                        {diagnostic.errorCategory || 'error'}
                      </span>
                    </div>
                    <p className="text-white/90">{diagnostic.errorMessage}</p>
                    {diagnostic.suggestedFix && (
                      <div className="p-2.5 bg-black/40 rounded-xl border border-rose-500/40 text-[11px] text-rose-200">
                        <strong className="text-white">Actionable Fix:</strong> {diagnostic.suggestedFix}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPENROUTER AI CONFIG TAB */}
          {activeTab === 'openrouter' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#ff3399]" />
                    <span>OpenRouter API Key</span>
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#ff66b2] hover:underline flex items-center gap-1"
                  >
                    <span>Get OpenRouter Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showOrKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={orApiKey}
                    onChange={(e) => setOrApiKey(e.target.value)}
                    className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrKey((p) => !p)}
                    className="absolute right-3 text-[#ffd6eb]/60 hover:text-white"
                  >
                    {showOrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#ff3399]" />
                  <span>OpenRouter Roleplay Model</span>
                </label>
                <div className="space-y-1.5">
                  {popularOpenRouterModels.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setOrModel(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        orModel === m.id
                          ? 'bg-[#ff007f]/20 border-[#ff007f] shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                          : 'bg-[#1a0515] border-[#ff3399]/20 hover:border-[#ff3399]/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{m.label}</div>
                        <div className="font-mono text-[10px] text-[#ffb3d9]/70">{m.id}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#ffd6eb] border border-white/20">
                        {m.badge}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Or enter custom OpenRouter model ID"
                    value={orModel}
                    onChange={(e) => setOrModel(e.target.value)}
                    className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#ff3399]/20">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Creativity (Temperature)</span>
                    <span className="font-mono text-[#ff66b2]">{orTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={orTemperature}
                    onChange={(e) => setOrTemperature(parseFloat(e.target.value))}
                    className="w-full accent-[#ff007f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Max Tokens</span>
                    <span className="font-mono text-[#ff66b2]">{orMaxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="4096"
                    step="128"
                    value={orMaxTokens}
                    onChange={(e) => setOrMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-[#ff007f]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GOOGLE GEMINI AI CONFIG TAB */}
          {activeTab === 'gemini' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Google Gemini Direct API Key</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    <span>Get Gemini Key (AI Studio)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showGemKey ? 'text' : 'password'}
                    placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    value={gemApiKey}
                    onChange={(e) => setGemApiKey(e.target.value)}
                    className="w-full bg-[#1e0818] border border-cyan-500/40 focus:border-cyan-400 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemKey((p) => !p)}
                    className="absolute right-3 text-[#ffd6eb]/60 hover:text-white"
                  >
                    {showGemKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Google Gemini Model ID</span>
                </label>
                <div className="space-y-1.5">
                  {popularGeminiModels.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setGemModel(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        gemModel === m.id
                          ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#1a0515] border-[#ff3399]/20 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{m.label}</div>
                        <div className="font-mono text-[10px] text-cyan-300/70">{m.id}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                        {m.badge}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Or custom model (e.g. gemini-2.5-flash)"
                    value={gemModel}
                    onChange={(e) => setGemModel(e.target.value)}
                    className="w-full bg-[#1e0818] border border-cyan-500/40 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-cyan-500/20">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Creativity (Temperature)</span>
                    <span className="font-mono text-cyan-300">{gemTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={gemTemperature}
                    onChange={(e) => setGemTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Max Output Tokens</span>
                    <span className="font-mono text-cyan-300">{gemMaxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={gemMaxTokens}
                    onChange={(e) => setGemMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FIREBASE TAB */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Firebase Cloud Persistence</h4>
                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Firestore &amp; Firebase Authentication auto-sync
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#ff3399]/20 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#ffd6eb]/80">Firestore Database ID:</span>
                    <code className="text-blue-300 font-mono text-[11px]">ai-studio-githubconnecthub-2454e99a-1a95-4b9f-9cd4-6a2965f634bd</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#ffd6eb]/80">Security Rules:</span>
                    <span className="text-emerald-400 font-bold">Deployed & Active</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <h4 className="font-bold text-white">Firebase Authentication</h4>
                {firebaseUser ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={resolveImageUrl(firebaseUser.photoURL || '/colorpop_hero.jpg')}
                        alt={firebaseUser.displayName || 'User'}
                        className="w-9 h-9 rounded-full ring-1 ring-white/30"
                      />
                      <div>
                        <div className="font-bold text-white">{firebaseUser.displayName || 'Signed In'}</div>
                        <div className="text-[11px] text-[#ffd6eb]/70 font-mono">{firebaseUser.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => logOutFirebase()}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold flex items-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Sign in with Google to automatically back up all your roleplays, characters, lorebooks, and memories to your private Firebase cloud.
                    </p>
                    <button
                      onClick={() => signInWithGoogle()}
                      className="w-full py-2.5 bg-white text-black hover:bg-white/90 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUPABASE TAB */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-2">
                <h4 className="font-bold text-white">Supabase Cloud Storage</h4>
                <p className="text-[11px] text-[#ffd6eb]/70">
                  Optionally configure Supabase credentials to sync alongside Firebase.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-white">Supabase Project URL</label>
                  <input
                    type="text"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supaUrl}
                    onChange={(e) => setSupaUrl(e.target.value)}
                    className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-white">Supabase Anon Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={supaKey}
                    onChange={(e) => setSupaKey(e.target.value)}
                    className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GITHUB PUSH TAB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a0515] border border-[#ff3399]/40 rounded-2xl space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">GitHub Push Integration</h4>
                    <p className="text-[11px] text-[#ffd6eb]/70">
                      Destination: <code className="text-purple-300 font-mono">norainnoflowers2294-maker/Chat-app.git</code>
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-[#ffd6eb]/80 leading-relaxed">
                  Click below to automatically commit and push the entire ColorPop roleplay application, Gemini proxy, and Connection Doctor to your target repository.
                </p>

                <button
                  onClick={handleGitPush}
                  disabled={pushingGit}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {pushingGit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Pushing code to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Push All to norainnoflowers2294-maker/Chat-app</span>
                    </>
                  )}
                </button>
              </div>

              {gitPushResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    gitPushResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  } space-y-2`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {gitPushResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    <span>{gitPushResult.message}</span>
                  </div>
                  {gitPushResult.output && (
                    <pre className="p-2 bg-black/50 rounded-lg text-[10px] font-mono text-white/80 overflow-x-auto max-h-32">
                      {gitPushResult.output}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#ff3399]/30 bg-[#0d020b]">
          <div className="text-[11px] text-[#ffd6eb]/60">
            OpenRouter AI &bull; Google Gemini &bull; Connection Doctor &bull; ColorPop
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#ffd6eb] font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,0,128,0.7)] transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { PreferencesPanel } from './PreferencesPanel';
import type { AppPreferences } from '../lib/preferences';
import { resolveImageUrl } from '../utils/imageUrl';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Sliders,
  GitBranch,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { OpenRouterConfig, ConnectionDiagnostic, SupabaseConfig } from '../types/roleplay';
import { signInWithGoogle, logOutFirebase } from '../lib/firebase';
import { User } from 'firebase/auth';
import { saveGitHubDataBackup } from '../utils/githubBackup';

interface OpenRouterSettingsModalProps {
  preferences: AppPreferences;
  onSavePreferences: (value: AppPreferences) => void;
  onExportData: () => void;
  backupData: unknown;
  isOpen: boolean;
  onClose: () => void;
  config: OpenRouterConfig;
  onSaveConfig: (cfg: OpenRouterConfig, supabaseCfg?: SupabaseConfig) => void;
  diagnostic: ConnectionDiagnostic;
  onTestConnection: (key?: string) => Promise<void>;
  firebaseUser: User | null;
  firebaseSyncMessage?: string;
}

export const OpenRouterSettingsModal: React.FC<OpenRouterSettingsModalProps> = ({
  preferences, onSavePreferences, onExportData, backupData,
  isOpen,
  onClose,
  config,
  onSaveConfig,
  diagnostic,
  onTestConnection,
  firebaseUser,
  firebaseSyncMessage = '',
}) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [frequencyPenalty, setFrequencyPenalty] = useState(config.frequencyPenalty);
  const [presencePenalty, setPresencePenalty] = useState(config.presencePenalty);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens);
  const [topP, setTopP] = useState(config.topP);

  const [activeTab, setActiveTab] = useState<'openrouter' | 'firebase' | 'github'>('openrouter');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => { tabRefs.current[activeTab]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [activeTab]);
  const [testing, setTesting] = useState(false);

  const [githubToken, setGithubToken] = useState(() => { try { return localStorage.getItem('plf_github_backup_token') || ''; } catch { return ''; } });
  const [rememberGitToken, setRememberGitToken] = useState(() => { try { return localStorage.getItem('plf_github_backup_token_remember') === 'true'; } catch { return false; } });
  const [pushingGit, setPushingGit] = useState(false);
  const [gitPushResult, setGitPushResult] = useState<{ success: boolean; message: string; output?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setApiKey(config.apiKey);
    setModel(config.model);
    setTemperature(config.temperature);
    setMaxTokens(config.maxTokens);
    setTopP(config.topP);
    setFrequencyPenalty(config.frequencyPenalty);
    setPresencePenalty(config.presencePenalty);
    setShowPreferences(false);
  }, [isOpen, config]);

  if (!isOpen) return null;

  const hasUnsavedChanges = apiKey !== config.apiKey || model !== config.model || temperature !== config.temperature ||
    maxTokens !== config.maxTokens || topP !== config.topP || frequencyPenalty !== config.frequencyPenalty ||
    presencePenalty !== config.presencePenalty;
  const requestClose = () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved settings changes?')) return;
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    try { await onTestConnection(apiKey.trim()); } finally { setTesting(false); }
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      apiKey: apiKey.trim(),
      model: model.trim(),
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
    });
    onClose();
  };

  const handleGitPush = async () => {
    if (!githubToken.trim()) {
      setGitPushResult({ success: false, message: 'Paste a GitHub token with Contents read and write permission first.' });
      return;
    }
    setPushingGit(true);
    setGitPushResult(null);
    try {
      const result = await saveGitHubDataBackup(backupData, githubToken);
      try {
        if (rememberGitToken) {
          localStorage.setItem('plf_github_backup_token', githubToken.trim());
          localStorage.setItem('plf_github_backup_token_remember', 'true');
        } else {
          localStorage.removeItem('plf_github_backup_token');
          localStorage.removeItem('plf_github_backup_token_remember');
        }
      } catch {}
      setGitPushResult({
        success: true,
        message: 'Your app data backup was saved to GitHub.',
        output: result.url,
      });
    } catch (err: any) {
      setGitPushResult({ success: false, message: err.message || 'Could not save the backup to GitHub.' });
    } finally {
      setPushingGit(false);
    }
  };

  const popularModels = [
    { id: 'gryphe/mythomax-l2-13b', label: 'Mythomax L2 13B (Recommended for Roleplay)', badge: 'Gold Standard' },
    { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', badge: 'Smart & Affordable' },
    { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo', badge: 'Fast & Lightweight' },
    { id: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash', badge: 'Fast & Affordable' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B', badge: 'Open & Versatile' },
    { id: 'mistralai/mistral-small-3.2-24b-instruct', label: 'Mistral Small 3.2', badge: 'Balanced & Affordable' },
    { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini', badge: 'Fast & Affordable' },
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', badge: 'Best for Roleplay' },
  ];

  if (showPreferences) return <PreferencesPanel value={preferences} onSave={onSavePreferences} onClose={() => setShowPreferences(false)} onExportData={onExportData} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-0 backdrop-blur-md animate-in fade-in duration-200 sm:p-4">
      <div className="relative flex h-[100dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-2xl flex-col overflow-hidden border-2 border-[#079AF0]/45 bg-[#140410] shadow-[0_0_50px_rgba(7,154,240,0.28)] sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#8AABF4]/30 bg-[#0d020b] px-4 py-4 sm:px-6">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#079AF0] via-[#B12FA7] to-[#FF3B04] flex items-center justify-center text-white shadow-[0_0_15px_rgba(7,154,240,0.4)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="break-words text-base font-bold text-white tracking-wide sm:text-lg">
                Settings &amp; OpenRouter Diagnostics
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Connect OpenRouter AI, Firebase storage, and sync to GitHub
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

        <div className="flex shrink-0 gap-1 overflow-x-auto overscroll-x-contain border-b border-[#8AABF4]/30 bg-[#1a0515]/60 px-3 pt-2 [scrollbar-width:thin] sm:px-6">
          <button type="button" onClick={() => setShowPreferences(true)} className="pb-3 px-3 text-xs font-bold whitespace-nowrap text-[#9be3d5]">App settings</button>
          <button
            onClick={() => setActiveTab('openrouter')}
            ref={(node) => { tabRefs.current['openrouter'] = node; }}
            className={`min-h-11 shrink-0 whitespace-nowrap px-3 pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'openrouter'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>OpenRouter AI</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${diagnostic.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}>
              {diagnostic.status === 'connected' ? 'Connected' : 'Problem'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            ref={(node) => { tabRefs.current['firebase'] = node; }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'firebase'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Firebase Cloud</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 font-mono">
              Auto-Save
            </span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            ref={(node) => { tabRefs.current['github'] = node; }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-[#ff007f] text-[#ff3399]'
                : 'border-transparent text-[#ffd6eb]/70 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>GitHub Push</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-6 px-4 pb-8 pt-4 text-xs text-[#ffd6eb] sm:p-6">
          {activeTab === 'openrouter' && (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl border ${
                  diagnostic.status === 'connected'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : diagnostic.status === 'error'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
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
                          ? 'OpenRouter API Key Verified'
                          : diagnostic.status === 'error'
                          ? 'OpenRouter Connection Problem Detected'
                          : 'OpenRouter Not Yet Verified'}
                      </h4>
                      {diagnostic.latencyMs && (
                        <p className="text-[11px] opacity-80 font-mono">
                          API Latency: {diagnostic.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1 border border-white/20 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Test Connection</span>
                  </button>
                </div>

                {diagnostic.status === 'error' && (
                  <div className="pt-2 border-t border-rose-500/30 space-y-1">
                    <p className="font-semibold text-rose-300">
                      Problem: {diagnostic.errorMessage}
                    </p>
                    {diagnostic.suggestedFix && (
                      <p className="text-[11px] text-white/90">
                        Suggested Fix: {diagnostic.suggestedFix}
                      </p>
                    )}
                  </div>
                )}
              </div>

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
                <input
                  type="password"
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#ff3399]" />
                  <span>Roleplay AI Model / Router</span>
                </label>
                <select
                  aria-label="Choose an OpenRouter model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="w-full rounded-xl border border-[#ff3399]/50 bg-[#12040e] px-3 py-3 text-sm font-semibold text-white focus:border-[#ff007f] focus:outline-none"
                >
                  {popularModels.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.id}</option>)}
                  {!popularModels.some((option) => option.id === model) && model && <option value={model}>Custom model · {model}</option>}
                </select>
                <p className="text-[11px] text-[#ffd6eb]/70">Choose the exact provider/model ID that will receive chat requests. The tags below describe speed and roleplay fit.</p>
                <div className="space-y-1.5" aria-label="Available models">
                  {popularModels.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        model === m.id
                          ? 'bg-[#ff007f]/20 border-[#ff007f] shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                          : 'bg-[#1a0515] border-[#ff3399]/20 hover:border-[#ff3399]/50'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="break-words font-bold text-white">{m.label}</div>
                        <div className="break-all font-mono text-[10px] text-[#8AABF4]/80">{m.id}</div>
                      </div>
                      <span className="max-w-[45%] shrink-0 whitespace-normal break-words text-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#B12FA7]/25 text-[#ffd6eb] border border-[#B879C2]/50">
                        {m.badge}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Or enter custom model ID (e.g. anthropic/claude-3-haiku)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#1e0818] border border-[#ff3399]/40 focus:border-[#ff3399] rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-[#ff3399]/20 pt-3">
                <p className="font-bold text-white">Advanced generation</p>
                {([
                  ['Top P', topP, setTopP, 0.01, 1],
                  ['Frequency penalty', frequencyPenalty, setFrequencyPenalty, -2, 2],
                  ['Presence penalty', presencePenalty, setPresencePenalty, -2, 2],
                ] as const).map(([label, value, setter, min, max]) => <label key={label} className="flex items-center justify-between gap-3">
                  <span>{label}</span><input aria-label={label} type="range" min={min} max={max} step="0.05" value={value} onChange={e => setter(Number(e.target.value))} /><output>{value}</output>
                </label>)}
                <p className="text-[11px] opacity-70">Provider support varies. A higher penalty discourages repeated words or topics.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#ff3399]/20">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Creativity (Temperature)</span>
                    <span className="font-mono text-[#ff66b2]">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-[#ff007f]"
                  />
                  <p className="text-[10px] text-[#ffd6eb]/60">Higher = more poetic & daring prose</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>Response Length (Tokens)</span>
                    <span className="font-mono text-[#ff66b2]">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="128"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full accent-[#ff007f]"
                  />
                  <p className="text-[10px] text-[#ffd6eb]/60">Maximum length per generated reply</p>
                </div>
              </div>
            </div>
          )}

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
                {firebaseSyncMessage && <p role="status" className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-[#ffd6eb]/80">{firebaseSyncMessage}</p>}
              </div>
            </div>
          )}

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
                  Save a backup of your characters, chats, personas, social profiles, and settings to your GitHub repository. API keys and database credentials are excluded. This browser-hosted app cannot push its own source code.
                </p>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-[#ffd6eb]">GitHub token</span>
                  <input
                    type="password"
                    autoComplete="off"
                    value={githubToken}
                    onChange={(event) => setGithubToken(event.target.value)}
                    placeholder="Paste a fine-grained token for Chat-app"
                    className="w-full rounded-xl border border-[#ff3399]/40 bg-[#10040d] px-3 py-2 text-white placeholder-white/45 focus:border-[#ff3399] focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-[#ffd6eb]/80">
                  <input
                    type="checkbox"
                    checked={rememberGitToken}
                    onChange={(event) => setRememberGitToken(event.target.checked)}
                    className="accent-pink-500"
                  />
                  Remember this token on this device
                </label>
                <p className="text-[10px] text-[#ffd6eb]/65">
                  Create a fine-grained GitHub token limited to this repository with Contents: read and write. The token stays in this browser unless you choose to remember it.
                </p>

                <button
                  onClick={handleGitPush}
                  disabled={pushingGit}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {pushingGit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving app data backup...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Save app data backup to GitHub</span>
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

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#8AABF4]/30 bg-[#0d020b] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6">
          <div className="text-[11px] text-[#ffd6eb]/60">
            OpenRouter AI &bull; Firebase &bull; Supabase &bull; ColorPop
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={requestClose}
              className="min-h-11 rounded-xl bg-[#0B168C] px-4 py-2 text-[#ffd6eb] hover:bg-[#079AF0] font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="min-h-11 rounded-xl bg-gradient-to-r from-[#B12FA7] to-[#079AF0] px-5 py-2 text-white font-bold text-xs shadow-[0_0_15px_rgba(7,154,240,0.35)] transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



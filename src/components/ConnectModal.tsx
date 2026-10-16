import React, { useState } from 'react';
import {
  X,
  Github,
  KeyRound,
  UserCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onExploreUser: (username: string) => void;
  onOpenGuide: () => void;
  devRedirectUri: string;
  previewRedirectUri: string;
  isConfigured: boolean;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onExploreUser,
  onOpenGuide,
  devRedirectUri,
  isConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'pat' | 'explore'>('oauth');
  const [tokenInput, setTokenInput] = useState('');
  const [exploreInput, setExploreInput] = useState('');
  const [customClientId, setCustomClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Popup-based OAuth Flow per OAuth skill guidelines
  const handleOAuthConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '/api/auth/url';
      if (customClientId.trim()) {
        endpoint += `?client_id=${encodeURIComponent(customClientId.trim())}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!data.url) {
        setError(data.message || 'GitHub OAuth is not configured yet. Enter your Client ID or use a Personal Access Token.');
        setLoading(false);
        return;
      }

      // Open OAuth provider's URL DIRECTLY in popup per AI Studio preview constraints
      const width = 600;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        data.url,
        'github_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!authWindow) {
        setError('Popup blocked by browser. Please enable popups for this site to complete authorization.');
        setLoading(false);
        return;
      }

      // Listen for message from popup callback handler
      const handleMessage = (event: MessageEvent) => {
        const origin = event.origin;
        if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
          return;
        }

        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          onSuccess();
          onClose();
        } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          setError(event.data.error || 'Authentication failed');
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Failed to initiate GitHub authorization');
      setLoading(false);
    }
  };

  // 2. Personal Access Token Connect
  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify token');
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  // 3. Public User Explore
  const handleExplore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exploreInput.trim()) return;
    onExploreUser(exploreInput.trim());
    onClose();
  };

  const sampleUsers = ['octocat', 'torvalds', 'shadcn', 'antfu', 'yyx990803'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f0f6fc]">Connect your GitHub</h2>
              <p className="text-xs text-[#8b949e]">Access your repositories, issues, PRs, and profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#30363d] bg-[#0d1117]/60 px-6 pt-2">
          <button
            onClick={() => { setActiveTab('oauth'); setError(null); }}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub OAuth</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-full font-mono">Standard</span>
          </button>
          <button
            onClick={() => { setActiveTab('pat'); setError(null); }}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pat'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Access Token</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-mono">Instant</span>
          </button>
          <button
            onClick={() => { setActiveTab('explore'); setError(null); }}
            className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'explore'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Public Explore</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#f0f6fc] flex items-center gap-2">
                      Official GitHub Authorization
                      {isConfigured && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#8b949e]">
                      Sign in directly via GitHub popup with secure session cookies.
                    </p>
                  </div>
                  <button
                    onClick={onOpenGuide}
                    className="p-1.5 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded-lg transition-colors text-xs flex items-center gap-1"
                    title="View OAuth Setup Instructions"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Setup Guide</span>
                  </button>
                </div>

                {!isConfigured && (
                  <div className="pt-2 border-t border-[#30363d]/60 space-y-2">
                    <label className="text-[11px] font-medium text-[#8b949e] block">
                      Custom GitHub Client ID (Optional override):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ov23li..."
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleOAuthConnect}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-emerald-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for authorization...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    <span>Authorize with GitHub</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-[#8b949e] pt-1">
                <span>Callback: <code className="text-[#58a6ff] font-mono">{devRedirectUri.replace('https://', '')}</code></span>
                <button
                  type="button"
                  onClick={onOpenGuide}
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  OAuth instructions <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pat' && (
            <form onSubmit={handleTokenConnect} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#f0f6fc] flex items-center justify-between">
                  <span>GitHub Personal Access Token</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,read:org&description=GitHub+Connect+Hub"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1 font-normal"
                  >
                    <span>Generate token on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <p className="text-xs text-[#8b949e]">
                  Paste a Personal Access Token (Classic or Fine-grained) with <code className="text-[#79c0ff]">repo</code> and <code className="text-[#79c0ff]">read:user</code> scopes.
                </p>
                <div className="relative mt-2">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-mono tracking-wide"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] text-xs text-[#8b949e] space-y-1">
                <div className="font-medium text-[#c9d1d9] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Recommended Scopes:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-[#79c0ff] pt-1">
                  <div>&bull; repo (full control)</div>
                  <div>&bull; read:user (profile)</div>
                  <div>&bull; user:email (email)</div>
                  <div>&bull; read:org (teams)</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !tokenInput.trim()}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verify &amp; Connect Token</span>
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'explore' && (
            <form onSubmit={handleExplore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#f0f6fc]">Explore Public Profile</label>
                <p className="text-xs text-[#8b949e]">
                  Enter any public GitHub username to inspect repositories, issues, activity, and stats without logging in.
                </p>
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="Enter GitHub username (e.g. torvalds)"
                    value={exploreInput}
                    onChange={(e) => setExploreInput(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#8b949e]">Or choose a popular profile:</div>
                <div className="flex flex-wrap gap-1.5">
                  {sampleUsers.map((user) => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => {
                        onExploreUser(user);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded-lg text-xs font-mono transition-colors"
                    >
                      @{user}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!exploreInput.trim()}
                className="w-full py-2.5 px-4 bg-[#21262d] hover:bg-[#30363d] text-white font-semibold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all border border-[#30363d] disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>Explore Profile</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

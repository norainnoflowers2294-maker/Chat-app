import React, { useState } from 'react';
import { ExternalLink, Copy, Check, X, Shield, KeyRound, Globe, ArrowRight } from 'lucide-react';

interface OAuthGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  devRedirectUri: string;
  previewRedirectUri: string;
}

export const OAuthGuideModal: React.FC<OAuthGuideModalProps> = ({
  isOpen,
  onClose,
  devRedirectUri,
  previewRedirectUri,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f0f6fc]">GitHub OAuth App Setup</h2>
              <p className="text-xs text-[#8b949e]">Configure your GitHub OAuth credentials in under 2 minutes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#c9d1d9]">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/40">
                1
              </span>
              <span>Open GitHub Developer Settings</span>
            </div>
            <p className="text-xs text-[#8b949e] ml-8">
              Navigate to GitHub's OAuth Apps page to register a new application.
            </p>
            <div className="ml-8">
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] rounded-lg text-xs font-medium transition-colors"
              >
                <span>GitHub Developer Settings &rarr; New OAuth App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/40">
                2
              </span>
              <span>Add Authorization Callback URLs</span>
            </div>
            <p className="text-xs text-[#8b949e] ml-8">
              Paste these exact callback URLs into the <strong>Authorization callback URL</strong> field:
            </p>

            <div className="ml-8 space-y-2">
              {/* Development URL */}
              <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Development Callback URL
                  </span>
                  <button
                    onClick={() => copyToClipboard(devRedirectUri, 'dev')}
                    className="flex items-center space-x-1 px-2 py-0.5 text-xs text-[#58a6ff] hover:bg-[#21262d] rounded transition-colors"
                  >
                    {copiedKey === 'dev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'dev' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block text-xs font-mono text-[#79c0ff] break-all">{devRedirectUri}</code>
              </div>

              {/* Shared URL */}
              <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Shared / Deployed Callback URL
                  </span>
                  <button
                    onClick={() => copyToClipboard(previewRedirectUri, 'preview')}
                    className="flex items-center space-x-1 px-2 py-0.5 text-xs text-[#58a6ff] hover:bg-[#21262d] rounded transition-colors"
                  >
                    {copiedKey === 'preview' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'preview' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block text-xs font-mono text-[#d2a8ff] break-all">{previewRedirectUri}</code>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-medium">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/40">
                3
              </span>
              <span>Set Environment Variables</span>
            </div>
            <p className="text-xs text-[#8b949e] ml-8">
              Copy your GitHub Client ID and generate a Client Secret, then configure them in the AI Studio environment variables panel:
            </p>

            <div className="ml-8 p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#e6edf3]">GITHUB_CLIENT_ID</span>
                <span className="text-[#8b949e]">Your OAuth app Client ID</span>
              </div>
              <div className="h-px bg-[#21262d]" />
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#e6edf3]">GITHUB_CLIENT_SECRET</span>
                <span className="text-[#8b949e]">Your OAuth app Client Secret</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#30363d] bg-[#0d1117]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

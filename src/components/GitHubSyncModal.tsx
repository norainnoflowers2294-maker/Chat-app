import React, { useState } from 'react';
import { X, GitBranch, Github, Upload, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/norainnoflowers2294-maker/Chat-app.git');
  const [commitMsg, setCommitMsg] = useState('Update ColorPop Roleplay Hub with Dual Track Screen and Interconnected Links');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; output?: string } | null>(null);

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushing(true);
    setResult(null);

    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, commitMsg }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'Successfully committed and pushed all changes to GitHub!',
          output: data.output,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to push to GitHub',
          output: data.stderr || data.stdout,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Network error communicating with Git push service.',
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,51,153,0.4)] flex flex-col overflow-hidden text-[#ffd6eb]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ff3399]/30 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#24292e] to-[#404448] text-white shadow">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-xl font-bold text-white tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                GitHub Push &amp; Backup
              </h2>
              <p className="text-xs text-[#ffd6eb]/70">
                Push latest roleplay codebase directly to your repository
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

        {/* Form */}
        <form onSubmit={handlePush} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#ff99cc] block mb-1">
              Target GitHub Repository
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 bg-[#1e071a] border border-[#ff3399]/30 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 font-mono"
              />
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-[#ffd6eb] rounded-xl"
                title="Open GitHub repo in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#ff99cc] block mb-1">Commit Message</label>
            <input
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full bg-[#1e071a] border border-[#ff3399]/30 focus:border-[#ff3399] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40"
            />
          </div>

          {result && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start space-x-2.5 ${
                result.success
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 overflow-hidden">
                <p className="font-bold">{result.message}</p>
                {result.output && (
                  <pre className="text-[10px] font-mono bg-black/40 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {result.output}
                  </pre>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#ff3399]/20 flex items-center justify-between">
            <span className="text-[11px] text-[#ffd6eb]/70 font-mono">
              Branch: <strong className="text-white">main</strong>
            </span>

            <button
              type="submit"
              disabled={pushing}
              className="px-5 py-2.5 bg-gradient-to-r from-[#ff007f] to-[#ff3399] hover:from-[#ff1a8c] hover:to-[#ff4da6] text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(255,0,128,0.7)] transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {pushing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pushing to GitHub...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Push to GitHub Main</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

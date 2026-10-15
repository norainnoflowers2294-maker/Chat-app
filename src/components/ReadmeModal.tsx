import React, { useEffect, useState } from 'react';
import { X, BookOpen, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { GitHubRepo } from '../types';

interface ReadmeModalProps {
  repo: GitHubRepo | null;
  onClose: () => void;
}

export const ReadmeModal: React.FC<ReadmeModalProps> = ({ repo, onClose }) => {
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setContentHtml(null);

    fetch(`/api/github/repo/${repo.owner.login}/${repo.name}/readme`)
      .then((res) => {
        if (!res.ok) throw new Error('README not available or inaccessible');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setContentHtml(data.html);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repo]);

  if (!repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{repo.full_name}</span>
                <span className="text-xs text-[#8b949e] font-mono">/ README.md</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`${repo.html_url}#readme`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-[#8b949e] space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs">Fetching repository README from GitHub...</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-white">{error}</h3>
              <p className="text-xs text-[#8b949e]">
                This repository might not have a README file or it might be in a branch not accessible.
              </p>
            </div>
          )}

          {contentHtml && (
            <div
              className="prose prose-invert max-w-none text-sm text-[#c9d1d9] prose-headings:text-white prose-a:text-[#58a6ff] prose-code:text-[#ff7b72] prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[#30363d]"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

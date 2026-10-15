import React, { useState } from 'react';
import {
  Star,
  GitFork,
  CircleDot,
  Lock,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { GitHubRepo } from '../types';
import { getLanguageColor, formatRelativeTime } from '../utils/languageColors';

interface RepoCardProps {
  repo: GitHubRepo;
  onOpenReadme: (repo: GitHubRepo) => void;
  isGuest: boolean;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onOpenReadme, isGuest }) => {
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(repo.stargazers_count);
  const [copiedClone, setCopiedClone] = useState<'https' | 'ssh' | null>(null);
  const [showCloneMenu, setShowCloneMenu] = useState(false);

  const toggleStar = async () => {
    if (isGuest) return;
    const previousStarred = isStarred;
    const newStarred = !previousStarred;
    setIsStarred(newStarred);
    setStarCount((prev) => (newStarred ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const method = newStarred ? 'PUT' : 'DELETE';
      await fetch(`/api/github/user/starred/${repo.owner.login}/${repo.name}`, {
        method,
      });
    } catch {
      // Revert on error
      setIsStarred(previousStarred);
      setStarCount((prev) => (previousStarred ? prev + 1 : prev - 1));
    }
  };

  const copyClone = (type: 'https' | 'ssh') => {
    const text = type === 'https' ? repo.clone_url : repo.ssh_url;
    navigator.clipboard.writeText(text);
    setCopiedClone(type);
    setTimeout(() => {
      setCopiedClone(null);
      setShowCloneMenu(false);
    }, 1500);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/40 rounded-xl p-5 flex flex-col justify-between transition-all group hover:shadow-lg hover:shadow-black/40">
      <div>
        {/* Repo Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-[#58a6ff] hover:underline break-all group-hover:text-blue-400"
            >
              {repo.name}
            </a>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#30363d] text-[#8b949e]">
              {repo.private ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              ) : (
                'Public'
              )}
            </span>
            {repo.fork && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] flex items-center gap-1">
                <GitFork className="w-2.5 h-2.5" /> Forked
              </span>
            )}
          </div>

          {/* Quick Actions (Star & Clone) */}
          <div className="flex items-center space-x-1 shrink-0 relative">
            <button
              onClick={toggleStar}
              disabled={isGuest}
              title={isGuest ? 'Connect account to star repos' : isStarred ? 'Unstar repo' : 'Star repo'}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isStarred
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                  : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d] disabled:opacity-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              <span>{starCount}</span>
            </button>

            {/* Clone Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowCloneMenu(!showCloneMenu)}
                className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] border border-transparent hover:border-[#30363d] rounded-lg transition-colors"
                title="Clone repository"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>

              {showCloneMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-xl shadow-xl z-20 p-2 space-y-1 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#8b949e]">Clone Repository</div>
                  <button
                    onClick={() => copyClone('https')}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#21262d] text-[#c9d1d9] transition-colors"
                  >
                    <span>HTTPS</span>
                    {copiedClone === 'https' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8b949e]" />}
                  </button>
                  <button
                    onClick={() => copyClone('ssh')}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#21262d] text-[#c9d1d9] transition-colors"
                  >
                    <span>SSH</span>
                    {copiedClone === 'ssh' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8b949e]" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#8b949e] mt-2 line-clamp-2 min-h-[2rem] leading-relaxed">
          {repo.description || 'No description provided for this repository.'}
        </p>

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {repo.topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 rounded-md bg-[#388bfd]/10 text-[#58a6ff] text-[10px] font-mono hover:bg-[#388bfd]/20 transition-colors"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between text-xs text-[#8b949e]">
        <div className="flex items-center space-x-3">
          {repo.language && (
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getLanguageColor(repo.language) }}
              />
              <span className="text-[11px] font-medium text-[#c9d1d9]">{repo.language}</span>
            </div>
          )}

          {repo.forks_count > 0 && (
            <div className="flex items-center space-x-1 text-[11px]">
              <GitFork className="w-3 h-3" />
              <span>{repo.forks_count}</span>
            </div>
          )}

          {repo.open_issues_count > 0 && (
            <div className="flex items-center space-x-1 text-[11px]">
              <CircleDot className="w-3 h-3 text-emerald-400" />
              <span>{repo.open_issues_count}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px]">Updated {formatRelativeTime(repo.pushed_at || repo.updated_at)}</span>
          <button
            onClick={() => onOpenReadme(repo)}
            className="flex items-center space-x-1 text-xs text-[#58a6ff] hover:underline px-2 py-0.5 rounded hover:bg-[#21262d] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">README</span>
          </button>
        </div>
      </div>
    </div>
  );
};

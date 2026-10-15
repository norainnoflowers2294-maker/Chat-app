import React from 'react';
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Twitter,
  Calendar,
  Users,
  Star,
  BookMarked,
  Code2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { GitHubUser, GitHubRepo } from '../types';

interface ProfileHeaderProps {
  user: GitHubUser;
  repos: GitHubRepo[];
  isGuest: boolean;
  onOpenConnect: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  repos,
  isGuest,
  onOpenConnect,
}) => {
  const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
  const totalForks = repos.reduce((acc, repo) => acc + (repo.forks_count || 0), 0);
  const joinedDate = new Date(user.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {isGuest && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              You are viewing <strong>@{user.login}</strong> in preview mode. Connect your own GitHub account to manage private repos, star projects, and create issues.
            </span>
          </div>
          <button
            onClick={onOpenConnect}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-semibold transition-colors shrink-0 ml-3"
          >
            Connect Account
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* User Info */}
        <div className="flex items-start sm:items-center space-x-5">
          <div className="relative">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-2 ring-[#30363d] object-cover shadow-lg"
            />
            {!isGuest && (
              <div
                title="Verified OAuth Connection"
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1 rounded-full shadow-md"
              >
                <ShieldCheck className="w-4 h-4 fill-current" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user.name || user.login}
              </h1>
              <span className="text-sm font-mono text-[#8b949e]">@{user.login}</span>
            </div>

            {user.bio && (
              <p className="text-sm text-[#c9d1d9] max-w-xl leading-relaxed">{user.bio}</p>
            )}

            {/* Meta Items */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-[#8b949e] pt-1">
              {user.company && (
                <div className="flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>{user.company}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.blog && (
                <div className="flex items-center space-x-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <a
                    href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#58a6ff] hover:underline"
                  >
                    {user.blog.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {user.twitter_username && (
                <div className="flex items-center space-x-1.5">
                  <Twitter className="w-3.5 h-3.5" />
                  <a
                    href={`https://twitter.com/${user.twitter_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#58a6ff] hover:underline"
                  >
                    @{user.twitter_username}
                  </a>
                </div>
              )}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View on GitHub Button */}
        <div className="shrink-0 w-full sm:w-auto">
          <a
            href={user.html_url}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] border border-[#30363d] rounded-xl text-xs font-semibold transition-colors"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8b949e]" />
          </a>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#30363d]">
        <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]/80">
          <div className="flex items-center space-x-2 text-xs text-[#8b949e] mb-1">
            <BookMarked className="w-4 h-4 text-blue-400" />
            <span>Repositories</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {user.public_repos + (user.total_private_repos || 0)}
          </div>
        </div>

        <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]/80">
          <div className="flex items-center space-x-2 text-xs text-[#8b949e] mb-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>Total Stars</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {totalStars.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]/80">
          <div className="flex items-center space-x-2 text-xs text-[#8b949e] mb-1">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Followers / Following</span>
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
            <span>{user.followers.toLocaleString()}</span>
            <span className="text-xs text-[#8b949e] font-normal">/ {user.following.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d]/80">
          <div className="flex items-center space-x-2 text-xs text-[#8b949e] mb-1">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span>Repo Forks</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {totalForks.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

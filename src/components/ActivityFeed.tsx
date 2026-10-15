import React from 'react';
import {
  GitCommit,
  GitBranch,
  Star,
  GitPullRequest,
  CircleDot,
  GitFork,
  Tag,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { GitHubEvent } from '../types';
import { formatRelativeTime } from '../utils/languageColors';

interface ActivityFeedProps {
  events: GitHubEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center text-[#8b949e] space-y-2">
        <Activity className="w-8 h-8 mx-auto text-[#30363d]" />
        <p className="text-sm font-medium text-[#c9d1d9]">No recent activity events</p>
        <p className="text-xs">There are no recent public commits, stars, or branches recorded.</p>
      </div>
    );
  }

  const renderEventDetails = (event: GitHubEvent) => {
    switch (event.type) {
      case 'PushEvent': {
        const commits = event.payload.commits || [];
        const branch = (event.payload.ref || '').replace('refs/heads/', '');
        return (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#8b949e]">pushed to</span>
              <span className="px-1.5 py-0.5 rounded bg-[#388bfd]/10 text-[#58a6ff] font-mono text-[11px]">
                {branch || 'main'}
              </span>
              <span className="text-[#8b949e]">at</span>
              <a
                href={`https://github.com/${event.repo.name}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#f0f6fc] hover:underline"
              >
                {event.repo.name}
              </a>
            </div>
            {commits.slice(0, 3).map((commit) => (
              <div key={commit.sha} className="text-xs font-mono text-[#8b949e] flex items-center space-x-2 pl-2">
                <span className="text-[#79c0ff]">{commit.sha.substring(0, 7)}</span>
                <span className="text-[#c9d1d9] truncate">{commit.message}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'WatchEvent':
        return (
          <div className="text-xs text-[#8b949e]">
            starred{' '}
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#f0f6fc] hover:underline"
            >
              {event.repo.name}
            </a>
          </div>
        );

      case 'CreateEvent': {
        const refType = event.payload.ref_type || 'repository';
        return (
          <div className="text-xs text-[#8b949e]">
            created {refType}{' '}
            {event.payload.ref && (
              <span className="font-mono text-[#58a6ff]">{event.payload.ref} in </span>
            )}
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#f0f6fc] hover:underline"
            >
              {event.repo.name}
            </a>
          </div>
        );
      }

      case 'PullRequestEvent': {
        const action = event.payload.action;
        const pr = event.payload.pull_request;
        return (
          <div className="text-xs text-[#8b949e] space-y-1">
            <div>
              {action} pull request in{' '}
              <a
                href={`https://github.com/${event.repo.name}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#f0f6fc] hover:underline"
              >
                {event.repo.name}
              </a>
            </div>
            {pr && (
              <div className="text-xs font-medium text-[#c9d1d9] pl-2">
                #{pr.number}: {pr.title}
              </div>
            )}
          </div>
        );
      }

      case 'IssuesEvent': {
        const action = event.payload.action;
        const issue = event.payload.issue;
        return (
          <div className="text-xs text-[#8b949e] space-y-1">
            <div>
              {action} issue in{' '}
              <a
                href={`https://github.com/${event.repo.name}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#f0f6fc] hover:underline"
              >
                {event.repo.name}
              </a>
            </div>
            {issue && (
              <div className="text-xs font-medium text-[#c9d1d9] pl-2">
                #{issue.number}: {issue.title}
              </div>
            )}
          </div>
        );
      }

      case 'ForkEvent':
        return (
          <div className="text-xs text-[#8b949e]">
            forked{' '}
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#f0f6fc] hover:underline"
            >
              {event.repo.name}
            </a>
          </div>
        );

      case 'ReleaseEvent':
        return (
          <div className="text-xs text-[#8b949e]">
            released version in{' '}
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#f0f6fc] hover:underline"
            >
              {event.repo.name}
            </a>
          </div>
        );

      default:
        return (
          <div className="text-xs text-[#8b949e]">
            activity on{' '}
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#f0f6fc] hover:underline"
            >
              {event.repo.name}
            </a>
          </div>
        );
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PushEvent':
        return <GitCommit className="w-4 h-4 text-blue-400" />;
      case 'WatchEvent':
        return <Star className="w-4 h-4 text-yellow-400" />;
      case 'CreateEvent':
        return <GitBranch className="w-4 h-4 text-emerald-400" />;
      case 'PullRequestEvent':
        return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      case 'IssuesEvent':
        return <CircleDot className="w-4 h-4 text-emerald-400" />;
      case 'ForkEvent':
        return <GitFork className="w-4 h-4 text-indigo-400" />;
      case 'ReleaseEvent':
        return <Tag className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-[#8b949e]" />;
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl divide-y divide-[#30363d] overflow-hidden">
      {events.map((event) => (
        <div key={event.id} className="p-4 hover:bg-[#1c2128] transition-colors flex items-start space-x-3.5">
          <div className="mt-0.5 p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
            {getEventIcon(event.type)}
          </div>
          <div className="flex-1 min-w-0">
            {renderEventDetails(event)}
          </div>
          <div className="text-[11px] text-[#8b949e] shrink-0 whitespace-nowrap">
            {formatRelativeTime(event.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import {
  CircleDot,
  CheckCircle2,
  GitPullRequest,
  Plus,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { GitHubIssue, GitHubRepo } from '../types';
import { formatRelativeTime } from '../utils/languageColors';

interface IssuesListProps {
  issues: GitHubIssue[];
  pulls: any[];
  repos: GitHubRepo[];
  isGuest: boolean;
  onRefresh: () => void;
}

export const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  pulls,
  repos,
  isGuest,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<'issues' | 'pulls'>('issues');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(repos[0]?.name || '');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const displayItems = (filterType === 'issues' ? issues : pulls).filter((item: any) => {
    if (stateFilter === 'all') return true;
    return item.state === stateFilter;
  });

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedRepo) return;

    const targetRepo = repos.find((r) => r.name === selectedRepo);
    if (!targetRepo) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/github/repo/${targetRepo.owner.login}/${targetRepo.name}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create issue');
      }

      setNewTitle('');
      setNewBody('');
      setIsCreateModalOpen(false);
      setSubmitting(false);
      onRefresh();
    } catch (err: any) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] border border-[#30363d] p-3 rounded-xl">
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setFilterType('issues')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'issues'
                  ? 'bg-[#21262d] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
              <span>Issues ({issues.length})</span>
            </button>
            <button
              onClick={() => setFilterType('pulls')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === 'pulls'
                  ? 'bg-[#21262d] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
              <span>Pull Requests ({pulls.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-1 text-xs text-[#8b949e] pl-2 border-l border-[#30363d]">
            {(['all', 'open', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={`capitalize px-2 py-0.5 rounded transition-colors ${
                  stateFilter === s ? 'text-[#58a6ff] font-semibold bg-blue-500/10' : 'hover:text-[#c9d1d9]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!isGuest && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Issue</span>
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl divide-y divide-[#30363d] overflow-hidden">
        {displayItems.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <CircleDot className="w-8 h-8 mx-auto text-[#30363d]" />
            <p className="text-sm font-medium text-[#c9d1d9]">No {filterType} found</p>
            <p className="text-xs">There are no {stateFilter} {filterType} matching this view.</p>
          </div>
        ) : (
          displayItems.map((item: any) => {
            const isOpen = item.state === 'open';
            const isPR = Boolean(item.pull_request) || filterType === 'pulls';

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-[#1c2128] transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 shrink-0">
                    {isPR ? (
                      <GitPullRequest
                        className={`w-4 h-4 ${isOpen ? 'text-emerald-400' : 'text-purple-400'}`}
                      />
                    ) : isOpen ? (
                      <CircleDot className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <a
                        href={item.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[#f0f6fc] hover:text-[#58a6ff] hover:underline"
                      >
                        {item.title}
                      </a>
                      {item.labels &&
                        item.labels.map((label: any) => (
                          <span
                            key={label.id}
                            className="px-2 py-0.2 text-[10px] rounded-full font-mono border"
                            style={{
                              backgroundColor: `#${label.color}15`,
                              borderColor: `#${label.color}40`,
                              color: `#${label.color}`,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                    </div>

                    <div className="text-xs text-[#8b949e] flex items-center space-x-2 flex-wrap">
                      <span>#{item.number}</span>
                      <span>&bull;</span>
                      <span>opened {formatRelativeTime(item.created_at)}</span>
                      <span>by @{item.user?.login}</span>
                      {item.repository_url && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono text-[11px] text-[#79c0ff]">
                            {item.repository_url.split('/').slice(-1)[0]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {item.comments > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-[#8b949e]">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{item.comments}</span>
                    </div>
                  )}

                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Issue Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center space-x-2">
                <CircleDot className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Create New Issue</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#c9d1d9]">Repository</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {repos.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#c9d1d9]">Issue Title</label>
                <input
                  type="text"
                  placeholder="Title of the issue"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#c9d1d9]">Description (Markdown supported)</label>
                <textarea
                  rows={4}
                  placeholder="Leave a comment or description..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTitle.trim()}
                  className="px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit New Issue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export interface GitHubUser {
  login: string;
  id: number;
  node_id?: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  total_private_repos?: number;
  owned_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  topics?: string[];
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  ssh_url: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

export interface GitHubEvent {
  id: string;
  type: string;
  actor: {
    id: number;
    login: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action?: string;
    ref?: string;
    ref_type?: string;
    description?: string;
    commits?: Array<{
      sha: string;
      message: string;
      author: { name: string; email: string };
    }>;
    issue?: {
      number: number;
      title: string;
      html_url: string;
    };
    pull_request?: {
      number: number;
      title: string;
      html_url: string;
    };
  };
  created_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: 'open' | 'closed';
  comments: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  repository_url: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  pull_request?: {
    html_url: string;
  };
}

export interface RateLimit {
  remaining: string | null;
  limit: string | null;
  reset?: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: GitHubUser;
  rateLimit?: RateLimit;
  configured: boolean;
  redirectUri: string;
  devRedirectUri: string;
  previewRedirectUri: string;
  message?: string;
}

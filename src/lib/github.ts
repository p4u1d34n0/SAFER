import { loadConfig } from './data';
import { execSync } from 'child_process';

export interface GitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
  labels: Array<{ name: string; color: string }>;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export interface GitHubBuildStatus {
  state: 'success' | 'failure' | 'pending' | 'error';
  statuses: Array<{
    context: string;
    state: string;
    description: string;
    target_url: string;
  }>;
}

export type GitHubMethod = 'gh-cli' | 'token' | 'none';

/**
 * Check if gh CLI is installed and authenticated
 */
function checkGhCLI(): { available: boolean; authenticated: boolean; repo?: string } {
  try {
    // Check if gh is installed
    execSync('gh --version', { stdio: 'pipe' });

    // Check if authenticated
    const authStatus = execSync('gh auth status 2>&1', { encoding: 'utf-8' });
    const authenticated = authStatus.includes('Logged in to github.com');

    // Try to get current repo
    let repo: string | undefined;
    try {
      repo = execSync('gh repo view --json nameWithOwner -q .nameWithOwner', {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
    } catch {
      // Not in a repo or repo not found
      repo = undefined;
    }

    return { available: true, authenticated, repo };
  } catch (error) {
    return { available: false, authenticated: false };
  }
}

export class GitHubClient {
  private owner: string;
  private repo: string;
  private token: string;
  private baseUrl = 'https://api.github.com';
  private method: GitHubMethod = 'none';

  constructor() {
    const config = loadConfig();

    // Check if GitHub is enabled in config
    if (!config.github || !config.github.enabled) {
      throw new Error('GitHub integration is not enabled in config');
    }

    // Try gh CLI first
    const ghStatus = checkGhCLI();

    if (ghStatus.available && ghStatus.authenticated) {
      this.method = 'gh-cli';

      // If owner/repo configured, use that; otherwise try to detect from gh
      if (config.github.owner && config.github.repo) {
        this.owner = config.github.owner;
        this.repo = config.github.repo;
      } else if (ghStatus.repo) {
        const [owner, repo] = ghStatus.repo.split('/');
        this.owner = owner;
        this.repo = repo;
      } else {
        throw new Error('GitHub repository not configured and could not be detected');
      }

      this.token = ''; // Not needed for gh CLI
      console.log('✓ Using GitHub CLI (gh) for authentication');
    } else {
      // Fallback to token-based authentication
      if (!config.github.token) {
        throw new Error(
          'GitHub CLI (gh) not available. Please either:\n' +
          '  1. Install gh CLI: https://cli.github.com/\n' +
          '  2. Authenticate: gh auth login\n' +
          '  3. Or set a Personal Access Token in config'
        );
      }

      if (!config.github.owner || !config.github.repo) {
        throw new Error('GitHub owner and repo must be configured when not using gh CLI');
      }

      this.method = 'token';
      this.owner = config.github.owner;
      this.repo = config.github.repo;
      this.token = config.github.token;
      console.log('⚠ Using token-based authentication (consider using gh CLI for better security)');
    }
  }

  /**
   * Execute gh CLI command
   */
  private execGh(args: string): string {
    try {
      return execSync(`gh ${args}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`GitHub CLI error: ${error.message}`);
    }
  }

  /**
   * Make API request using token
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getOpenPullRequests(): Promise<GitHubPR[]> {
    if (this.method === 'gh-cli') {
      const result = this.execGh(
        `pr list --repo ${this.owner}/${this.repo} --json number,title,state,url,createdAt,updatedAt,author,headRefName,baseRefName`
      );
      const prs = JSON.parse(result);

      // Map gh CLI format to our interface
      return prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state.toLowerCase(),
        html_url: pr.url,
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
        user: { login: pr.author.login },
        head: { ref: pr.headRefName },
        base: { ref: pr.baseRefName },
      }));
    } else {
      return this.request<GitHubPR[]>(`/repos/${this.owner}/${this.repo}/pulls?state=open`);
    }
  }

  async getPullRequest(prNumber: number): Promise<GitHubPR> {
    if (this.method === 'gh-cli') {
      const result = this.execGh(
        `pr view ${prNumber} --repo ${this.owner}/${this.repo} --json number,title,state,url,createdAt,updatedAt,author,headRefName,baseRefName`
      );
      const pr = JSON.parse(result);

      return {
        number: pr.number,
        title: pr.title,
        state: pr.state.toLowerCase(),
        html_url: pr.url,
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
        user: { login: pr.author.login },
        head: { ref: pr.headRefName },
        base: { ref: pr.baseRefName },
      };
    } else {
      return this.request<GitHubPR>(`/repos/${this.owner}/${this.repo}/pulls/${prNumber}`);
    }
  }

  async getPullRequestsByBranch(branch: string): Promise<GitHubPR[]> {
    const allPRs = await this.getOpenPullRequests();
    return allPRs.filter(pr => pr.head.ref === branch);
  }

  async getOpenIssues(): Promise<GitHubIssue[]> {
    if (this.method === 'gh-cli') {
      const result = this.execGh(
        `issue list --repo ${this.owner}/${this.repo} --json number,title,state,url,createdAt,updatedAt,author,labels`
      );
      const issues = JSON.parse(result);

      return issues.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        html_url: issue.url,
        created_at: issue.createdAt,
        updated_at: issue.updatedAt,
        user: { login: issue.author.login },
        labels: issue.labels || [],
      }));
    } else {
      return this.request<GitHubIssue[]>(`/repos/${this.owner}/${this.repo}/issues?state=open`);
    }
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    if (this.method === 'gh-cli') {
      const result = this.execGh(
        `issue view ${issueNumber} --repo ${this.owner}/${this.repo} --json number,title,state,url,createdAt,updatedAt,author,labels`
      );
      const issue = JSON.parse(result);

      return {
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        html_url: issue.url,
        created_at: issue.createdAt,
        updated_at: issue.updatedAt,
        user: { login: issue.author.login },
        labels: issue.labels || [],
      };
    } else {
      return this.request<GitHubIssue>(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`);
    }
  }

  async getRecentCommits(branch: string, limit: number = 10): Promise<GitHubCommit[]> {
    if (this.method === 'gh-cli') {
      // gh doesn't have a direct commit list command, fall back to API
      // But we can use git log if we're in the repo
      try {
        const result = execSync(
          `git log ${branch} --pretty=format:'{"sha":"%H","message":"%s","author":"%an","date":"%ai"}' -n ${limit}`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );

        const commits = result
          .trim()
          .split('\n')
          .filter(line => line)
          .map(line => {
            const data = JSON.parse(line);
            return {
              sha: data.sha,
              commit: {
                message: data.message,
                author: {
                  name: data.author,
                  date: data.date,
                },
              },
              html_url: `https://github.com/${this.owner}/${this.repo}/commit/${data.sha}`,
            };
          });

        return commits;
      } catch {
        // If git log fails, we can't get commits via gh CLI
        throw new Error('Unable to fetch commits. Ensure you are in a git repository.');
      }
    } else {
      return this.request<GitHubCommit[]>(
        `/repos/${this.owner}/${this.repo}/commits?sha=${branch}&per_page=${limit}`
      );
    }
  }

  async getCommit(sha: string): Promise<GitHubCommit> {
    // Both methods can use API for single commit
    return this.request<GitHubCommit>(`/repos/${this.owner}/${this.repo}/commits/${sha}`);
  }

  async getBranchStatus(branch: string): Promise<GitHubBuildStatus> {
    // gh CLI doesn't have a direct status command, use API
    return this.request<GitHubBuildStatus>(`/repos/${this.owner}/${this.repo}/commits/${branch}/status`);
  }

  async searchIssuesAndPRsByDeliveryItem(itemId: string): Promise<{
    pullRequests: GitHubPR[];
    issues: GitHubIssue[];
  }> {
    if (this.method === 'gh-cli') {
      // Search PRs
      const prResult = this.execGh(
        `pr list --repo ${this.owner}/${this.repo} --search "${itemId}" --json number,title,state,url,createdAt,updatedAt,author,headRefName,baseRefName`
      );
      const prs = JSON.parse(prResult).map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state.toLowerCase(),
        html_url: pr.url,
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
        user: { login: pr.author.login },
        head: { ref: pr.headRefName },
        base: { ref: pr.baseRefName },
      }));

      // Search issues
      const issueResult = this.execGh(
        `issue list --repo ${this.owner}/${this.repo} --search "${itemId}" --json number,title,state,url,createdAt,updatedAt,author,labels`
      );
      const issues = JSON.parse(issueResult).map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        html_url: issue.url,
        created_at: issue.createdAt,
        updated_at: issue.updatedAt,
        user: { login: issue.author.login },
        labels: issue.labels || [],
      }));

      return { pullRequests: prs, issues };
    } else {
      const prs = await this.request<{ items: GitHubPR[] }>(
        `/search/issues?q=repo:${this.owner}/${this.repo}+${itemId}+is:pr`
      );

      const issues = await this.request<{ items: GitHubIssue[] }>(
        `/search/issues?q=repo:${this.owner}/${this.repo}+${itemId}+is:issue`
      );

      return {
        pullRequests: prs.items || [],
        issues: issues.items || [],
      };
    }
  }

  getMethod(): GitHubMethod {
    return this.method;
  }
}

export function createGitHubClient(): GitHubClient | null {
  try {
    return new GitHubClient();
  } catch (error) {
    return null;
  }
}

export function getGitHubStatus(): {
  method: GitHubMethod;
  ghAvailable: boolean;
  ghAuthenticated: boolean;
  message: string;
} {
  const ghStatus = checkGhCLI();
  const config = loadConfig();

  if (ghStatus.available && ghStatus.authenticated) {
    return {
      method: 'gh-cli',
      ghAvailable: true,
      ghAuthenticated: true,
      message: '✓ GitHub CLI available and authenticated',
    };
  } else if (ghStatus.available && !ghStatus.authenticated) {
    return {
      method: config.github?.token ? 'token' : 'none',
      ghAvailable: true,
      ghAuthenticated: false,
      message: '⚠ GitHub CLI installed but not authenticated. Run: gh auth login',
    };
  } else if (config.github?.token) {
    return {
      method: 'token',
      ghAvailable: false,
      ghAuthenticated: false,
      message: '○ Using token-based authentication (gh CLI not available)',
    };
  } else {
    return {
      method: 'none',
      ghAvailable: false,
      ghAuthenticated: false,
      message: '✗ No GitHub authentication available',
    };
  }
}

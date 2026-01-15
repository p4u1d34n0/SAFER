import simpleGit, { SimpleGit } from 'simple-git';
import { SAFER_DIR, loadConfig } from './data';
import fs from 'fs';
import path from 'path';

let git: SimpleGit | null = null;

// Initialize git instance
export function getGit(): SimpleGit {
  if (!git) {
    git = simpleGit(SAFER_DIR);
  }
  return git;
}

// Check if SAFER directory is a git repository
export async function isGitRepo(): Promise<boolean> {
  try {
    const gitInstance = getGit();
    await gitInstance.status();
    return true;
  } catch {
    return false;
  }
}

// Initialize git repository
export async function initRepo(): Promise<void> {
  const gitInstance = getGit();

  // Check if already initialized
  if (await isGitRepo()) {
    return;
  }

  // Initialize git
  await gitInstance.init();

  // Create .gitignore
  const gitignorePath = path.join(SAFER_DIR, '.gitignore');
  const gitignoreContent = `# SAFER gitignore
.DS_Store
*.log
*.tmp
node_modules/
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);

  // Initial commit
  await gitInstance.add('.gitignore');
  await gitInstance.commit('Initial commit - SAFER framework initialized');
}

// Add and commit changes
export async function commit(message: string, files?: string[]): Promise<void> {
  const config = loadConfig();

  if (!config.git.autoCommit) {
    return;
  }

  const gitInstance = getGit();

  // Check if there are changes to commit
  const status = await gitInstance.status();
  if (status.files.length === 0) {
    return;
  }

  // Add files
  if (files && files.length > 0) {
    await gitInstance.add(files);
  } else {
    await gitInstance.add('.');
  }

  // Commit with prefix
  const fullMessage = `${config.git.commitPrefix} ${message}`;
  await gitInstance.commit(fullMessage);
}

// Push to remote
export async function push(): Promise<void> {
  const config = loadConfig();

  if (!config.git.remoteSync) {
    throw new Error('Remote sync is disabled. Enable it with: safer config set git.remoteSync true');
  }

  const gitInstance = getGit();

  // Check if remote exists
  const remotes = await gitInstance.getRemotes(true);
  if (!remotes.find(r => r.name === config.git.remoteName)) {
    throw new Error(`Remote '${config.git.remoteName}' not configured. Add it with: git remote add ${config.git.remoteName} <url>`);
  }

  // Push
  await gitInstance.push(config.git.remoteName, config.git.remoteBranch);
}

// Pull from remote
export async function pull(): Promise<void> {
  const config = loadConfig();

  if (!config.git.remoteSync) {
    throw new Error('Remote sync is disabled. Enable it with: safer config set git.remoteSync true');
  }

  const gitInstance = getGit();

  // Check if remote exists
  const remotes = await gitInstance.getRemotes(true);
  if (!remotes.find(r => r.name === config.git.remoteName)) {
    throw new Error(`Remote '${config.git.remoteName}' not configured. Add it with: git remote add ${config.git.remoteName} <url>`);
  }

  // Pull with rebase
  await gitInstance.pull(config.git.remoteName, config.git.remoteBranch, { '--rebase': 'true' });
}

// Add remote
export async function addRemote(url: string): Promise<void> {
  const config = loadConfig();
  const gitInstance = getGit();

  // Check if remote already exists
  const remotes = await gitInstance.getRemotes(true);
  if (remotes.find(r => r.name === config.git.remoteName)) {
    throw new Error(`Remote '${config.git.remoteName}' already exists`);
  }

  // Add remote
  await gitInstance.addRemote(config.git.remoteName, url);
}

// Get git log
export async function getLog(count: number = 10) {
  const gitInstance = getGit();
  const log = await gitInstance.log({ maxCount: count });
  return log.all;
}

// Get current branch
export async function getCurrentBranch(): Promise<string> {
  const gitInstance = getGit();
  const status = await gitInstance.status();
  return status.current || 'main';
}

// Check for uncommitted changes
export async function hasUncommittedChanges(): Promise<boolean> {
  const gitInstance = getGit();
  const status = await gitInstance.status();
  return status.files.length > 0;
}

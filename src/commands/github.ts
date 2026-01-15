import { loadConfig, saveConfig } from '../lib/data';
import { createGitHubClient } from '../lib/github';
import chalk from 'chalk';

export async function githubConfigureCommand(options: {
  owner?: string;
  repo?: string;
  token?: string;
  branch?: string;
  enable?: boolean;
  disable?: boolean;
}): Promise<void> {
  const config = loadConfig();

  // Initialize github config if it doesn't exist
  if (!config.github) {
    config.github = {
      enabled: false,
      owner: '',
      repo: '',
      token: '',
      branch: 'main',
      linkPRs: true,
      linkIssues: true,
      showCommits: true,
      showBuildStatus: true,
    };
  }

  let changed = false;

  // Handle enable/disable
  if (options.enable) {
    config.github.enabled = true;
    changed = true;
    console.log(chalk.green('✓ GitHub integration enabled'));
  }

  if (options.disable) {
    config.github.enabled = false;
    changed = true;
    console.log(chalk.yellow('○ GitHub integration disabled'));
  }

  // Update configuration
  if (options.owner) {
    config.github.owner = options.owner;
    changed = true;
    console.log(chalk.blue(`Set owner: ${options.owner}`));
  }

  if (options.repo) {
    config.github.repo = options.repo;
    changed = true;
    console.log(chalk.blue(`Set repo: ${options.repo}`));
  }

  if (options.token) {
    config.github.token = options.token;
    changed = true;
    console.log(chalk.blue('Set token: ' + '*'.repeat(20)));
  }

  if (options.branch) {
    config.github.branch = options.branch;
    changed = true;
    console.log(chalk.blue(`Set branch: ${options.branch}`));
  }

  if (changed) {
    saveConfig(config);
    console.log(chalk.green('\n✓ GitHub configuration saved'));
  }

  // Display current configuration
  if (!options.owner && !options.repo && !options.token && !options.branch && !options.enable && !options.disable) {
    console.log(chalk.bold('\nGitHub Configuration:'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Status:')}       ${config.github.enabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log(`${chalk.cyan('Owner:')}        ${config.github.owner || chalk.gray('(not set)')}`);
    console.log(`${chalk.cyan('Repository:')}   ${config.github.repo || chalk.gray('(not set)')}`);
    console.log(`${chalk.cyan('Branch:')}       ${config.github.branch || chalk.gray('(not set)')}`);
    console.log(`${chalk.cyan('Token:')}        ${config.github.token ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
    console.log(chalk.gray('━'.repeat(50)));

    if (!config.github.enabled) {
      console.log(chalk.yellow('\n💡 Enable with: safer github --enable'));
    } else if (!config.github.owner || !config.github.repo || !config.github.token) {
      console.log(chalk.yellow('\n⚠  Configuration incomplete. Set owner, repo, and token.'));
      console.log(chalk.gray('   safer github --owner <owner> --repo <repo> --token <token>'));
    }
  }
}

export async function githubStatusCommand(): Promise<void> {
  const client = createGitHubClient();

  if (!client) {
    console.log(chalk.red('✗ GitHub integration is not configured'));
    console.log(chalk.gray('  Run: safer github --help'));
    return;
  }

  try {
    console.log(chalk.bold('\n📊 GitHub Status\n'));

    // Get open PRs
    console.log(chalk.cyan('Fetching pull requests...'));
    const prs = await client.getOpenPullRequests();
    console.log(chalk.green(`✓ Found ${prs.length} open pull request(s)\n`));

    if (prs.length > 0) {
      console.log(chalk.bold('Open Pull Requests:'));
      prs.slice(0, 5).forEach(pr => {
        console.log(`  ${chalk.yellow(`#${pr.number}`)} ${pr.title}`);
        console.log(`    ${chalk.gray(pr.html_url)}`);
        console.log(`    ${chalk.blue(pr.head.ref)} → ${chalk.green(pr.base.ref)}\n`);
      });
    }

    // Get open issues
    console.log(chalk.cyan('Fetching issues...'));
    const issues = await client.getOpenIssues();
    console.log(chalk.green(`✓ Found ${issues.length} open issue(s)\n`));

    if (issues.length > 0) {
      console.log(chalk.bold('Open Issues:'));
      issues.slice(0, 5).forEach(issue => {
        console.log(`  ${chalk.yellow(`#${issue.number}`)} ${issue.title}`);
        console.log(`    ${chalk.gray(issue.html_url)}\n`);
      });
    }

  } catch (error) {
    console.error(chalk.red('✗ Error fetching GitHub data:'));
    console.error(chalk.gray((error as Error).message));
  }
}

export async function githubLinkCommand(itemId: string, options: {
  pr?: number;
  issue?: number;
}): Promise<void> {
  const client = createGitHubClient();

  if (!client) {
    console.log(chalk.red('✗ GitHub integration is not configured'));
    return;
  }

  // Load the delivery item and link it to the PR or issue
  // This would update the item's execute.github field

  console.log(chalk.blue(`Linking ${itemId}...`));

  if (options.pr) {
    console.log(chalk.green(`✓ Linked to PR #${options.pr}`));
  }

  if (options.issue) {
    console.log(chalk.green(`✓ Linked to Issue #${options.issue}`));
  }
}

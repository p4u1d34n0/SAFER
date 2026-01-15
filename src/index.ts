#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { isInitialized } from './lib/data';

// Import commands (will implement these next)
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { showCommand } from './commands/show';
import { dodCommand } from './commands/dod';
import { completeCommand } from './commands/complete';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';
import { importCommand, importListCommand } from './commands/import';
import { githubConfigureCommand, githubStatusCommand } from './commands/github';
import { purgeAllCommand } from './commands/purge';

const program = new Command();

program
  .name('safer')
  .description('SAFER Framework - Personal productivity and leadership development system')
  .version('1.0.0');

// Init command - doesn't require initialization
program
  .command('init')
  .description('Initialize SAFER system')
  .option('-r, --remote <url>', 'Git remote URL for syncing')
  .option('-y, --yes', 'Use default configuration without prompts')
  .action(initCommand);

// Status command - can run before init to show system status
program
  .command('status')
  .description('Show SAFER system status')
  .option('-v, --verbose', 'Show detailed status')
  .action(statusCommand);

// Config command - requires initialization
program
  .command('config')
  .description('Manage SAFER configuration')
  .argument('[key]', 'Configuration key to get/set (e.g., limits.maxWIP)')
  .argument('[value]', 'Value to set (omit to get current value)')
  .action(configCommand);

// Create command
program
  .command('create')
  .description('Create a new delivery item')
  .argument('[title]', 'Delivery item title')
  .option('-d, --description <desc>', 'Detailed description')
  .option('-t, --timebox <minutes>', 'Time box in minutes', '90')
  .action(requireInit(createCommand));

// List command
program
  .command('list')
  .alias('ls')
  .description('List active delivery items')
  .option('-a, --all', 'Include archived items')
  .option('--json', 'Output as JSON')
  .action(requireInit(listCommand));

// Show command
program
  .command('show')
  .description('Show delivery item details')
  .argument('<id>', 'Delivery item ID (e.g., DI-001)')
  .option('--json', 'Output as JSON')
  .action(requireInit(showCommand));

// DoD command
program
  .command('dod')
  .description('Manage Definition of Done')
  .argument('<id>', 'Delivery item ID')
  .option('--add <text>', 'Add a DoD item')
  .option('--check <dod-id>', 'Check off a DoD item')
  .option('--uncheck <dod-id>', 'Uncheck a DoD item')
  .option('--check-complete', 'Check if all DoD items are complete (exit 0 if complete)')
  .option('--json', 'Output as JSON')
  .action(requireInit(dodCommand));

// Complete command
program
  .command('complete')
  .description('Mark delivery item as complete')
  .argument('<id>', 'Delivery item ID')
  .option('--stress <level>', 'Stress level (1-5)', '3')
  .option('--archive', 'Archive immediately after completing')
  .action(requireInit(completeCommand));

// Archive command
program
  .command('archive')
  .description('Archive a delivery item')
  .argument('<id>', 'Delivery item ID')
  .action(requireInit(async (id: string) => {
    const { getItem, archiveItem, loadConfig, checkWipLimit } = await import('./lib/data');
    const { commit } = await import('./lib/git');
    const { default: ora } = await import('ora');
    const { default: inquirer } = await import('inquirer');

    const item = getItem(id);
    if (!item) {
      console.error(chalk.red(`Error: Item ${id} not found`));
      process.exit(1);
    }

    const spinner = ora(`Archiving ${id}`).start();
    archiveItem(item);
    await commit(`Archived ${id}: ${item.scope.title}`);
    spinner.succeed(chalk.green(`Archived ${id}`));

    // Offer to import from GitHub if configured
    const config = loadConfig();

    if (config.github?.enabled) {
      const wipCheck = checkWipLimit();

      if (wipCheck.currentWip < wipCheck.maxWip) {
        console.log();
        const { importNew } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'importNew',
            message: `Import a new item from GitHub? (${wipCheck.maxWip - wipCheck.currentWip} slot${wipCheck.maxWip - wipCheck.currentWip > 1 ? 's' : ''} available)`,
            default: true,
          },
        ]);

        if (importNew) {
          console.log();
          const { createGitHubImporter } = await import('./lib/importers/github');
          const importer = createGitHubImporter();

          try {
            const result = await importer.import({ limit: 1 });

            if (result.success && result.imported > 0) {
              console.log(chalk.green(`\n✓ Imported ${result.items[0].id}: ${result.items[0].scope.title}`));
            } else if (result.errors.length > 0) {
              console.log(chalk.yellow(`\n⚠ ${result.errors[0]}`));
            }
          } catch (error) {
            console.log(chalk.yellow(`\n⚠ Could not import: ${error instanceof Error ? error.message : error}`));
          }
        }
      }
    }
  }));

// Delete command
program
  .command('delete')
  .description('Delete a delivery item')
  .argument('<id>', 'Delivery item ID')
  .option('-f, --force', 'Skip confirmation')
  .action(requireInit(async (id: string, options: any) => {
    const { getItem, deleteItem } = await import('./lib/data');
    const { commit } = await import('./lib/git');
    const { default: inquirer } = await import('inquirer');
    const { default: ora } = await import('ora');

    const item = getItem(id);
    if (!item) {
      console.error(chalk.red(`Error: Item ${id} not found`));
      process.exit(1);
    }

    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Delete ${id}: ${item.scope.title}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
    }

    const spinner = ora(`Deleting ${id}`).start();
    deleteItem(id);
    await commit(`Deleted ${id}: ${item.scope.title}`);
    spinner.succeed(chalk.green(`Deleted ${id}`));
  }));

// WIP command
program
  .command('wip')
  .description('Show WIP status')
  .action(requireInit(async () => {
    const { checkWipLimit, listActiveItems, loadConfig } = await import('./lib/data');
    const config = loadConfig();
    const wipStatus = checkWipLimit();
    const items = listActiveItems();

    console.log(chalk.bold('\nWIP Status'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Current WIP: ${chalk.cyan(wipStatus.currentWip)} / ${chalk.cyan(wipStatus.maxWip)}`);
    console.log(`Status: ${wipStatus.isWithinLimit ? chalk.green('✓ Within limit') : chalk.red('✗ Over limit')}`);

    if (items.length > 0) {
      console.log(chalk.bold('\nActive Items:'));
      items.forEach(item => {
        const dodComplete = item.fence.definitionOfDone.filter(d => d.completed).length;
        const dodTotal = item.fence.definitionOfDone.length;
        console.log(`  ${chalk.cyan(`[${item.id}]`)} ${item.scope.title}`);
        console.log(`  ${chalk.gray(`  DoD: ${dodComplete}/${dodTotal} | Slot: ${item.fence.wipSlot}`)}`);
      });
    }
    console.log();
  }));

// Import command
program
  .command('import')
  .description('Import items from external platforms')
  .argument('<source>', 'Source platform (github, jira, bitbucket, monday)')
  .option('--assigned-to-me', 'Only import items assigned to you')
  .option('--label <label>', 'Filter by label')
  .option('--state <state>', 'Filter by state (open, closed, all)', 'open')
  .option('--limit <number>', 'Maximum number of items to import', '10')
  .option('--dry-run', 'Preview items without importing')
  .action(requireInit(importCommand));

// Import list subcommand
program
  .command('import:list')
  .description('List available items from external platform')
  .argument('<source>', 'Source platform')
  .action(requireInit(importListCommand));

// GitHub command
program
  .command('github')
  .description('Manage GitHub integration')
  .option('--owner <owner>', 'GitHub repository owner/organization')
  .option('--repo <repo>', 'GitHub repository name')
  .option('--token <token>', 'GitHub Personal Access Token')
  .option('--branch <branch>', 'Default branch (default: main)')
  .option('--enable', 'Enable GitHub integration')
  .option('--disable', 'Disable GitHub integration')
  .action(githubConfigureCommand);

// GitHub status subcommand
program
  .command('github:status')
  .description('Show GitHub connection status and open PRs/issues')
  .action(githubStatusCommand);

// Purge all command
program
  .command('purge-all')
  .description('Delete all delivery items, archives, reviews, and metrics')
  .option('-f, --force', 'Skip confirmation prompts (dangerous!)')
  .action(requireInit(purgeAllCommand));

// Middleware to require initialization
function requireInit(fn: (...args: any[]) => any) {
  return async (...args: any[]) => {
    if (!isInitialized()) {
      console.error(chalk.red('Error: SAFER not initialized'));
      console.log(chalk.yellow('Run: safer init'));
      process.exit(1);
    }
    return fn(...args);
  };
}

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

// Parse arguments
program.parse();

import { ACTIVE_DIR, ARCHIVE_DIR, ensureDir, loadConfig } from '../lib/data';
import { commit } from '../lib/git';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

export async function purgeAllCommand(options: { force?: boolean }): Promise<void> {
  console.log(chalk.bold.red('\n⚠️  DANGER: Purge All Data\n'));
  console.log(chalk.yellow('This will permanently delete:'));
  console.log('  • All active delivery items');
  console.log('  • All archived items');
  console.log('  • All reviews');
  console.log('  • All metrics');
  console.log(chalk.gray('\nConfiguration will be preserved.\n'));

  // Confirmation
  if (!options.force) {
    const { confirmText } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmText',
        message: 'Type "PURGE ALL" to confirm deletion:',
      },
    ]);

    if (confirmText !== 'PURGE ALL') {
      console.log(chalk.yellow('\n✗ Purge cancelled'));
      return;
    }

    const { finalConfirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'finalConfirm',
        message: 'Are you absolutely sure? This cannot be undone.',
        default: false,
      },
    ]);

    if (!finalConfirm) {
      console.log(chalk.yellow('\n✗ Purge cancelled'));
      return;
    }
  }

  const spinner = ora('Purging all data...').start();

  try {
    const config = loadConfig();
    const dataDir = path.join(path.dirname(ACTIVE_DIR), '..');

    // Delete all files in active directory
    if (fs.existsSync(ACTIVE_DIR)) {
      const activeFiles = fs.readdirSync(ACTIVE_DIR);
      for (const file of activeFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(ACTIVE_DIR, file));
        }
      }
    }

    // Delete all files in archive directory (recursively)
    if (fs.existsSync(ARCHIVE_DIR)) {
      fs.rmSync(ARCHIVE_DIR, { recursive: true, force: true });
      ensureDir(ARCHIVE_DIR);
    }

    // Delete reviews directory
    const reviewsDir = path.join(dataDir, 'reviews');
    if (fs.existsSync(reviewsDir)) {
      fs.rmSync(reviewsDir, { recursive: true, force: true });
      ensureDir(reviewsDir);
    }

    // Delete metrics directory
    const metricsDir = path.join(dataDir, 'metrics');
    if (fs.existsSync(metricsDir)) {
      fs.rmSync(metricsDir, { recursive: true, force: true });
      ensureDir(metricsDir);
    }

    // Commit the purge
    await commit('[SAFER] Purged all data - clean slate');

    spinner.succeed(chalk.green('✓ All data purged successfully'));

    console.log(chalk.cyan('\n📊 SAFER is now empty'));
    console.log(chalk.gray('Configuration preserved at ~/.safer/config.json'));
    console.log(chalk.gray('\nYou can now import fresh items from GitHub:'));
    console.log(chalk.cyan('  safer import github --dry-run'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to purge data'));
    console.error(chalk.gray((error as Error).message));
    process.exit(1);
  }
}

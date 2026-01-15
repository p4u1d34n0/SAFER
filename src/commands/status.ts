import chalk from 'chalk';
import { isInitialized, loadConfig, listActiveItems, checkWipLimit, SAFER_DIR } from '../lib/data';
import { isGitRepo, hasUncommittedChanges } from '../lib/git';

export async function statusCommand(options: { verbose?: boolean }) {
  console.log(chalk.bold.cyan('\n📊 SAFER Status\n'));

  if (!isInitialized()) {
    console.log(chalk.yellow('Status:'), chalk.red('Not initialized'));
    console.log(chalk.gray('\nRun:'), chalk.yellow('safer init'));
    return;
  }

  const config = loadConfig();
  const activeItems = listActiveItems();
  const wipStatus = checkWipLimit();
  const isGit = await isGitRepo();
  const hasChanges = isGit ? await hasUncommittedChanges() : false;

  // Basic status
  console.log(chalk.cyan('Location:'), SAFER_DIR);
  console.log(chalk.cyan('User:'), `${config.user.name} <${config.user.email}>`);
  console.log();

  // WIP status
  console.log(chalk.bold('Work In Progress'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Active Items:'), `${wipStatus.currentWip} / ${wipStatus.maxWip}`);

  const wipPercent = (wipStatus.currentWip / wipStatus.maxWip) * 100;
  const wipBar = '█'.repeat(Math.floor(wipPercent / 10)) + '░'.repeat(10 - Math.floor(wipPercent / 10));
  console.log(chalk.cyan('Capacity:'), wipBar, `${Math.round(wipPercent)}%`);

  if (wipStatus.isWithinLimit) {
    console.log(chalk.cyan('Status:'), chalk.green('✓ Within limit'));
  } else {
    console.log(chalk.cyan('Status:'), chalk.red('✗ Over limit'));
  }
  console.log();

  // Active items summary
  if (activeItems.length > 0) {
    console.log(chalk.bold('Active Items'));
    console.log(chalk.gray('─'.repeat(50)));
    activeItems.forEach(item => {
      const dodComplete = item.fence.definitionOfDone.filter(d => d.completed).length;
      const dodTotal = item.fence.definitionOfDone.length;
      const dodPercent = dodTotal > 0 ? Math.round((dodComplete / dodTotal) * 100) : 0;

      console.log(chalk.cyan(`[${item.id}]`), chalk.bold(item.scope.title));
      console.log(chalk.gray(`  Slot ${item.fence.wipSlot} | DoD: ${dodComplete}/${dodTotal} (${dodPercent}%) | Stress: ${item.review.stressLevel}/5`));
    });
    console.log();
  }

  // Git status
  console.log(chalk.bold('Git Repository'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Initialized:'), isGit ? chalk.green('Yes') : chalk.red('No'));
  if (isGit) {
    console.log(chalk.cyan('Auto-commit:'), config.git.autoCommit ? chalk.green('Enabled') : chalk.gray('Disabled'));
    console.log(chalk.cyan('Uncommitted changes:'), hasChanges ? chalk.yellow('Yes') : chalk.green('None'));
    console.log(chalk.cyan('Remote sync:'), config.git.remoteSync ? chalk.green('Enabled') : chalk.gray('Disabled'));
  }
  console.log();

  // Integrations
  console.log(chalk.bold('Integrations'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Calendar:'), config.calendar.enabled ? chalk.green('Enabled') : chalk.gray('Disabled'));
  console.log(chalk.cyan('Git Hooks:'), config.hooks.enabled ? chalk.green('Enabled') : chalk.gray('Disabled'));
  console.log(chalk.cyan('Dashboard Port:'), config.dashboard.port);
  console.log();

  // Verbose information
  if (options.verbose) {
    console.log(chalk.bold('Configuration'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('Max WIP:'), config.limits.maxWIP);
    console.log(chalk.cyan('Default Time Box:'), `${config.limits.defaultTimeBox} minutes`);
    console.log(chalk.cyan('Review Frequency:'), config.limits.reviewFrequency);
    console.log(chalk.cyan('Calendar Name:'), config.calendar.calendarName);
    console.log(chalk.cyan('Review Day:'), `${config.calendar.reviewDay} at ${config.calendar.reviewTime}`);
    console.log();

    if (config.hooks.repositories.length > 0) {
      console.log(chalk.bold('Monitored Repositories'));
      console.log(chalk.gray('─'.repeat(50)));
      config.hooks.repositories.forEach(repo => {
        console.log(chalk.gray('•'), repo);
      });
      console.log();
    }
  }

  // Quick actions
  if (wipStatus.isWithinLimit && wipStatus.currentWip < wipStatus.maxWip) {
    console.log(chalk.gray('💡 You have capacity for'), chalk.cyan(wipStatus.maxWip - wipStatus.currentWip), chalk.gray('more item(s)'));
    console.log(chalk.gray('   Run:'), chalk.yellow('safer create "<description>"'));
  } else if (!wipStatus.isWithinLimit) {
    console.log(chalk.yellow('⚠️  WIP limit exceeded. Complete an item before starting new work.'));
  }
  console.log();
}

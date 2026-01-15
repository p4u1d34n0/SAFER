import chalk from 'chalk';
import { listActiveItems, listArchivedItems } from '../lib/data';

export async function listCommand(options: { all?: boolean; json?: boolean }) {
  const activeItems = listActiveItems();
  const archivedItems = options.all ? listArchivedItems() : [];

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      active: activeItems,
      archived: archivedItems,
    }, null, 2));
    return;
  }

  // Active items
  console.log(chalk.bold.cyan('\n📋 Active Delivery Items\n'));

  if (activeItems.length === 0) {
    console.log(chalk.gray('No active items'));
    console.log(chalk.gray('\nCreate one with:'), chalk.yellow('safer create "<description>"'));
    console.log();
    return;
  }

  activeItems.forEach(item => {
    const dodComplete = item.fence.definitionOfDone.filter(d => d.completed).length;
    const dodTotal = item.fence.definitionOfDone.length;
    const dodPercent = dodTotal > 0 ? Math.round((dodComplete / dodTotal) * 100) : 0;

    // Status indicators
    const dodStatus = dodPercent === 100 ? chalk.green('●') : dodPercent > 0 ? chalk.yellow('◐') : chalk.gray('○');
    const stressColor = item.review.stressLevel >= 4 ? chalk.red : item.review.stressLevel >= 3 ? chalk.yellow : chalk.green;
    const stressIndicator = stressColor('█'.repeat(item.review.stressLevel) + '░'.repeat(5 - item.review.stressLevel));

    // Build title with GitHub issue reference if available
    let titleDisplay = item.scope.title;
    if (item.execute?.github?.issues && item.execute.github.issues.length > 0) {
      const githubIssue = item.execute.github.issues[0];
      titleDisplay = `${chalk.gray(`[GitHub #${githubIssue}]`)} ${item.scope.title}`;
    }

    console.log(chalk.cyan(`[${item.id}]`), chalk.bold(titleDisplay));
    console.log(chalk.gray('  Slot:'), item.fence.wipSlot, chalk.gray('| DoD:'), `${dodStatus} ${dodComplete}/${dodTotal} (${dodPercent}%)`, chalk.gray('| Stress:'), stressIndicator);

    if (item.scope.when) {
      const dueDate = new Date(item.scope.when);
      const now = new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let dueText = '';
      if (daysUntil < 0) {
        dueText = chalk.red(`${Math.abs(daysUntil)}d overdue`);
      } else if (daysUntil === 0) {
        dueText = chalk.yellow('Due today');
      } else if (daysUntil <= 3) {
        dueText = chalk.yellow(`Due in ${daysUntil}d`);
      } else {
        dueText = chalk.gray(`Due in ${daysUntil}d`);
      }

      console.log(chalk.gray('  Due:'), dueText, chalk.gray(`(${item.scope.when})`));
    }

    if (item.review.blockers.length > 0) {
      console.log(chalk.red('  ⚠'), chalk.red(`${item.review.blockers.length} blocker(s)`));
    }

    console.log();
  });

  // Archived items
  if (options.all && archivedItems.length > 0) {
    console.log(chalk.bold.cyan('📦 Archived Items\n'));

    // Show only recent 10
    const recentArchived = archivedItems.slice(0, 10);

    recentArchived.forEach(item => {
      const completedDate = new Date(item.updated).toLocaleDateString();
      console.log(chalk.gray(`[${item.id}]`), item.scope.title, chalk.gray(`(${completedDate})`));
    });

    if (archivedItems.length > 10) {
      console.log(chalk.gray(`\n... and ${archivedItems.length - 10} more`));
    }
    console.log();
  }

  // Summary
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Active:'), activeItems.length, chalk.gray('|'), chalk.cyan('Archived:'), archivedItems.length);
  console.log();
}

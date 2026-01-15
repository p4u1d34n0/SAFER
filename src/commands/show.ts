import chalk from 'chalk';
import { getItem } from '../lib/data';

export async function showCommand(id: string, options: { json?: boolean }) {
  const item = getItem(id);

  if (!item) {
    console.error(chalk.red(`Error: Item ${id} not found`));
    process.exit(1);
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(item, null, 2));
    return;
  }

  // Display item
  console.log(chalk.bold.cyan(`\n📄 ${item.id}: ${item.scope.title}\n`));
  console.log(chalk.gray('─'.repeat(70)));

  // Status
  const statusColor = item.status === 'completed' ? chalk.green : item.status === 'active' ? chalk.cyan : chalk.gray;
  console.log(chalk.bold('Status:'), statusColor(item.status.toUpperCase()));
  console.log(chalk.gray('Created:'), new Date(item.created).toLocaleString());
  console.log(chalk.gray('Updated:'), new Date(item.updated).toLocaleString());
  console.log();

  // Scope
  console.log(chalk.bold('Scope'));
  console.log(chalk.gray('─'.repeat(70)));
  if (item.scope.description) {
    console.log(chalk.white(item.scope.description));
    console.log();
  }
  console.log(chalk.cyan('Outcome:'), item.scope.outcome || chalk.gray('(not specified)'));
  console.log(chalk.cyan('For whom:'), item.scope.who || chalk.gray('(not specified)'));
  console.log(chalk.cyan('When:'), item.scope.when || chalk.gray('(not specified)'));
  console.log();

  // Definition of Done
  console.log(chalk.bold('Definition of Done'));
  console.log(chalk.gray('─'.repeat(70)));

  if (item.fence.definitionOfDone.length === 0) {
    console.log(chalk.gray('No DoD items defined'));
    console.log(chalk.gray('Add with:'), chalk.yellow(`safer dod ${id} --add "<item>"`));
  } else {
    item.fence.definitionOfDone.forEach(dod => {
      const checkbox = dod.completed ? chalk.green('☑') : chalk.gray('☐');
      console.log(`  ${checkbox} ${dod.text}`, dod.id ? chalk.gray(`[${dod.id}]`) : '');
      if (dod.completed && dod.completedAt) {
        console.log(chalk.gray(`     Completed: ${new Date(dod.completedAt).toLocaleString()}`));
      }
    });

    const completed = item.fence.definitionOfDone.filter(d => d.completed).length;
    const total = item.fence.definitionOfDone.length;
    const percent = Math.round((completed / total) * 100);

    console.log();
    console.log(chalk.cyan('Progress:'), `${completed}/${total} (${percent}%)`);
  }
  console.log();

  // Time Tracking
  console.log(chalk.bold('Time Tracking'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.cyan('Time Box:'), `${item.fence.timeBox.duration} minutes`);
  console.log(chalk.cyan('WIP Slot:'), item.fence.wipSlot);

  if (item.fence.timeBox.sessions.length > 0) {
    console.log(chalk.cyan('Focus Sessions:'), item.fence.timeBox.sessions.length);
    item.fence.timeBox.sessions.forEach((session, index) => {
      const start = new Date(session.start).toLocaleString();
      const end = new Date(session.end).toLocaleString();
      console.log(chalk.gray(`  ${index + 1}.`), `${start} → ${end} (${session.actualMinutes} min)`);
      if (session.interruptions > 0) {
        console.log(chalk.gray(`     Interruptions: ${session.interruptions}`));
      }
    });
  } else {
    console.log(chalk.gray('No focus sessions logged'));
  }
  console.log();

  // Execution
  console.log(chalk.bold('Execution'));
  console.log(chalk.gray('─'.repeat(70)));

  if (item.execute.branches.length > 0) {
    console.log(chalk.cyan('Branches:'), item.execute.branches.join(', '));
  }

  if (item.execute.commits.length > 0) {
    console.log(chalk.cyan('Commits:'), item.execute.commits.length);
    item.execute.commits.slice(0, 5).forEach(commit => {
      console.log(chalk.gray('  •'), chalk.gray(commit.substring(0, 8)));
    });
    if (item.execute.commits.length > 5) {
      console.log(chalk.gray(`  ... and ${item.execute.commits.length - 5} more`));
    }
  }

  if (item.execute.workLog.length > 0) {
    console.log(chalk.cyan('Work Log:'));
    item.execute.workLog.slice(-5).forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      console.log(chalk.gray('  •'), chalk.gray(time), log.action);
      if (log.notes) {
        console.log(chalk.gray(`     ${log.notes}`));
      }
    });
  }

  if (item.execute.branches.length === 0 && item.execute.commits.length === 0 && item.execute.workLog.length === 0) {
    console.log(chalk.gray('No execution data logged'));
  }
  console.log();

  // Review
  console.log(chalk.bold('Review'));
  console.log(chalk.gray('─'.repeat(70)));

  const stressColor = item.review.stressLevel >= 4 ? chalk.red : item.review.stressLevel >= 3 ? chalk.yellow : chalk.green;
  const stressBar = '█'.repeat(item.review.stressLevel) + '░'.repeat(5 - item.review.stressLevel);
  console.log(chalk.cyan('Stress Level:'), stressColor(stressBar), `(${item.review.stressLevel}/5)`);
  console.log(chalk.cyan('Incidents:'), item.review.incidents);

  if (item.review.blockers.length > 0) {
    console.log(chalk.cyan('Blockers:'));
    item.review.blockers.forEach(blocker => {
      console.log(chalk.red('  ⚠'), blocker);
    });
  }

  if (item.review.learnings.length > 0) {
    console.log(chalk.cyan('Learnings:'));
    item.review.learnings.forEach(learning => {
      console.log(chalk.gray('  •'), learning);
    });
  }

  if (item.review.nextActions.length > 0) {
    console.log(chalk.cyan('Next Actions:'));
    item.review.nextActions.forEach(action => {
      console.log(chalk.gray('  →'), action);
    });
  }
  console.log();

  // Metrics
  console.log(chalk.bold('Metrics'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(chalk.cyan('Cycle Time:'), item.metrics.cycleTime !== null ? `${item.metrics.cycleTime} days` : chalk.gray('(in progress)'));
  console.log(chalk.cyan('Time Spent:'), `${item.metrics.actualTimeSpent} / ${item.metrics.plannedTimeSpent} min`);

  if (item.metrics.actualTimeSpent > 0) {
    const timePercent = Math.round((item.metrics.actualTimeSpent / item.metrics.plannedTimeSpent) * 100);
    console.log(chalk.cyan('Time Usage:'), `${timePercent}%`);
  }

  console.log();
  console.log(chalk.gray('─'.repeat(70)));
  console.log();
}

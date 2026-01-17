import chalk from 'chalk';
import ora from 'ora';
import { getItem, saveItem } from '../lib/data';

export async function startCommand(id: string) {
  console.log(chalk.bold.cyan('\n⏱️  Start Focus Block\n'));

  const spinner = ora('Loading item').start();

  try {
    const item = getItem(id);

    if (!item) {
      spinner.fail(chalk.red(`Item ${id} not found`));
      process.exit(1);
    }

    // Check if there's already an active session
    const hasActiveSession = item.fence.timeBox.sessions.some(
      (session: any) => !session.end
    );

    if (hasActiveSession) {
      spinner.fail(chalk.red(`Focus block already active for ${id}`));
      console.log(chalk.yellow('\nStop the current session first with:'), chalk.cyan(`safer stop`));
      process.exit(1);
    }

    // Start new session
    const now = new Date().toISOString();
    item.fence.timeBox.sessions.push({
      start: now,
      end: null,
      duration: null,
      notes: '',
    });

    item.updated = now;
    saveItem(item);

    spinner.succeed(chalk.green('Focus block started'));

    // Display session info
    console.log(chalk.bold('\n🎯 Focus Session Active\n'));
    console.log(chalk.cyan('Item:'), item.scope.title);
    console.log(chalk.cyan('Started:'), new Date(now).toLocaleTimeString());
    console.log(chalk.cyan('Time Box:'), `${item.fence.timeBox.duration} minutes`);
    console.log();
    console.log(chalk.gray('Stay focused! Run'), chalk.yellow('safer stop'), chalk.gray('when complete.'));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to start focus block'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

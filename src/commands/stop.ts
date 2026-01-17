import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { listActiveItems, getItem, saveItem } from '../lib/data';

export async function stopCommand() {
  console.log(chalk.bold.cyan('\n⏹️  Stop Focus Block\n'));

  const spinner = ora('Finding active session').start();

  try {
    // Find item with active session
    const activeItems = listActiveItems();
    let activeItem = null;
    let activeSession = null;

    for (const item of activeItems) {
      const session = item.fence.timeBox.sessions.find((s: any) => !s.end);
      if (session) {
        activeItem = item;
        activeSession = session;
        break;
      }
    }

    if (!activeItem || !activeSession) {
      spinner.fail(chalk.red('No active focus session found'));
      console.log(chalk.gray('\nStart a focus block with:'), chalk.yellow('safer start <id>'));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Active session found'));

    // Calculate duration
    const now = new Date().toISOString();
    const start = new Date(activeSession.start);
    const end = new Date(now);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    console.log(chalk.bold('\n⏱️  Session Summary\n'));
    console.log(chalk.cyan('Item:'), activeItem.scope.title);
    console.log(chalk.cyan('Started:'), start.toLocaleTimeString());
    console.log(chalk.cyan('Duration:'), `${durationMinutes} minutes`);
    console.log();

    // Ask for notes
    const { notes } = await inquirer.prompt([
      {
        type: 'input',
        name: 'notes',
        message: 'Session notes (optional):',
        default: '',
      },
    ]);

    // Update session
    activeSession.end = now;
    activeSession.duration = durationMinutes;
    activeSession.notes = notes;

    activeItem.updated = now;
    saveItem(activeItem);

    console.log(chalk.green('\n✓ Focus session completed\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to stop focus block'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

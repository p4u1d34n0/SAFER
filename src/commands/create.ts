import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  generateNextId,
  saveItem,
  getNextWipSlot,
  checkWipLimit,
  loadConfig,
  listActiveItems,
} from '../lib/data';
import { commit } from '../lib/git';
import { DeliveryItem } from '../lib/types';

export async function createCommand(
  title?: string,
  options?: { description?: string; timebox?: string }
) {
  console.log(chalk.bold.cyan('\n📝 Create Delivery Item\n'));

  // Check WIP limit
  const wipStatus = checkWipLimit();
  if (!wipStatus.isWithinLimit) {
    console.log(chalk.red(`✗ WIP limit reached (${wipStatus.currentWip}/${wipStatus.maxWip})`));
    console.log(chalk.yellow('\nYou must complete an existing item before creating a new one.'));
    console.log(chalk.gray('Active items:'));

    const activeItems = listActiveItems();
    activeItems.forEach(item => {
      console.log(chalk.gray('  •'), chalk.cyan(`[${item.id}]`), item.scope.title);
    });

    console.log();
    console.log(chalk.gray('Run: safer complete <id>'));
    process.exit(1);
  }

  const config = loadConfig();

  // Interactive prompts if title not provided
  if (!title) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Delivery item title:',
        validate: (input) => input.length > 0 || 'Title is required',
      },
    ]);
    title = answers.title;
  }

  // Get additional details
  const details = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):',
      default: options?.description || '',
    },
    {
      type: 'input',
      name: 'outcome',
      message: 'Desired outcome:',
      default: '',
    },
    {
      type: 'input',
      name: 'who',
      message: 'For whom (stakeholders):',
      default: config.user.name,
    },
    {
      type: 'input',
      name: 'when',
      message: 'When needed (date):',
      default: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      type: 'number',
      name: 'timebox',
      message: 'Time box (minutes):',
      default: parseInt(options?.timebox || String(config.limits.defaultTimeBox)),
    },
    {
      type: 'confirm',
      name: 'addDod',
      message: 'Add Definition of Done items now?',
      default: true,
    },
  ]);

  // Collect DoD items
  const dodItems: string[] = [];
  if (details.addDod) {
    let addMore = true;
    console.log(chalk.gray('\nEnter Definition of Done items (empty line to finish):'));

    while (addMore) {
      const { dodItem } = await inquirer.prompt([
        {
          type: 'input',
          name: 'dodItem',
          message: `DoD item ${dodItems.length + 1}:`,
        },
      ]);

      if (dodItem.trim()) {
        dodItems.push(dodItem.trim());
      } else {
        addMore = false;
      }
    }
  }

  // Create delivery item
  const spinner = ora('Creating delivery item').start();

  try {
    const id = generateNextId();
    const wipSlot = getNextWipSlot();
    const now = new Date().toISOString();

    const item: DeliveryItem = {
      id,
      version: '1.0.0',
      created: now,
      updated: now,
      status: 'active',
      scope: {
        title: title!,
        description: details.description,
        outcome: details.outcome,
        who: details.who,
        when: details.when,
      },
      align: {
        objectives: [],
        stakeholders: details.who ? [details.who] : [],
        dependencies: [],
        value: details.outcome || '',
      },
      fence: {
        timeBox: {
          duration: details.timebox,
          unit: 'minutes',
          sessions: [],
        },
        definitionOfDone: dodItems.map((text, index) => ({
          id: `dod-${index + 1}`,
          text,
          completed: false,
          completedAt: null,
        })),
        wipSlot,
      },
      execute: {
        commits: [],
        branches: [],
        workLog: [],
      },
      review: {
        stressLevel: 3,
        incidents: 0,
        blockers: [],
        learnings: [],
        nextActions: [],
      },
      metrics: {
        cycleTime: null,
        completionRate: 0,
        actualTimeSpent: 0,
        plannedTimeSpent: details.timebox,
      },
    };

    saveItem(item);
    await commit(`Created ${id}: ${title}`);

    spinner.succeed(chalk.green(`Created ${id}: ${title}`));

    // Summary
    console.log(chalk.bold('\n✓ Delivery Item Created\n'));
    console.log(chalk.cyan('ID:'), id);
    console.log(chalk.cyan('Title:'), title);
    console.log(chalk.cyan('WIP Slot:'), `${wipSlot}/${config.limits.maxWIP}`);
    console.log(chalk.cyan('Time Box:'), `${details.timebox} minutes`);
    console.log(chalk.cyan('Due:'), details.when);

    if (dodItems.length > 0) {
      console.log(chalk.cyan('DoD Items:'), dodItems.length);
      dodItems.forEach((text, index) => {
        console.log(chalk.gray(`  ${index + 1}.`), text);
      });
    }

    // Next steps
    console.log(chalk.bold('\nNext Steps:'));
    console.log(chalk.gray('•'), 'View details:', chalk.yellow(`safer show ${id}`));
    console.log(chalk.gray('•'), 'Add DoD items:', chalk.yellow(`safer dod ${id} --add "<item>"`));
    console.log(chalk.gray('•'), 'Start focus block:', chalk.yellow(`safer start ${id}`));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to create delivery item'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

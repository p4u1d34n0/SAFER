import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getItem, saveItem, archiveItem } from '../lib/data';
import { commit } from '../lib/git';

export async function completeCommand(
  id: string,
  options: { stress?: string; learnings?: string; incidents?: string; archive?: boolean; yes?: boolean }
) {
  const item = getItem(id);

  if (!item) {
    console.error(chalk.red(`Error: Item ${id} not found`));
    process.exit(1);
  }

  if (item.status === 'completed') {
    // Already completed - but allow archiving if requested
    if (options.archive) {
      console.log(chalk.yellow(`Item ${id} is already completed - archiving now`));
      archiveItem(item);
      await commit(`Archived ${id}: ${item.scope.title}`);
      console.log(chalk.green(`✓ Archived ${id}`));
    } else {
      console.log(chalk.yellow(`Item ${id} is already completed`));
    }
    return;
  }

  console.log(chalk.bold.cyan(`\n✓ Complete ${id}: ${item.scope.title}\n`));

  // Check DoD completion
  const dodComplete = item.fence.definitionOfDone.filter(d => d.completed).length;
  const dodTotal = item.fence.definitionOfDone.length;

  // Check if no DoD items exist
  if (dodTotal === 0 && !options.yes) {
    console.log(chalk.yellow(`⚠  No Definition of Done items defined`));
    console.log(chalk.gray('It\'s recommended to define DoD items before completing.'));

    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Complete without DoD?',
        default: false,
      },
    ]);

    if (!continueAnyway) {
      console.log(chalk.gray('Cancelled'));
      console.log(chalk.yellow(`\nAdd DoD items with: safer dod ${id} --add "<item>"`));
      return;
    }
  }
  // Check if DoD items are incomplete
  else if (dodComplete < dodTotal && !options.yes) {
    console.log(chalk.yellow(`⚠  Definition of Done not complete (${dodComplete}/${dodTotal})`));
    console.log(chalk.gray('Incomplete items:'));

    item.fence.definitionOfDone
      .filter(d => !d.completed)
      .forEach(dod => {
        console.log(chalk.gray('  ☐'), dod.text);
      });

    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Complete anyway?',
        default: false,
      },
    ]);

    if (!continueAnyway) {
      console.log(chalk.gray('Cancelled'));
      return;
    }
  }

  // Collect completion info
  let answers;
  let incidents = item.review.incidents;

  if (options.yes) {
    // Non-interactive mode
    const incidentCount = options.incidents ? parseInt(options.incidents) : 0;
    answers = {
      stressLevel: options.stress ? parseInt(options.stress) : item.review.stressLevel,
      learnings: options.learnings || '',
      hadIncidents: incidentCount > 0,
    };
    incidents = incidentCount;
  } else {
    answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'stressLevel',
        message: 'Stress level (1-5):',
        default: options.stress ? parseInt(options.stress) : item.review.stressLevel,
        validate: (val: number) => val >= 1 && val <= 5,
      },
      {
        type: 'input',
        name: 'learnings',
        message: 'Key learnings (optional):',
        default: '',
      },
      {
        type: 'confirm',
        name: 'hadIncidents',
        message: 'Any incidents (bugs, rollbacks)?',
        default: false,
      },
    ]);

    if (answers.hadIncidents) {
      const { incidentCount } = await inquirer.prompt([
        {
          type: 'number',
          name: 'incidentCount',
          message: 'Number of incidents:',
          default: 1,
        },
      ]);
      incidents = incidentCount;
    }
  }

  const spinner = ora('Completing delivery item').start();

  try {
    // Calculate cycle time
    const created = new Date(item.created);
    const completed = new Date();
    const cycleTime = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // Update item
    item.status = 'completed';
    item.updated = completed.toISOString();
    item.review.stressLevel = answers.stressLevel;
    item.review.incidents = incidents;

    if (answers.learnings) {
      item.review.learnings.push(answers.learnings);
    }

    item.metrics.cycleTime = cycleTime;
    item.metrics.completionRate = dodComplete / Math.max(dodTotal, 1);

    // Save or archive
    if (options.archive) {
      archiveItem(item);
      await commit(`Completed and archived ${id}: ${item.scope.title}`);
      spinner.succeed(chalk.green(`Completed and archived ${id}`));
    } else {
      saveItem(item);
      await commit(`Completed ${id}: ${item.scope.title}`);
      spinner.succeed(chalk.green(`Completed ${id}`));
    }

    // Summary
    console.log(chalk.bold.green('\n✓ Delivery Item Completed\n'));
    console.log(chalk.cyan('ID:'), id);
    console.log(chalk.cyan('Title:'), item.scope.title);
    console.log(chalk.cyan('Cycle Time:'), `${cycleTime} days`);
    console.log(chalk.cyan('DoD Completion:'), `${Math.round((dodComplete / Math.max(dodTotal, 1)) * 100)}%`);
    console.log(chalk.cyan('Stress Level:'), `${answers.stressLevel}/5`);
    console.log(chalk.cyan('Incidents:'), incidents);

    if (answers.learnings) {
      console.log(chalk.cyan('Learnings:'), answers.learnings);
    }

    // Next steps
    console.log(chalk.bold('\nNext Steps:'));

    if (!options.archive) {
      console.log(chalk.gray('•'), 'Archive item:', chalk.yellow(`safer archive ${id}`));
    }

    console.log(chalk.gray('•'), 'View status:', chalk.yellow('safer status'));
    console.log(chalk.gray('•'), 'Create new item:', chalk.yellow('safer create'));

    // Offer to import from GitHub if configured (skip in non-interactive mode)
    if (!options.yes) {
      const { loadConfig, checkWipLimit } = await import('../lib/data');
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
            const { createGitHubImporter } = await import('../lib/importers/github');
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
    }

    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to complete delivery item'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import {
  SAFER_DIR,
  CONFIG_FILE,
  DATA_DIR,
  ACTIVE_DIR,
  ARCHIVE_DIR,
  REVIEWS_DIR,
  METRICS_DIR,
  REPOS_DIR,
  TEMPLATES_DIR,
  DEFAULT_CONFIG,
  ensureDir,
  saveConfig,
  isInitialized,
} from '../lib/data';
import { initRepo, addRemote } from '../lib/git';

export async function initCommand(options: { remote?: string; yes?: boolean }) {
  console.log(chalk.bold.cyan('\n🎯 Initializing SAFER Framework\n'));

  // Check if already initialized
  if (isInitialized()) {
    console.log(chalk.yellow('SAFER is already initialized at:'), chalk.cyan(SAFER_DIR));

    if (!options.yes) {
      const { reinit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reinit',
          message: 'Reinitialize? This will keep existing data but reset configuration.',
          default: false,
        },
      ]);

      if (!reinit) {
        console.log(chalk.gray('Cancelled'));
        return;
      }
    }
  }

  // Use defaults if --yes flag is provided
  let answers;
  if (options.yes) {
    answers = {
      name: 'Paul Dean',
      email: 'paul.dean@oxfordop.co.uk',
      maxWIP: 3,
      timeBox: 90,
      enableCalendar: false,
    };
    console.log(chalk.gray('Using default configuration (--yes mode)'));
  } else {
    // Collect user information
    answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        default: 'Paul Dean',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        default: 'paul.dean@oxfordop.co.uk',
      },
      {
        type: 'number',
        name: 'maxWIP',
        message: 'Maximum WIP limit:',
        default: 3,
        validate: (val: number) => val > 0 && val <= 5,
      },
      {
        type: 'number',
        name: 'timeBox',
        message: 'Default focus block duration (minutes):',
        default: 90,
      },
      {
        type: 'confirm',
        name: 'enableCalendar',
        message: 'Enable calendar integration?',
        default: false,
      },
    ]);
  }

  const spinner = ora('Creating SAFER directory structure').start();

  try {
    // Create directory structure
    ensureDir(SAFER_DIR);
    ensureDir(DATA_DIR);
    ensureDir(ACTIVE_DIR);
    ensureDir(ARCHIVE_DIR);
    ensureDir(REVIEWS_DIR);
    ensureDir(METRICS_DIR);
    ensureDir(REPOS_DIR);
    ensureDir(TEMPLATES_DIR);

    spinner.text = 'Creating configuration';

    // Create config
    const config = {
      ...DEFAULT_CONFIG,
      user: {
        name: answers.name,
        email: answers.email,
        timezone: 'Europe/London',
      },
      limits: {
        ...DEFAULT_CONFIG.limits,
        maxWIP: answers.maxWIP,
        defaultTimeBox: answers.timeBox,
      },
      calendar: {
        ...DEFAULT_CONFIG.calendar,
        enabled: answers.enableCalendar,
      },
    };

    saveConfig(config);

    spinner.text = 'Creating README';

    // Create README
    const readmePath = `${SAFER_DIR}/README.md`;
    const readme = `# SAFER Framework - Personal Productivity System

## What is SAFER?

SAFER (Scope → Align → Fence → Execute → Review) is a behavioral operating system for high-performing individuals.

## Directory Structure

- \`data/active/\` - Active delivery items (max ${answers.maxWIP})
- \`data/archive/\` - Completed items
- \`data/reviews/\` - Weekly reviews
- \`data/metrics/\` - Metrics tracking
- \`repos/\` - Repository-specific configuration
- \`config.json\` - Global configuration

## Quick Start

\`\`\`bash
# Create a new delivery item
safer create "Your task description"

# List active items
safer list

# View item details
safer show DI-001

# Manage Definition of Done
safer dod DI-001 --add "Complete tests"
safer dod DI-001 --check dod-1

# Complete item
safer complete DI-001

# Check system status
safer status
\`\`\`

## Core Principles

1. **Explore freely, commit deliberately**
2. **Maximum ${answers.maxWIP} active items** (WIP limit)
3. **Definition of Done required** for all items
4. **Time-boxed execution** (${answers.timeBox} minute focus blocks)
5. **Weekly reviews** for continuous improvement

## Support

For issues and feature requests: https://github.com/pauldean/safer-cli/issues
`;

    fs.writeFileSync(readmePath, readme);

    spinner.text = 'Initializing git repository';

    // Initialize git
    await initRepo();

    // Add remote if provided
    if (options.remote) {
      spinner.text = 'Adding git remote';
      await addRemote(options.remote);

      // Enable remote sync
      config.git.remoteSync = true;
      saveConfig(config);
    }

    // Create delivery item template
    spinner.text = 'Creating templates';

    const templatePath = `${TEMPLATES_DIR}/delivery-item.json`;
    const template = {
      id: 'DI-XXX',
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'active',
      scope: {
        title: '',
        description: '',
        outcome: '',
        who: '',
        when: '',
      },
      align: {
        objectives: [],
        stakeholders: [],
        dependencies: [],
        value: '',
      },
      fence: {
        timeBox: {
          duration: answers.timeBox,
          unit: 'minutes',
          sessions: [],
        },
        definitionOfDone: [],
        wipSlot: 1,
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
        plannedTimeSpent: answers.timeBox,
      },
    };

    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));

    spinner.succeed(chalk.green('SAFER initialized successfully'));

    // Success message
    console.log(chalk.bold.green('\n✓ SAFER Framework initialized\n'));
    console.log(chalk.cyan('Location:'), SAFER_DIR);
    console.log(chalk.cyan('Max WIP:'), answers.maxWIP);
    console.log(chalk.cyan('Focus Block:'), `${answers.timeBox} minutes`);
    console.log(chalk.cyan('Calendar:'), answers.enableCalendar ? 'Enabled' : 'Disabled');

    if (options.remote) {
      console.log(chalk.cyan('Git Remote:'), options.remote);
    }

    console.log(chalk.bold('\nNext Steps:'));
    console.log(chalk.gray('1.'), 'Create your first item:', chalk.yellow('safer create "Set up SAFER system"'));
    console.log(chalk.gray('2.'), 'View system status:', chalk.yellow('safer status'));
    console.log(chalk.gray('3.'), 'List active items:', chalk.yellow('safer list'));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize SAFER'));
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

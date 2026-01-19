import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { REVIEWS_DIR, ensureDir } from '../lib/data';

interface ReviewOptions {
  yes?: boolean;
  wentWell?: string;
  didntGoWell?: string;
  blockers?: string;
  learnings?: string;
  adjustments?: string;
}

interface ArchivedItem {
  id: string;
  scope: { title: string };
  review: { stressLevel: number; incidents: number; learnings: string[] };
  metrics: { cycleTime: number; completionRate: number };
  fence: {
    timeBox: { sessions: Array<{ duration: number }> };
    definitionOfDone: Array<{ completed: boolean }>;
  };
  updated: string;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getArchivedItemsThisWeek(): ArchivedItem[] {
  const archivePath = path.join(process.env.HOME || '', '.safer', 'data', 'archive');
  const items: ArchivedItem[] = [];

  if (!fs.existsSync(archivePath)) {
    return items;
  }

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const scanDir = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          const itemDate = new Date(data.updated);
          const itemWeek = getWeekNumber(itemDate);
          const itemYear = itemDate.getFullYear();

          if (itemWeek === currentWeek && itemYear === currentYear) {
            items.push(data);
          }
        } catch (e) {
          // Skip invalid files
        }
      }
    }
  };

  scanDir(archivePath);
  return items;
}

export async function reviewCommand(options: ReviewOptions) {
  const now = new Date();
  const weekNum = getWeekNumber(now);
  const year = now.getFullYear();
  const weekId = `${year}-W${weekNum.toString().padStart(2, '0')}`;

  console.log(chalk.bold.cyan(`\n📝 Weekly Review: ${weekId}\n`));

  // Get this week's completed items
  const completedItems = getArchivedItemsThisWeek();

  // Calculate metrics
  const totalCompleted = completedItems.length;
  const totalStress = completedItems.reduce((sum, item) => sum + (item.review?.stressLevel || 0), 0);
  const avgStress = totalCompleted > 0 ? (totalStress / totalCompleted).toFixed(1) : 'N/A';
  const totalIncidents = completedItems.reduce((sum, item) => sum + (item.review?.incidents || 0), 0);
  const totalFocusMinutes = completedItems.reduce((sum, item) => {
    const sessions = item.fence?.timeBox?.sessions || [];
    return sum + sessions.reduce((sSum, s) => sSum + (s.duration || 0), 0);
  }, 0);
  const totalCycleTime = completedItems.reduce((sum, item) => sum + (item.metrics?.cycleTime || 0), 0);
  const avgCycleTime = totalCompleted > 0 ? (totalCycleTime / totalCompleted).toFixed(1) : 'N/A';

  // Display metrics
  console.log(chalk.bold('This Week\'s Metrics'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Items Completed:'), totalCompleted);
  console.log(chalk.cyan('Average Stress:'), `${avgStress}/5`);
  console.log(chalk.cyan('Total Incidents:'), totalIncidents);
  console.log(chalk.cyan('Focus Time:'), `${totalFocusMinutes} minutes`);
  console.log(chalk.cyan('Avg Cycle Time:'), `${avgCycleTime} days`);
  console.log();

  if (totalCompleted > 0) {
    console.log(chalk.bold('Completed Items'));
    console.log(chalk.gray('─'.repeat(50)));
    completedItems.forEach(item => {
      console.log(chalk.green('  ✓'), `[${item.id}] ${item.scope.title}`);
    });
    console.log();
  }

  // Collect reflections
  let answers;
  if (options.yes) {
    answers = {
      wentWell: options.wentWell || '',
      didntGoWell: options.didntGoWell || '',
      blockers: options.blockers || '',
      learnings: options.learnings || '',
      adjustments: options.adjustments || '',
    };
  } else {
    console.log(chalk.bold('Reflection'));
    console.log(chalk.gray('─'.repeat(50)));

    answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'wentWell',
        message: 'What went well this week?',
        default: '',
      },
      {
        type: 'editor',
        name: 'didntGoWell',
        message: 'What didn\'t go well?',
        default: '',
      },
      {
        type: 'input',
        name: 'blockers',
        message: 'Any blockers encountered?',
        default: '',
      },
      {
        type: 'input',
        name: 'learnings',
        message: 'Key learnings?',
        default: '',
      },
      {
        type: 'input',
        name: 'adjustments',
        message: 'Adjustments for next week?',
        default: '',
      },
    ]);
  }

  const spinner = ora('Saving review').start();

  try {
    ensureDir(REVIEWS_DIR);

    // Generate markdown - only include reflection sections that have content
    const reflectionSections: string[] = [];

    if (answers.wentWell) {
      reflectionSections.push(`## What Went Well\n\n${answers.wentWell}`);
    }
    if (answers.didntGoWell) {
      reflectionSections.push(`## What Didn't Go Well\n\n${answers.didntGoWell}`);
    }
    if (answers.blockers) {
      reflectionSections.push(`## Blockers\n\n${answers.blockers}`);
    }
    if (answers.learnings) {
      reflectionSections.push(`## Key Learnings\n\n${answers.learnings}`);
    }
    if (answers.adjustments) {
      reflectionSections.push(`## Adjustments for Next Week\n\n${answers.adjustments}`);
    }

    const markdown = `# Weekly Review: ${weekId}

**Date:** ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

## Metrics

| Metric | Value |
|--------|-------|
| Items Completed | ${totalCompleted} |
| Average Stress | ${avgStress}/5 |
| Total Incidents | ${totalIncidents} |
| Focus Time | ${totalFocusMinutes} minutes |
| Avg Cycle Time | ${avgCycleTime} days |

## Completed Items

${totalCompleted > 0 ? completedItems.map(item => `- [${item.id}] ${item.scope.title}`).join('\n') : '_No items completed this week_'}

${reflectionSections.length > 0 ? reflectionSections.join('\n\n') : '## Reflections\n\n_No reflections recorded_'}

---
_Generated by SAFER on ${now.toISOString()}_
`;

    const reviewPath = path.join(REVIEWS_DIR, `${weekId}.md`);
    fs.writeFileSync(reviewPath, markdown);

    spinner.succeed(chalk.green(`Review saved: ${weekId}.md`));

    console.log(chalk.bold.green('\n✓ Weekly Review Complete\n'));
    console.log(chalk.cyan('Saved to:'), reviewPath);
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to save review'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

import chalk from 'chalk';
import { getItem, saveItem } from '../lib/data';
import { commit } from '../lib/git';

export async function dodCommand(
  id: string,
  options: {
    add?: string;
    check?: string;
    uncheck?: string;
    checkComplete?: boolean;
    json?: boolean;
  }
) {
  const item = getItem(id);

  if (!item) {
    console.error(chalk.red(`Error: Item ${id} not found`));
    process.exit(1);
  }

  // Add DoD item
  if (options.add) {
    const newDodId = `dod-${item.fence.definitionOfDone.length + 1}`;
    item.fence.definitionOfDone.push({
      id: newDodId,
      text: options.add,
      completed: false,
      completedAt: null,
    });

    saveItem(item);
    await commit(`Added DoD item to ${id}: ${options.add}`);

    console.log(chalk.green(`✓ Added DoD item: ${options.add}`));
    console.log(chalk.gray(`  ID: ${newDodId}`));
    return;
  }

  // Check off DoD item
  if (options.check) {
    const dodItem = item.fence.definitionOfDone.find(d => d.id === options.check);

    if (!dodItem) {
      console.error(chalk.red(`Error: DoD item ${options.check} not found`));
      process.exit(1);
    }

    dodItem.completed = true;
    dodItem.completedAt = new Date().toISOString();

    saveItem(item);
    await commit(`Completed DoD item ${options.check} for ${id}`);

    console.log(chalk.green(`✓ Completed: ${dodItem.text}`));

    // Check if all DoD items are complete
    const allComplete = item.fence.definitionOfDone.every(d => d.completed);
    if (allComplete) {
      console.log(chalk.bold.green('\n🎉 All Definition of Done items complete!'));
      console.log(chalk.gray('Ready to complete:'), chalk.yellow(`safer complete ${id}`));
    }
    return;
  }

  // Uncheck DoD item
  if (options.uncheck) {
    const dodItem = item.fence.definitionOfDone.find(d => d.id === options.uncheck);

    if (!dodItem) {
      console.error(chalk.red(`Error: DoD item ${options.uncheck} not found`));
      process.exit(1);
    }

    dodItem.completed = false;
    dodItem.completedAt = null;

    saveItem(item);
    await commit(`Unchecked DoD item ${options.uncheck} for ${id}`);

    console.log(chalk.yellow(`○ Unchecked: ${dodItem.text}`));
    return;
  }

  // Check if all DoD items are complete (for hooks)
  if (options.checkComplete) {
    const allComplete = item.fence.definitionOfDone.every(d => d.completed);

    if (options.json) {
      console.log(allComplete);
    } else {
      if (allComplete) {
        console.log(chalk.green('true'));
      } else {
        console.log(chalk.red('false'));
      }
    }

    process.exit(allComplete ? 0 : 1);
  }

  // Display DoD items
  if (options.json) {
    console.log(JSON.stringify(item.fence.definitionOfDone, null, 2));
    return;
  }

  console.log(chalk.bold.cyan(`\n✓ Definition of Done - ${id}\n`));

  if (item.fence.definitionOfDone.length === 0) {
    console.log(chalk.gray('No DoD items defined'));
    console.log(chalk.gray('\nAdd items with:'), chalk.yellow(`safer dod ${id} --add "<item>"`));
    console.log();
    return;
  }

  item.fence.definitionOfDone.forEach(dod => {
    const checkbox = dod.completed ? chalk.green('☑') : chalk.gray('☐');
    console.log(`  ${checkbox} ${dod.text}`, chalk.gray(`[${dod.id}]`));

    if (dod.completed && dod.completedAt) {
      console.log(chalk.gray(`     ✓ ${new Date(dod.completedAt).toLocaleString()}`));
    }
  });

  const completed = item.fence.definitionOfDone.filter(d => d.completed).length;
  const total = item.fence.definitionOfDone.length;
  const percent = Math.round((completed / total) * 100);

  console.log();
  console.log(chalk.cyan('Progress:'), `${completed}/${total}`, chalk.gray(`(${percent}%)`));

  const progressBar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
  console.log(chalk.cyan('Status:'), progressBar);

  if (completed === total) {
    console.log(chalk.green('\n✓ All items complete!'));
    console.log(chalk.gray('Ready to complete:'), chalk.yellow(`safer complete ${id}`));
  } else {
    console.log(chalk.gray('\nCheck off items with:'), chalk.yellow(`safer dod ${id} --check <dod-id>`));
  }
  console.log();
}

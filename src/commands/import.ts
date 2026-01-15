import { createGitHubImporter } from '../lib/importers/github';
import { ImportOptions } from '../lib/importers/base';
import chalk from 'chalk';

export async function importCommand(source: string, options: {
  assignedToMe?: boolean;
  label?: string;
  state?: 'open' | 'closed' | 'all';
  limit?: number;
  dryRun?: boolean;
}): Promise<void> {
  console.log(chalk.bold(`\n📥 Importing from ${source.toUpperCase()}\n`));

  try {
    let importer;

    // Select importer based on source
    switch (source.toLowerCase()) {
      case 'github':
        importer = createGitHubImporter();
        break;

      case 'jira':
        console.log(chalk.red('✗ Jira importer not yet implemented'));
        console.log(chalk.gray('  Coming soon!'));
        return;

      case 'bitbucket':
        console.log(chalk.red('✗ Bitbucket importer not yet implemented'));
        console.log(chalk.gray('  Coming soon!'));
        return;

      case 'monday':
        console.log(chalk.red('✗ Monday.com importer not yet implemented'));
        console.log(chalk.gray('  Coming soon!'));
        return;

      default:
        console.log(chalk.red(`✗ Unknown source: ${source}`));
        console.log(chalk.gray('  Supported: github, jira, bitbucket, monday'));
        return;
    }

    // Check if configured
    if (!importer.isConfigured()) {
      console.log(chalk.red(`✗ ${source} integration is not configured`));
      console.log(chalk.gray(`  Run: safer github --enable`));
      return;
    }

    // Build import options
    const importOptions: ImportOptions = {
      assignedToMe: options.assignedToMe,
      label: options.label,
      state: options.state || 'open',
      limit: options.limit || 10,
    };

    // Display what we're importing
    console.log(chalk.cyan('Import settings:'));
    console.log(`  ${chalk.gray('Source:')}         ${source}`);
    console.log(`  ${chalk.gray('State:')}          ${importOptions.state}`);
    console.log(`  ${chalk.gray('Assigned to me:')} ${importOptions.assignedToMe ? 'Yes' : 'No'}`);
    if (importOptions.label) {
      console.log(`  ${chalk.gray('Label:')}          ${importOptions.label}`);
    }
    console.log(`  ${chalk.gray('Limit:')}          ${importOptions.limit}`);
    console.log();

    // Dry run - just fetch and display
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry run mode - no items will be created\n'));

      const items = await importer.fetchItems(importOptions);

      if (items.length === 0) {
        console.log(chalk.yellow('No items found to import'));
        return;
      }

      console.log(chalk.green(`Found ${items.length} item(s):\n`));

      items.forEach((item, index) => {
        console.log(chalk.bold(`${index + 1}. ${item.title}`));
        console.log(`   ${chalk.gray('Source:')} ${item.source.platform} #${item.source.id}`);
        console.log(`   ${chalk.gray('URL:')}    ${item.source.url}`);
        if (item.metadata.labels && item.metadata.labels.length > 0) {
          console.log(`   ${chalk.gray('Labels:')} ${item.metadata.labels.join(', ')}`);
        }
        if (item.metadata.priority) {
          console.log(`   ${chalk.gray('Priority:')} ${item.metadata.priority}`);
        }
        console.log();
      });

      console.log(chalk.cyan(`\nTo import these items, run without --dry-run flag`));
      return;
    }

    // Actual import
    console.log(chalk.cyan('Importing items...\n'));

    const result = await importer.import(importOptions);

    // Display results
    if (result.success) {
      console.log(chalk.green(`✓ Successfully imported ${result.imported} item(s)`));

      if (result.items.length > 0) {
        console.log(chalk.bold('\nImported items:'));
        result.items.forEach(item => {
          console.log(`  ${chalk.cyan(item.id)} ${item.scope.title}`);
        });
      }

      if (result.skipped > 0) {
        console.log(chalk.yellow(`\n○ Skipped ${result.skipped} item(s) (WIP limit or errors)`));
      }

      if (result.errors.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.errors.forEach(error => {
          console.log(`  ${chalk.yellow('⚠')} ${error}`);
        });
      }

      console.log(chalk.gray(`\nView items: safer list`));
    } else {
      console.log(chalk.red(`✗ Import failed`));

      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach(error => {
          console.log(`  ${chalk.red('✗')} ${error}`);
        });
      }
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Import failed:'));
    console.error(chalk.gray((error as Error).message));
    process.exit(1);
  }
}

export async function importListCommand(source: string): Promise<void> {
  console.log(chalk.bold(`\n📋 Available items from ${source.toUpperCase()}\n`));

  try {
    let importer;

    switch (source.toLowerCase()) {
      case 'github':
        importer = createGitHubImporter();
        break;
      default:
        console.log(chalk.red(`✗ Unknown source: ${source}`));
        return;
    }

    if (!importer.isConfigured()) {
      console.log(chalk.red(`✗ ${source} integration is not configured`));
      return;
    }

    // Fetch items
    const items = await importer.fetchItems({ state: 'open', limit: 20 });

    if (items.length === 0) {
      console.log(chalk.yellow('No items found'));
      return;
    }

    console.log(chalk.green(`Found ${items.length} item(s):\n`));

    items.forEach((item, index) => {
      console.log(chalk.bold(`${index + 1}. ${item.title}`));
      console.log(`   ${chalk.gray('ID:')}      ${item.source.platform} #${item.source.id}`);
      console.log(`   ${chalk.gray('URL:')}     ${item.source.url}`);
      if (item.metadata.assignee) {
        console.log(`   ${chalk.gray('Assignee:')} ${item.metadata.assignee}`);
      }
      if (item.metadata.labels && item.metadata.labels.length > 0) {
        console.log(`   ${chalk.gray('Labels:')}   ${item.metadata.labels.join(', ')}`);
      }
      console.log();
    });

    console.log(chalk.cyan(`To import these, run: safer import ${source}`));
  } catch (error) {
    console.error(chalk.red('✗ Failed to list items:'));
    console.error(chalk.gray((error as Error).message));
  }
}

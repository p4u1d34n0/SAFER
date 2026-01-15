import chalk from 'chalk';
import { loadConfig, getConfigValue, setConfigValue, saveConfig } from '../lib/data';

export async function configCommand(key?: string, value?: string) {
  const config = loadConfig();

  // No arguments: show entire config
  if (!key) {
    console.log(chalk.bold.cyan('\n⚙️  SAFER Configuration\n'));
    console.log(JSON.stringify(config, null, 2));
    console.log();
    console.log(chalk.gray('To get a specific value: safer config <key>'));
    console.log(chalk.gray('To set a value: safer config <key> <value>'));
    console.log(chalk.gray('Example: safer config limits.maxWIP 5'));
    console.log();
    return;
  }

  // Get value
  if (!value) {
    const currentValue = getConfigValue(key);
    if (currentValue === undefined) {
      console.log(chalk.red(`Configuration key '${key}' not found`));
      process.exit(1);
    }

    console.log(chalk.cyan(key + ':'), typeof currentValue === 'object'
      ? JSON.stringify(currentValue, null, 2)
      : currentValue
    );
    return;
  }

  // Set value
  try {
    // Try to parse as JSON first (for booleans, numbers, arrays, objects)
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // If JSON parse fails, treat as string
      parsedValue = value;
    }

    setConfigValue(key, parsedValue);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));

    // Show relevant hints for specific config changes
    if (key === 'git.remoteSync' && parsedValue === true) {
      console.log(chalk.gray('\nHint: Make sure you have a git remote configured'));
      console.log(chalk.gray('Run: cd ~/.safer && git remote add origin <url>'));
    } else if (key === 'calendar.enabled' && parsedValue === true) {
      console.log(chalk.gray('\nHint: Calendar integration uses AppleScript'));
      console.log(chalk.gray('Make sure Calendar.app is accessible'));
    } else if (key === 'limits.maxWIP') {
      console.log(chalk.gray(`\nNote: WIP limit changed to ${parsedValue}`));
      console.log(chalk.gray('This affects how many items you can have active simultaneously'));
    }
  } catch (error) {
    console.error(chalk.red('Error setting configuration:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

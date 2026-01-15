# Contributing to SAFER CLI

Thank you for considering contributing to SAFER! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, professional, and constructive. This is a personal productivity tool that helps people work better.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Operating system and version
   - Node.js version (`node --version`)
   - SAFER CLI version (`safer --version`)
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and stack traces

### Suggesting Features

1. Check existing feature requests
2. Describe the use case and benefit
3. Consider how it fits with the SAFER Framework philosophy
4. Provide examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write or update tests
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

## Development Setup

### Prerequisites

- Node.js 18+
- Git
- TypeScript knowledge

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/SAFER.git
cd SAFER

# Install dependencies
npm install

# Build the project
npm run build

# Link locally for testing
npm link
```

### Development Workflow

```bash
# Run in development mode
npm run dev <command> [args]

# Example
npm run dev list
npm run dev create "Test item"

# Build
npm run build

# Test changes
safer <command>
```

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # Command implementations
│   ├── init.ts
│   ├── create.ts
│   ├── list.ts
│   ├── complete.ts
│   ├── github.ts
│   └── ...
├── lib/                  # Core libraries
│   ├── data.ts           # Data access layer
│   ├── git.ts            # Git operations
│   ├── github.ts         # GitHub client
│   ├── types.ts          # TypeScript types
│   └── importers/        # Platform importers
│       ├── base.ts
│       └── github.ts
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for public APIs
- Avoid `any` types when possible
- Use interfaces for data structures

### Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Use descriptive variable names
- Comment complex logic

### Example

```typescript
interface DeliveryItem {
  id: string;
  status: 'active' | 'completed' | 'archived';
  scope: {
    title: string;
    description: string;
  };
}

export function createItem(title: string): DeliveryItem {
  const id = generateNextId();

  return {
    id,
    status: 'active',
    scope: {
      title,
      description: '',
    },
  };
}
```

### Git Commit Messages

Use conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:

```
feat(import): add Jira importer

Implements Jira issue import using REST API.
Supports filtering by JQL and project.

Closes #42
```

```
fix(github): prevent duplicate imports of archived items

GitHub importer was only checking active items, causing
re-import of archived issues.

Fixes #38
```

## Testing

### Manual Testing

```bash
# Initialize test environment
safer init

# Test commands
safer create "Test item"
safer list
safer dod DI-001 --add "Test DoD"
safer complete DI-001

# Clean up
safer purge-all -f
```

### Test Checklist

- [ ] Command runs without errors
- [ ] Output is clear and helpful
- [ ] Error messages are informative
- [ ] Edge cases handled (empty data, invalid input, etc.)
- [ ] Git commits created correctly
- [ ] Configuration changes persist
- [ ] Works on macOS/Linux/Windows (if applicable)

## Adding a New Command

1. Create command file in `src/commands/`
2. Implement command function
3. Export from command file
4. Register in `src/index.ts`
5. Update README.md with documentation
6. Test thoroughly

Example:

```typescript
// src/commands/mycommand.ts
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../lib/data';

export async function myCommand(options: { flag?: boolean }) {
  const config = loadConfig();

  console.log(chalk.green('Command executed!'));

  // Your logic here
}
```

```typescript
// src/index.ts
import { myCommand } from './commands/mycommand';

program
  .command('mycommand')
  .description('Description of my command')
  .option('-f, --flag', 'A flag option')
  .action(requireInit(myCommand));
```

## Adding a Platform Importer

1. Create importer in `src/lib/importers/`
2. Extend `BaseImporter` class
3. Implement required methods
4. Add command handler
5. Document setup and usage

See `src/lib/importers/github.ts` as reference.

## Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Include examples in documentation
- Update CONTRIBUTING.md if process changes

## Questions?

Open an issue with the "question" label or email paul.dean@oxfordop.co.uk.

## Thank You!

Your contributions help make SAFER better for everyone. Thank you for your time and effort!

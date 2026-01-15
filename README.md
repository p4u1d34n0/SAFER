# SAFER Framework CLI

A personal productivity and leadership development system based on the SAFER Framework: **Scope → Align → Fence → Execute → Review**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## What is SAFER?

SAFER is a behavioral operating system for managing delivery items with built-in leadership development. It helps you:

- **Scope**: Define clear outcomes and deliverables
- **Align**: Connect work to business objectives
- **Fence**: Set WIP limits, time-box work, define completion criteria
- **Execute**: Track commits, branches, and focus blocks
- **Review**: Capture metrics, learnings, and continuous improvement

## Features

- **WIP Limit Enforcement**: Maximum 3 active items to maintain focus
- **Definition of Done**: Checklist-based completion tracking
- **Git Integration**: Auto-commit SAFER data with meaningful messages
- **GitHub Integration**: Import issues directly as delivery items
- **Focus Blocks**: 90-minute time-boxed work sessions
- **Metrics Tracking**: Cycle time, stress levels, incidents, completion rates
- **Team-Safe**: Personal system that doesn't affect other developers
- **Web Dashboard**: Visual overview at `localhost:3456`

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Git installed and configured
- (Optional) GitHub CLI (`gh`) for enhanced GitHub integration

### Install Globally

```bash
npm install -g safer-cli
```

### Verify Installation

```bash
safer --version
```

## Quick Start

### 1. Initialize SAFER

```bash
safer init
```

This creates `~/.safer/` directory with:
- Git repository for version control
- Configuration file
- Data storage structure

### 2. Configure Your Settings

```bash
safer config set user.name "Your Name"
safer config set user.email "your.email@example.com"
safer config set limits.maxWIP 3
```

### 3. Create Your First Delivery Item

```bash
safer create "Set up development environment"
```

### 4. Add Definition of Done

```bash
safer dod DI-001 --add "Code written and tested"
safer dod DI-001 --add "Documentation updated"
safer dod DI-001 --add "Code review completed"
```

### 5. View Active Items

```bash
safer list
```

### 6. Mark DoD Items Complete

```bash
safer dod DI-001 --check dod-1
safer dod DI-001 --check dod-2
```

### 7. Complete the Item

```bash
safer complete DI-001
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `safer init` | Initialize SAFER system |
| `safer status` | Show system status and metrics |
| `safer config [key] [value]` | View or update configuration |

### Delivery Item Management

| Command | Description |
|---------|-------------|
| `safer create [title]` | Create new delivery item |
| `safer list` / `safer ls` | List active items |
| `safer list --all` | Include archived items |
| `safer show <id>` | Show item details |
| `safer complete <id>` | Mark item as complete |
| `safer archive <id>` | Archive completed item |
| `safer delete <id>` | Delete an item |
| `safer wip` | Show WIP status |

### Definition of Done

| Command | Description |
|---------|-------------|
| `safer dod <id>` | Show DoD checklist |
| `safer dod <id> --add "text"` | Add DoD item |
| `safer dod <id> --check <dod-id>` | Check off DoD item |
| `safer dod <id> --uncheck <dod-id>` | Uncheck DoD item |

### GitHub Integration

| Command | Description |
|---------|-------------|
| `safer github --owner <owner> --repo <repo>` | Configure GitHub integration |
| `safer github --enable` | Enable GitHub sync |
| `safer github --disable` | Disable GitHub sync |
| `safer github:status` | Show GitHub connection status |
| `safer import github` | Import GitHub issues as delivery items |
| `safer import github --dry-run` | Preview importable issues |

### Utility Commands

| Command | Description |
|---------|-------------|
| `safer purge-all` | Delete all data (keeps config) |
| `safer purge-all -f` | Force purge without confirmation |

## Configuration

Configuration is stored in `~/.safer/config.json`.

### Default Configuration

```json
{
  "user": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "limits": {
    "maxWIP": 3,
    "timeBox": 90
  },
  "github": {
    "enabled": false,
    "owner": "",
    "repo": "",
    "token": "",
    "branch": "main"
  }
}
```

### View Configuration

```bash
safer config
```

### Update Settings

```bash
safer config set limits.maxWIP 5
safer config set github.enabled true
```

## GitHub Integration

### Setup with GitHub CLI (Recommended)

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Configure SAFER
cd /path/to/your/repo
safer github --owner <org-name> --repo <repo-name> --enable
```

### Setup with Personal Access Token

```bash
safer github --owner <org-name> --repo <repo-name> --token <your-token> --enable
```

### Import Issues

```bash
# Dry run (preview only)
safer import github --dry-run

# Import issues
safer import github --limit 3

# Import with filters
safer import github --label "bug" --state open --limit 5
```

## Data Storage

All SAFER data is stored in `~/.safer/`:

```
~/.safer/
├── .git/                     # Git repository (auto-commit)
├── config.json               # Configuration
├── data/
│   ├── active/               # Active delivery items
│   │   ├── DI-001.json
│   │   ├── DI-002.json
│   │   └── DI-003.json
│   ├── archive/              # Completed items
│   │   └── 2026/
│   │       └── 01/
│   │           └── DI-001.json
│   ├── reviews/              # Weekly reviews
│   └── metrics/              # Metrics data
└── templates/
```

## Web Dashboard

Start the web dashboard (requires separate installation):

```bash
cd ~/.safer-dashboard
npm install
npm run dev
```

Visit `http://localhost:3456` to view:
- Active delivery items
- WIP status and gauges
- DoD completion progress
- Stress levels and metrics
- Weekly trends

## Team-Safe Git Hooks

SAFER can install local git hooks that won't affect other developers:

```bash
cd /path/to/your/work/repo
safer hook install
```

Hooks operate in two modes:

- **Personal Mode** (default for shared repos): Warnings only, never blocks commits
- **Strict Mode** (for personal repos): Enforces DoD completion

Other developers on the repository will never see SAFER prompts or errors.

### Bypass Hooks

```bash
git commit --no-verify
```

## Examples

### Daily Workflow

```bash
# Morning - review current work
safer list
safer wip

# Start working on an item
safer show DI-001
safer dod DI-001

# Check off DoD as you complete tasks
safer dod DI-001 --check dod-1
safer dod DI-001 --check dod-2

# Complete the item
safer complete DI-001

# Import next item from GitHub
safer import github --limit 1
```

### Weekly Review

```bash
# See completed work
safer list --all

# Check metrics
safer status --verbose

# Plan next week's work
safer import github --dry-run
safer import github --limit 3
```

## Development

### Setup for Development

```bash
git clone https://github.com/p4u1d34n0/SAFER.git
cd SAFER
npm install
```

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev <command> [args]
```

### Link Locally

```bash
npm run build
npm link
```

## Troubleshooting

### Command Not Found

If `safer` command isn't found after installation:

```bash
npm list -g safer-cli
npm link safer-cli
```

### GitHub Authentication Issues

```bash
# Check GitHub CLI status
gh auth status

# Re-authenticate
gh auth login

# Verify connection
safer github:status
```

### Data Location

If you can't find your SAFER data:

```bash
ls -la ~/.safer
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Author

**Paul Dean**
- Email: paul.dean@oxfordop.co.uk
- GitHub: [@p4u1d34n0](https://github.com/p4u1d34n0)

## Acknowledgments

Built on the SAFER Framework behavioral operating system for personal productivity and leadership development.

## Roadmap

- [ ] Advanced GitHub Projects integration
- [ ] Smart DoD generation from issue templates
- [ ] Jira/Bitbucket/Monday importers
- [ ] Calendar integration (macOS Calendar)
- [ ] Focus block timer with notifications
- [ ] AI-assisted retrospectives
- [ ] Cursor IDE integration
- [ ] Advanced metrics and trend analysis

## Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/p4u1d34n0/SAFER/issues).

# Changelog

All notable changes to SAFER CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-15

### Added

- Initial release of SAFER CLI
- Core commands: `init`, `create`, `list`, `show`, `complete`, `archive`, `delete`
- WIP limit enforcement (default: 3 items)
- Definition of Done checklist management
- Git integration with auto-commit
- GitHub integration with hybrid authentication (gh CLI + token fallback)
- GitHub issue importer with duplicate detection
- Configuration management
- Status and metrics display
- Web dashboard support (separate package)
- `purge-all` command for data reset
- `wip` command to show WIP status
- Auto-import prompt after completing/archiving items

### Features

- **SAFER Framework Implementation**
  - Scope: Clear delivery item titles and outcomes
  - Align: Connection to business objectives
  - Fence: WIP limits, time-boxing, Definition of Done
  - Execute: Commit tracking, branch tracking, work logs
  - Review: Stress levels, incidents, learnings, metrics

- **GitHub Integration**
  - Hybrid authentication (gh CLI preferred, token fallback)
  - Issue import with filtering (labels, state, assignee)
  - Duplicate prevention (checks active AND archived items)
  - GitHub issue number tracking in delivery items
  - Dry-run mode for preview

- **Data Management**
  - JSON-based storage in `~/.safer/`
  - Git version control for all data
  - Archive system by year/month
  - Metrics and reviews storage

- **User Experience**
  - Colorful CLI output with Chalk
  - Interactive prompts with Inquirer
  - Progress spinners with Ora
  - Clear error messages and validation

### Technical

- TypeScript 5.9+
- Node.js 18+ required
- Commander.js for CLI framework
- Simple-git for Git operations
- Modular architecture with pluggable importers

## [Unreleased]

### Planned Features

- GitHub Projects GraphQL integration
- Smart DoD generation from issue templates
- Jira importer
- Bitbucket importer
- Monday.com importer
- macOS Calendar integration
- Focus block timer with notifications
- Weekly review workflow
- Advanced metrics and charts
- Cursor IDE integration
- Team-safe git hooks
- AI-assisted retrospectives

---

## Version History

- **1.0.0** - Initial public release (2026-01-15)

[1.0.0]: https://github.com/p4u1d34n0/SAFER/releases/tag/v1.0.0

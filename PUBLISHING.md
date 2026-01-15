# Publishing Guide

This document explains how to prepare and publish SAFER CLI to GitHub and npm.

## Prerequisites

- Git installed and configured
- GitHub account with repository access
- npm account (for publishing to npm registry)
- All changes committed locally

## Repository Setup

### 1. Initialize Git Repository

```bash
cd /Users/pauldean/Projects/safer-cli
git init
git add .
git commit -m "Initial commit: SAFER CLI v1.0.0"
```

### 2. Add Remote Repository

```bash
git remote add origin https://github.com/p4u1d34n0/SAFER.git
```

### 3. Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## GitHub Repository Configuration

### 1. Repository Settings

- **Description**: "SAFER Framework - Personal productivity and leadership development system"
- **Website**: (optional)
- **Topics**: `productivity`, `cli`, `typescript`, `github`, `metrics`, `focus`, `wip-limit`

### 2. Enable Issues

- Go to Settings → Features
- Enable Issues for bug reports and feature requests

### 3. Create Release

```bash
# Tag the release
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release"
git push origin v1.0.0
```

Then create a release on GitHub:
- Go to Releases → Draft a new release
- Select tag `v1.0.0`
- Title: `v1.0.0 - Initial Release`
- Description: Copy from CHANGELOG.md
- Attach any additional files if needed
- Publish release

## Publishing to npm (Optional)

### 1. Build the Project

```bash
npm run build
```

### 2. Test Locally

```bash
# Test the built version
npm link
safer --version
safer status
```

### 3. Login to npm

```bash
npm login
```

### 4. Publish

```bash
npm publish
```

### 5. Verify

```bash
npm info safer-cli
```

## Post-Publication Checklist

- [ ] Repository visible on GitHub
- [ ] README.md displays correctly
- [ ] Issues enabled
- [ ] License visible
- [ ] Release created and tagged
- [ ] CI/CD workflow runs successfully
- [ ] Package published to npm (optional)
- [ ] Installation tested: `npm install -g safer-cli`

## Updating the Repository

### For Bug Fixes (Patch Version)

```bash
# Make changes
git add .
git commit -m "fix: description of fix"

# Update version
npm version patch

# Push
git push origin main
git push origin --tags
```

### For New Features (Minor Version)

```bash
# Make changes
git add .
git commit -m "feat: description of feature"

# Update version
npm version minor

# Push
git push origin main
git push origin --tags
```

### For Breaking Changes (Major Version)

```bash
# Make changes
git add .
git commit -m "feat!: description of breaking change

BREAKING CHANGE: detailed explanation"

# Update version
npm version major

# Push
git push origin main
git push origin --tags
```

## GitHub Actions

The repository includes a CI workflow that runs on push and pull requests:

- Builds on multiple OS (Ubuntu, macOS, Windows)
- Tests Node.js versions 18, 20, 22
- Runs TypeScript compilation
- Runs security audit

Check workflow status at: `https://github.com/p4u1d34n0/SAFER/actions`

## Common Issues

### Authentication Failed

```bash
# Use personal access token
git remote set-url origin https://<TOKEN>@github.com/p4u1d34n0/SAFER.git

# Or use SSH
git remote set-url origin git@github.com:p4u1d34n0/SAFER.git
```

### npm Publish Permission Denied

```bash
# Check you're logged in
npm whoami

# Check package name isn't taken
npm search safer-cli
```

### Build Fails

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Support

For publishing issues, contact:
- Email: paul.dean@oxfordop.co.uk
- GitHub Issues: https://github.com/p4u1d34n0/SAFER/issues

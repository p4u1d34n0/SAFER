#!/bin/bash
# SAFER CLI Publishing Script
#
# This script helps publish the SAFER CLI project to GitHub
#
# Usage: ./publish.sh

set -e  # Exit on error

echo "🚀 SAFER CLI Publishing Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the SAFER CLI directory?"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo ""
    echo "📝 Uncommitted changes detected:"
    git status -s
    echo ""
    read -p "Do you want to commit all changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📝 Committing changes..."
        git add .
        git commit -m "Initial commit: SAFER CLI v1.0.0

SAFER Framework - Personal productivity and leadership development system

Features:
- Core SAFER workflow (Scope, Align, Fence, Execute, Review)
- WIP limit enforcement (max 3 items)
- Definition of Done tracking
- GitHub integration with hybrid authentication
- Issue importer with duplicate detection
- Auto-commit for data changes
- Web dashboard support
- Comprehensive CLI with all core commands

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
        echo "✅ Changes committed"
    else
        echo "⚠️  Skipping commit. You'll need to commit manually."
    fi
fi

# Check if remote is configured
if ! git remote | grep -q origin; then
    echo ""
    echo "🔗 Adding remote repository..."
    git remote add origin https://github.com/p4u1d34n0/SAFER.git
    echo "✅ Remote added: origin -> https://github.com/p4u1d34n0/SAFER.git"
else
    echo "✅ Remote 'origin' already configured"
fi

# Verify remote
echo ""
echo "📡 Remote configuration:"
git remote -v

# Ask to push
echo ""
read -p "Do you want to push to GitHub now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Pushing to GitHub..."

    # Ensure we're on main branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        echo "📌 Renaming branch to 'main'..."
        git branch -M main
    fi

    # Push
    git push -u origin main
    echo "✅ Pushed to GitHub"

    # Create tag
    echo ""
    read -p "Do you want to create and push the v1.0.0 tag? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🏷️  Creating tag v1.0.0..."
        git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release"
        git push origin v1.0.0
        echo "✅ Tag v1.0.0 created and pushed"

        echo ""
        echo "🎉 Success! Your repository is published!"
        echo ""
        echo "Next steps:"
        echo "1. Visit https://github.com/p4u1d34n0/SAFER"
        echo "2. Create a release from the v1.0.0 tag"
        echo "3. Add repository description and topics"
        echo "4. Enable Issues and Discussions (optional)"
        echo ""
        echo "To publish to npm (optional):"
        echo "  npm login"
        echo "  npm publish"
    fi
else
    echo "⚠️  Skipping push. You can push manually with:"
    echo "   git push -u origin main"
fi

echo ""
echo "✨ Done!"

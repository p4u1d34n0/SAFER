import { BaseImporter, ImportedItem, ImportOptions, ImportResult } from './base';
import { createGitHubClient, GitHubIssue } from '../github';
import { loadConfig, checkWipLimit, saveItem, listActiveItems } from '../data';
import { DeliveryItem } from '../types';

export class GitHubImporter extends BaseImporter {
  name = 'GitHub Importer';
  platform = 'github';

  private client: ReturnType<typeof createGitHubClient>;

  constructor() {
    super();
    this.client = createGitHubClient();
  }

  isConfigured(): boolean {
    const config = loadConfig();
    return config.github?.enabled === true && this.client !== null;
  }

  async fetchItems(options: ImportOptions = {}): Promise<ImportedItem[]> {
    if (!this.client) {
      throw new Error('GitHub client not configured. Enable GitHub integration first.');
    }

    const {
      assignedToMe = false,
      label,
      state = 'open',
      limit = 50,
    } = options;

    try {
      // Fetch issues from GitHub
      let issues: GitHubIssue[] = [];

      if (state === 'open' || state === 'all') {
        const openIssues = await this.client.getOpenIssues();
        issues = [...openIssues];
      }

      // Filter by assignee if requested
      if (assignedToMe) {
        const config = loadConfig();
        const username = this.extractUsernameFromConfig(config.user.email);

        issues = issues.filter(issue => {
          // Check if assigned to current user
          // Note: GitHub API doesn't return assignees in list view by default
          // We'll need to check the user field or make additional calls
          return true; // For now, we'll import all and let user filter
        });
      }

      // Filter by label if requested
      if (label) {
        issues = issues.filter(issue =>
          issue.labels.some(l => l.name.toLowerCase() === label.toLowerCase())
        );
      }

      // Limit results
      issues = issues.slice(0, limit);

      // Convert to ImportedItem format
      return issues.map(issue => this.convertGitHubIssue(issue));
    } catch (error) {
      throw new Error(`Failed to fetch GitHub issues: ${(error as Error).message}`);
    }
  }

  /**
   * Convert GitHub issue to ImportedItem
   */
  private convertGitHubIssue(issue: GitHubIssue): ImportedItem {
    return {
      title: issue.title,
      description: this.extractDescription(issue),
      source: {
        platform: 'github',
        id: issue.number,
        url: issue.html_url,
      },
      metadata: {
        assignee: issue.user.login,
        labels: issue.labels.map(l => l.name),
        status: issue.state,
        priority: this.extractPriority(issue.labels.map(l => l.name)),
      },
    };
  }

  /**
   * Extract description or provide default
   */
  private extractDescription(issue: GitHubIssue): string {
    // GitHub API list view doesn't include body
    // We'd need to fetch individual issue for full description
    return `GitHub Issue #${issue.number}: ${issue.title}`;
  }

  /**
   * Extract priority from labels
   */
  private extractPriority(labels: string[]): string {
    const priorityLabels = ['critical', 'high', 'medium', 'low', 'urgent'];

    for (const label of labels) {
      const normalized = label.toLowerCase();
      for (const priority of priorityLabels) {
        if (normalized.includes(priority)) {
          return priority;
        }
      }
    }

    return 'medium';
  }

  /**
   * Extract GitHub username from email
   */
  private extractUsernameFromConfig(email: string): string {
    // Simple extraction - user@domain.com -> user
    return email.split('@')[0];
  }

  /**
   * Import issues and create SAFER delivery items
   */
  async import(options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      items: [],
    };

    try {
      // Fetch items from GitHub
      const imported = await this.fetchItems(options);

      if (imported.length === 0) {
        result.success = true;
        return result;
      }

      // Get all existing items (active and archived) to check for duplicates
      const existingActiveItems = listActiveItems();
      const { listArchivedItems } = require('../data');
      const existingArchivedItems = listArchivedItems();
      const allExistingItems = [...existingActiveItems, ...existingArchivedItems];

      // Build set of already imported GitHub issue numbers
      const importedGitHubIssues = new Set<number>();
      allExistingItems.forEach(item => {
        if (item.execute?.github?.issues) {
          item.execute.github.issues.forEach((issueNum: number) => {
            importedGitHubIssues.add(issueNum);
          });
        }
      });

      // Filter out already imported issues
      const newItems = imported.filter(item => {
        const issueNum = item.source.id as number;
        if (importedGitHubIssues.has(issueNum)) {
          result.skipped++;
          return false;
        }
        return true;
      });

      if (newItems.length === 0) {
        result.success = true;
        result.errors.push('All available issues have already been imported');
        return result;
      }

      // Use filtered list for import
      const toImportList = newItems;

      // Check WIP limit
      const wipCheck = checkWipLimit();
      const availableSlots = wipCheck.maxWip - wipCheck.currentWip;

      if (availableSlots === 0) {
        result.errors.push('WIP limit reached. Complete or archive existing items first.');
        return result;
      }

      // Determine how many we can import
      const toImport = Math.min(toImportList.length, availableSlots);

      if (toImport < toImportList.length) {
        result.errors.push(
          `Can only import ${toImport} items due to WIP limit (${availableSlots} slots available)`
        );
      }

      // Get next available WIP slots
      const activeItems = listActiveItems();
      const usedSlots = new Set(activeItems.map(item => item.fence.wipSlot));
      const nextSlots: number[] = [];

      for (let i = 1; i <= wipCheck.maxWip; i++) {
        if (!usedSlots.has(i)) {
          nextSlots.push(i);
          if (nextSlots.length >= toImport) break;
        }
      }

      // Import items
      for (let i = 0; i < toImport; i++) {
        try {
          const importedItem = toImportList[i];
          const wipSlot = nextSlots[i];

          // Convert to delivery item
          const partial = this.convertToDeliveryItem(importedItem, wipSlot);

          // Generate ID
          const nextId = this.generateNextId();

          // Create full delivery item
          const deliveryItem: DeliveryItem = {
            id: nextId,
            version: '1.0.0',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            status: 'active',
            ...partial,
          } as DeliveryItem;

          // Save item
          saveItem(deliveryItem);

          result.items.push(deliveryItem);
          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to import item: ${(error as Error).message}`);
          result.skipped++;
        }
      }

      // Mark skipped items (those that couldn't be imported due to WIP limit)
      result.skipped += toImportList.length - toImport;
      result.success = result.imported > 0;

      return result;
    } catch (error) {
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Generate next delivery item ID
   */
  private generateNextId(): string {
    const items = listActiveItems();
    const existingIds = items.map(item => {
      const match = item.id.match(/DI-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNum = maxId + 1;

    return `DI-${String(nextNum).padStart(3, '0')}`;
  }
}

export function createGitHubImporter(): GitHubImporter {
  return new GitHubImporter();
}

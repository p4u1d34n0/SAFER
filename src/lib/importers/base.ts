import { DeliveryItem } from '../types';

export interface ImportedItem {
  title: string;
  description: string;
  source: {
    platform: 'github' | 'jira' | 'bitbucket' | 'monday' | 'confluence';
    id: string | number;
    url: string;
  };
  metadata: {
    assignee?: string;
    labels?: string[];
    dueDate?: string;
    priority?: string;
    status?: string;
  };
}

export interface ImportOptions {
  assignedToMe?: boolean;
  label?: string;
  state?: 'open' | 'closed' | 'all';
  limit?: number;
  since?: Date;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  items: DeliveryItem[];
}

export abstract class BaseImporter {
  abstract name: string;
  abstract platform: string;

  /**
   * Fetch items from external platform
   */
  abstract fetchItems(options: ImportOptions): Promise<ImportedItem[]>;

  /**
   * Check if importer is configured and ready
   */
  abstract isConfigured(): boolean;

  /**
   * Convert imported item to SAFER delivery item
   */
  convertToDeliveryItem(imported: ImportedItem, wipSlot: number): Partial<DeliveryItem> {
    const now = new Date().toISOString();

    return {
      scope: {
        title: imported.title,
        description: imported.description,
        outcome: `Complete: ${imported.title}`,
        who: imported.metadata.assignee || 'Team',
        when: imported.metadata.dueDate || this.calculateDefaultDueDate(),
        context: `Imported from ${imported.source.platform}`,
        constraints: [],
        risks: [],
      },
      align: {
        objectives: this.extractObjectives(imported),
        stakeholders: imported.metadata.assignee ? [imported.metadata.assignee] : [],
        dependencies: [],
        value: `Addresses ${imported.source.platform} ${imported.source.id}`,
      },
      fence: {
        timeBox: {
          duration: 90,
          unit: 'minutes',
          sessions: [],
        },
        definitionOfDone: this.generateDoD(imported),
        wipSlot: wipSlot,
      },
      execute: {
        commits: [],
        branches: [],
        workLog: [
          {
            timestamp: now,
            action: `Imported from ${imported.source.platform}`,
            notes: `Source: ${imported.source.url}`,
          },
        ],
        github: imported.source.platform === 'github' ? {
          pullRequests: [],
          issues: [imported.source.id as number],
          lastSync: now,
        } : undefined,
      },
      review: {
        stressLevel: this.estimateStressLevel(imported),
        incidents: 0,
        blockers: [],
        learnings: [],
        nextActions: [`Review ${imported.source.platform} ${imported.source.id} for details`],
      },
      metrics: {
        cycleTime: null,
        completionRate: 0,
        actualTimeSpent: 0,
        plannedTimeSpent: 90,
      },
    };
  }

  /**
   * Extract objectives from imported item
   */
  private extractObjectives(imported: ImportedItem): string[] {
    const objectives: string[] = [];

    // Add priority as objective
    if (imported.metadata.priority) {
      objectives.push(`Priority: ${imported.metadata.priority}`);
    }

    // Add labels as objectives
    if (imported.metadata.labels && imported.metadata.labels.length > 0) {
      objectives.push(...imported.metadata.labels.map(label => `Label: ${label}`));
    }

    // Default objective
    if (objectives.length === 0) {
      objectives.push('Complete assigned work');
    }

    return objectives;
  }

  /**
   * Generate Definition of Done items from imported item
   */
  private generateDoD(imported: ImportedItem): Array<{ id: string; text: string; completed: boolean; completedAt: string | null }> {
    const dodItems = [];

    // Standard DoD items
    dodItems.push({
      id: 'dod-1',
      text: 'Implementation complete',
      completed: false,
      completedAt: null,
    });

    dodItems.push({
      id: 'dod-2',
      text: 'Code reviewed',
      completed: false,
      completedAt: null,
    });

    dodItems.push({
      id: 'dod-3',
      text: 'Tests written and passing',
      completed: false,
      completedAt: null,
    });

    // Add platform-specific DoD
    if (imported.source.platform === 'github') {
      dodItems.push({
        id: 'dod-4',
        text: 'GitHub issue/PR closed',
        completed: false,
        completedAt: null,
      });
    }

    return dodItems;
  }

  /**
   * Estimate stress level based on priority/labels
   */
  private estimateStressLevel(imported: ImportedItem): number {
    const priority = imported.metadata.priority?.toLowerCase();

    if (priority === 'critical' || priority === 'urgent' || priority === 'high') {
      return 4;
    } else if (priority === 'medium') {
      return 3;
    } else {
      return 2;
    }
  }

  /**
   * Calculate default due date (7 days from now)
   */
  private calculateDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }
}

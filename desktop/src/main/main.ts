import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { execSync } from 'child_process';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;

// SAFER CLI Bridge
class SAFERBridge {
  private saferPath: string;

  constructor() {
    // Try to find safer in PATH
    try {
      this.saferPath = execSync('which safer', { encoding: 'utf-8' }).trim();
    } catch (error) {
      // Fallback to common locations
      this.saferPath = '/usr/local/bin/safer';
    }
  }

  async listItems(): Promise<any[]> {
    try {
      const output = execSync(`${this.saferPath} list --json`, {
        encoding: 'utf-8'
      });
      const data = JSON.parse(output);
      return data.active || [];
    } catch (error) {
      console.error('Error listing items:', error);
      return [];
    }
  }

  async createItem(title: string): Promise<void> {
    try {
      // Use /dev/null for stdin to prevent interactive prompts
      execSync(`${this.saferPath} create "${title.replace(/"/g, '\\"')}" < /dev/null`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async getStatus(): Promise<any> {
    try {
      const output = execSync(`${this.saferPath} status --verbose`, {
        encoding: 'utf-8'
      });
      return { output };
    } catch (error) {
      console.error('Error getting status:', error);
      return { output: 'Error loading status' };
    }
  }

  async showItem(id: string): Promise<any> {
    try {
      const output = execSync(`${this.saferPath} show ${id} --json`, {
        encoding: 'utf-8'
      });
      return JSON.parse(output);
    } catch (error) {
      console.error('Error showing item:', error);
      throw error;
    }
  }

  async getConfig(): Promise<any> {
    try {
      const fs = require('fs');
      const os = require('os');
      const configPath = path.join(os.homedir(), '.safer', 'config.json');
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading config:', error);
      throw error;
    }
  }

  getSystemStatus(): any {
    try {
      const fs = require('fs');
      const os = require('os');
      const saferDir = path.join(os.homedir(), '.safer');
      const configPath = path.join(saferDir, 'config.json');
      const gitDir = path.join(saferDir, '.git');
      const itemsDir = path.join(saferDir, 'data', 'items');

      // Load config
      let config: any = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Count active items
      let activeItems = 0;
      if (fs.existsSync(itemsDir)) {
        activeItems = fs.readdirSync(itemsDir).filter((f: string) => f.endsWith('.json')).length;
      }

      // Check git status
      let gitInitialized = fs.existsSync(gitDir);
      let uncommittedChanges = false;
      if (gitInitialized) {
        try {
          const result = execSync('git status --porcelain', { cwd: saferDir, encoding: 'utf-8' });
          uncommittedChanges = result.trim().length > 0;
        } catch (e) {
          // Git check failed
        }
      }

      // Check GitHub status
      let githubEnabled = config.github?.enabled || false;
      let githubConnected = false;
      if (githubEnabled && config.github?.token) {
        githubConnected = true;
      }

      return {
        location: saferDir,
        user: config.user || { name: 'Unknown', email: '' },
        wip: {
          current: activeItems,
          max: config.limits?.maxWIP || 3,
        },
        git: {
          initialized: gitInitialized,
          autoCommit: config.git?.autoCommit || false,
          uncommittedChanges,
          remoteSync: config.git?.remoteSync || false,
        },
        integrations: {
          calendar: config.calendar?.enabled || false,
          gitHooks: config.hooks?.enabled || false,
          github: githubEnabled,
          githubConnected,
          dashboardPort: config.dashboard?.port || 3456,
        },
        review: config.review || { enforced: false, dayOfWeek: 1, gracePeriodHours: 24 },
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return null;
    }
  }

  async setConfig(key: string, value: any): Promise<void> {
    try {
      execSync(`${this.saferPath} config set ${key} "${JSON.stringify(value).replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error setting config:', error);
      throw error;
    }
  }

  async saveConfig(config: any): Promise<void> {
    try {
      const fs = require('fs');
      const os = require('os');
      const configPath = path.join(os.homedir(), '.safer', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async getDod(id: string): Promise<any> {
    try {
      const output = execSync(`${this.saferPath} dod ${id} --json`, {
        encoding: 'utf-8'
      });
      return JSON.parse(output);
    } catch (error) {
      console.error('Error getting DoD:', error);
      throw error;
    }
  }

  async checkDod(id: string, dodId: string): Promise<void> {
    try {
      execSync(`${this.saferPath} dod ${id} --check ${dodId}`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error checking DoD item:', error);
      throw error;
    }
  }

  async uncheckDod(id: string, dodId: string): Promise<void> {
    try {
      execSync(`${this.saferPath} dod ${id} --uncheck ${dodId}`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error unchecking DoD item:', error);
      throw error;
    }
  }

  async addDod(id: string, text: string): Promise<void> {
    try {
      execSync(`${this.saferPath} dod ${id} --add "${text.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error adding DoD item:', error);
      throw error;
    }
  }

  async completeItem(id: string, options: { stressLevel: number; learnings: string; incidents: number; archive: boolean }): Promise<void> {
    try {
      let cmd = `${this.saferPath} complete ${id} --stress ${options.stressLevel} --yes`;
      if (options.learnings) {
        // Escape quotes in learnings for shell
        const escapedLearnings = options.learnings.replace(/"/g, '\\"');
        cmd += ` --learnings "${escapedLearnings}"`;
      }
      if (options.incidents > 0) {
        cmd += ` --incidents ${options.incidents}`;
      }
      if (options.archive) {
        cmd += ' --archive';
      }
      execSync(cmd, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error completing item:', error);
      throw error;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      execSync(`${this.saferPath} delete ${id} --force`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async archiveItem(id: string): Promise<void> {
    try {
      execSync(`${this.saferPath} archive ${id}`, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error archiving item:', error);
      throw error;
    }
  }

  async getGitHubProjects(): Promise<any[]> {
    try {
      const output = execSync(`${this.saferPath} github:status`, {
        encoding: 'utf-8'
      });

      // For now, return a hardcoded project list
      // In a real implementation, we'd parse GitHub API response
      return [
        { id: '5', name: 'OOP Roadmap', url: 'https://github.com/orgs/oxfordop/projects/5' }
      ];
    } catch (error) {
      console.error('Error getting GitHub projects:', error);
      return [];
    }
  }

  async requestGitHubProjectScope(): Promise<{ success: boolean; error?: string }> {
    try {
      // Run gh auth refresh with read:project scope
      // This will open the user's browser for authentication
      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const process = spawn('gh', ['auth', 'refresh', '-s', 'read:project'], {
          stdio: 'inherit', // This allows the command to interact with the terminal
          detached: false
        });

        process.on('close', (code: number) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `Authentication failed with code ${code}` });
          }
        });

        process.on('error', (error: Error) => {
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.error('Error requesting GitHub project scope:', error);
      return { success: false, error: String(error) };
    }
  }

  async getProjectItems(projectNumber: string): Promise<any[]> {
    try {
      // Use gh CLI to get project items
      const output = execSync(`gh project item-list ${projectNumber} --owner oxfordop --format json`, {
        encoding: 'utf-8'
      });

      const data = JSON.parse(output);
      const items: any[] = [];

      // Transform gh project output to our format
      if (data.items) {
        for (const item of data.items) {
          if (item.content) {
            // Get status from project fields
            let status = null;
            if (item.status) {
              status = item.status;
            } else if (item.fieldValues) {
              // Try to find status in field values
              const statusField = item.fieldValues.find((f: any) =>
                f.field && f.field.name && f.field.name.toLowerCase().includes('status')
              );
              if (statusField) {
                status = statusField.name || statusField.value;
              }
            }

            // Skip items that are marked as Done/Completed
            if (status) {
              const statusLower = status.toLowerCase();
              if (statusLower.includes('done') ||
                  statusLower.includes('complete') ||
                  statusLower.includes('closed')) {
                continue; // Skip this item
              }
            }

            // Also check if the underlying issue/PR is closed
            if (item.content.state && item.content.state.toLowerCase() === 'closed') {
              continue; // Skip closed issues/PRs
            }

            items.push({
              id: `github-${item.content.number}`,
              githubNumber: item.content.number,
              title: item.content.title,
              type: item.content.type === 'PullRequest' ? 'pr' : 'issue',
              url: item.content.url,
              labels: item.content.labels || [],
              assignee: item.assignees?.[0] || null,
              number: item.content.number,
              status: status,
              state: item.content.state || 'open'
            });
          }
        }
      }

      return items;
    } catch (error) {
      console.error('Error getting project items:', error);
      throw error;
    }
  }

  async importList(source: string): Promise<any[]> {
    try {
      const output = execSync(`${this.saferPath} import:list ${source}`, {
        encoding: 'utf-8'
      });

      // Parse the text output
      const items: any[] = [];
      const lines = output.split('\n');
      let currentItem: any = null;

      for (const line of lines) {
        // Match numbered items like "1. Title"
        const titleMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (titleMatch) {
          if (currentItem) {
            items.push(currentItem);
          }
          currentItem = {
            number: titleMatch[1],
            title: titleMatch[2],
            type: 'issue',
            labels: []
          };
          continue;
        }

        if (!currentItem) continue;

        // Match ID line like "   ID:      github #1850"
        const idMatch = line.match(/^\s+ID:\s+github #(\d+)/);
        if (idMatch) {
          currentItem.id = `github-${idMatch[1]}`;
          currentItem.githubNumber = idMatch[1];
          continue;
        }

        // Match URL line
        const urlMatch = line.match(/^\s+URL:\s+(.+)$/);
        if (urlMatch) {
          currentItem.url = urlMatch[1].trim();
          continue;
        }

        // Match Labels line
        const labelsMatch = line.match(/^\s+Labels:\s+(.+)$/);
        if (labelsMatch) {
          currentItem.labels = labelsMatch[1].split(',').map((l: string) => l.trim());
          continue;
        }

        // Match Assignee line
        const assigneeMatch = line.match(/^\s+Assignee:\s+(.+)$/);
        if (assigneeMatch) {
          currentItem.assignee = assigneeMatch[1].trim();
          continue;
        }
      }

      // Don't forget the last item
      if (currentItem) {
        items.push(currentItem);
      }

      return items;
    } catch (error) {
      console.error('Error listing imports:', error);
      throw error;
    }
  }

  async importItem(source: string, options: any): Promise<void> {
    try {
      let cmd = `${this.saferPath} import ${source}`;

      if (options.assignedToMe) {
        cmd += ' --assigned-to-me';
      }
      if (options.label) {
        cmd += ` --label "${options.label}"`;
      }
      if (options.state) {
        cmd += ` --state ${options.state}`;
      }
      if (options.limit) {
        cmd += ` --limit ${options.limit}`;
      }
      if (options.dryRun) {
        cmd += ' --dry-run';
      }

      execSync(cmd, {
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('Error importing item:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<any> {
    try {
      const fs = require('fs');
      const os = require('os');
      const archivePath = path.join(os.homedir(), '.safer', 'data', 'archive');

      if (!fs.existsSync(archivePath)) {
        return {};
      }

      // Collect all archived items
      const archivedItems: any[] = [];

      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.name.endsWith('.json')) {
            try {
              const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
              archivedItems.push(data);
            } catch (e) {
              // Skip invalid files
            }
          }
        }
      };

      scanDir(archivePath);

      if (archivedItems.length === 0) {
        return {};
      }

      // Calculate metrics
      const totalCompleted = archivedItems.length;
      const totalStress = archivedItems.reduce((sum, item) => sum + (item.review?.stressLevel || 0), 0);
      const averageStress = totalStress / totalCompleted;
      const totalIncidents = archivedItems.reduce((sum, item) => sum + (item.review?.incidents || 0), 0);
      const totalCycleTime = archivedItems.reduce((sum, item) => sum + (item.metrics?.cycleTime || 0), 0);
      const averageCycleTime = totalCycleTime / totalCompleted;

      // Calculate weekly trend (items completed in last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyCompleted = archivedItems.filter(item => {
        const updated = new Date(item.updated);
        return updated >= oneWeekAgo;
      }).length;

      // Calculate total focus time
      const totalFocusMinutes = archivedItems.reduce((sum, item) => {
        const sessions = item.fence?.timeBox?.sessions || [];
        return sum + sessions.reduce((sSum: number, s: any) => sSum + (s.duration || 0), 0);
      }, 0);

      return {
        totalCompleted,
        averageStress,
        totalIncidents,
        averageCycleTime,
        weeklyTrend: weeklyCompleted,
        totalFocusMinutes,
        currentStreak: 0, // TODO: calculate streak
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return {};
    }
  }

  async getReviews(): Promise<any[]> {
    try {
      const fs = require('fs');
      const os = require('os');
      const reviewsPath = path.join(os.homedir(), '.safer', 'data', 'reviews');
      if (!fs.existsSync(reviewsPath)) {
        return [];
      }
      const files = fs.readdirSync(reviewsPath)
        .filter((f: string) => f.endsWith('.md'))
        .sort()
        .reverse();

      return files.map((file: string) => {
        const content = fs.readFileSync(path.join(reviewsPath, file), 'utf-8');
        return {
          filename: file,
          week: file.replace('.md', ''),
          content
        };
      });
    } catch (error) {
      console.error('Error reading reviews:', error);
      return [];
    }
  }

  async createReview(options: {
    wentWell: string;
    didntGoWell: string;
    blockers: string;
    learnings: string;
    adjustments: string;
  }): Promise<void> {
    try {
      let cmd = `${this.saferPath} review --yes`;
      if (options.wentWell) {
        const escaped = options.wentWell.replace(/"/g, '\\"');
        cmd += ` --went-well "${escaped}"`;
      }
      if (options.didntGoWell) {
        const escaped = options.didntGoWell.replace(/"/g, '\\"');
        cmd += ` --didnt-go-well "${escaped}"`;
      }
      if (options.blockers) {
        const escaped = options.blockers.replace(/"/g, '\\"');
        cmd += ` --blockers "${escaped}"`;
      }
      if (options.learnings) {
        const escaped = options.learnings.replace(/"/g, '\\"');
        cmd += ` --learnings "${escaped}"`;
      }
      if (options.adjustments) {
        const escaped = options.adjustments.replace(/"/g, '\\"');
        cmd += ` --adjustments "${escaped}"`;
      }
      execSync(cmd, { encoding: 'utf-8' });
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  async updateReview(weekId: string): Promise<void> {
    try {
      const fs = require('fs');
      const os = require('os');
      const reviewPath = path.join(os.homedir(), '.safer', 'data', 'reviews', `${weekId}.md`);

      // Parse existing review to preserve reflections
      let wentWell = '';
      let didntGoWell = '';
      let blockers = '';
      let learnings = '';
      let adjustments = '';

      if (fs.existsSync(reviewPath)) {
        const content = fs.readFileSync(reviewPath, 'utf-8');

        // Extract reflection sections using regex
        const extractSection = (heading: string): string => {
          const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|\$)`, 'i');
          const match = content.match(regex);
          if (match && match[1]) {
            const text = match[1].trim();
            // Skip if it's the default "no response" text
            if (text === '_No reflections recorded_' || text === '_No response_' || text === '_None_') {
              return '';
            }
            return text;
          }
          return '';
        };

        wentWell = extractSection('What Went Well');
        didntGoWell = extractSection("What Didn't Go Well");
        blockers = extractSection('Blockers');
        learnings = extractSection('Key Learnings');
        adjustments = extractSection('Adjustments for Next Week');
      }

      // Regenerate review with fresh metrics but preserved reflections
      await this.createReview({
        wentWell,
        didntGoWell,
        blockers,
        learnings,
        adjustments,
      });
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  checkReviewStatus(): { needed: boolean; weekId: string; daysOverdue: number } {
    try {
      const fs = require('fs');
      const os = require('os');
      const configPath = path.join(os.homedir(), '.safer', 'config.json');
      const reviewsPath = path.join(os.homedir(), '.safer', 'data', 'reviews');

      // Load config
      let config = { review: { enforced: true, dayOfWeek: 1, gracePeriodHours: 24 } };
      if (fs.existsSync(configPath)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
      }

      if (!config.review?.enforced) {
        return { needed: false, weekId: '', daysOverdue: 0 };
      }

      const now = new Date();
      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const reviewDayOfWeek = config.review.dayOfWeek || 1;
      const gracePeriodHours = config.review.gracePeriodHours || 24;

      // Calculate previous week's ID
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Get previous week
      const prevWeekDate = new Date(now);
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      const prevWeekNum = getWeekNumber(prevWeekDate);
      const prevWeekYear = prevWeekDate.getFullYear();
      const prevWeekId = `${prevWeekYear}-W${prevWeekNum.toString().padStart(2, '0')}`;

      // Check if previous week's review exists
      const reviewPath = path.join(reviewsPath, `${prevWeekId}.md`);
      const reviewExists = fs.existsSync(reviewPath);

      if (reviewExists) {
        return { needed: false, weekId: prevWeekId, daysOverdue: 0 };
      }

      // Check if there were any items completed in the previous week
      const archivePath = path.join(os.homedir(), '.safer', 'data', 'archive');
      let hasItemsFromPrevWeek = false;

      if (fs.existsSync(archivePath)) {
        const scanDir = (dir: string): boolean => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (scanDir(fullPath)) return true;
            } else if (entry.name.endsWith('.json')) {
              try {
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                const itemDate = new Date(data.updated);
                const itemWeek = getWeekNumber(itemDate);
                const itemYear = itemDate.getFullYear();
                if (itemWeek === prevWeekNum && itemYear === prevWeekYear) {
                  return true;
                }
              } catch (e) {
                // Skip invalid files
              }
            }
          }
          return false;
        };
        hasItemsFromPrevWeek = scanDir(archivePath);
      }

      // No items completed last week - no review needed
      if (!hasItemsFromPrevWeek) {
        return { needed: false, weekId: prevWeekId, daysOverdue: 0 };
      }

      // Check if we're within the review window (review day + grace period)
      // Calculate days since review day this week
      let daysSinceReviewDay = currentDayOfWeek - reviewDayOfWeek;
      if (daysSinceReviewDay < 0) {
        daysSinceReviewDay += 7;
      }

      const hoursSinceReviewDay = daysSinceReviewDay * 24 + now.getHours();

      // If we haven't reached review day yet this week, no reminder needed
      if (daysSinceReviewDay < 0 || (daysSinceReviewDay === 0 && now.getHours() < 9)) {
        return { needed: false, weekId: prevWeekId, daysOverdue: 0 };
      }

      // If within grace period, show reminder
      if (hoursSinceReviewDay <= gracePeriodHours) {
        return { needed: true, weekId: prevWeekId, daysOverdue: daysSinceReviewDay };
      }

      // Past grace period - still show reminder but mark as overdue
      return { needed: true, weekId: prevWeekId, daysOverdue: daysSinceReviewDay };
    } catch (error) {
      console.error('Error checking review status:', error);
      return { needed: false, weekId: '', daysOverdue: 0 };
    }
  }

  async startFocusBlock(id: string): Promise<void> {
    try {
      execSync(`${this.saferPath} start ${id}`, {
        encoding: 'utf-8',
        env: { ...process.env, SAFER_NON_INTERACTIVE: '1' }
      });
    } catch (error) {
      console.error('Error starting focus block:', error);
      throw error;
    }
  }

  async stopFocusBlock(): Promise<void> {
    try {
      // Stop current focus block with empty notes input
      execSync(`echo "" | ${this.saferPath} stop`, {
        encoding: 'utf-8',
        shell: '/bin/bash'
      });
    } catch (error) {
      console.error('Error stopping focus block:', error);
      throw error;
    }
  }
}

const safer = new SAFERBridge();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    title: 'SAFER',
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
function setupIPC() {
  ipcMain.handle('safer:list', async () => {
    return await safer.listItems();
  });

  ipcMain.handle('safer:create', async (event, title: string) => {
    await safer.createItem(title);
    return { success: true };
  });

  ipcMain.handle('safer:status', async () => {
    return await safer.getStatus();
  });

  ipcMain.handle('safer:system-status', async () => {
    return safer.getSystemStatus();
  });

  ipcMain.handle('safer:show', async (event, id: string) => {
    return await safer.showItem(id);
  });

  ipcMain.handle('safer:config:get', async () => {
    return await safer.getConfig();
  });

  ipcMain.handle('safer:config:set', async (event, key: string, value: any) => {
    await safer.setConfig(key, value);
    return { success: true };
  });

  ipcMain.handle('safer:config:save', async (event, config: any) => {
    await safer.saveConfig(config);
    return { success: true };
  });

  ipcMain.handle('safer:dod:get', async (event, id: string) => {
    return await safer.getDod(id);
  });

  ipcMain.handle('safer:dod:check', async (event, id: string, dodId: string) => {
    await safer.checkDod(id, dodId);
    return { success: true };
  });

  ipcMain.handle('safer:dod:uncheck', async (event, id: string, dodId: string) => {
    await safer.uncheckDod(id, dodId);
    return { success: true };
  });

  ipcMain.handle('safer:dod:add', async (event, id: string, text: string) => {
    await safer.addDod(id, text);
    return { success: true };
  });

  ipcMain.handle('safer:complete', async (event, id: string, options: { stressLevel: number; learnings: string; incidents: number; archive: boolean }) => {
    await safer.completeItem(id, options);
    return { success: true };
  });

  ipcMain.handle('safer:delete', async (event, id: string) => {
    await safer.deleteItem(id);
    return { success: true };
  });

  ipcMain.handle('safer:archive', async (event, id: string) => {
    await safer.archiveItem(id);
    return { success: true };
  });

  ipcMain.handle('safer:import:list', async (event, source: string) => {
    return await safer.importList(source);
  });

  ipcMain.handle('safer:import', async (event, source: string, options: any) => {
    await safer.importItem(source, options);
    return { success: true };
  });

  ipcMain.handle('safer:github:projects', async () => {
    return await safer.getGitHubProjects();
  });

  ipcMain.handle('safer:github:project-items', async (event, projectNumber: string) => {
    return await safer.getProjectItems(projectNumber);
  });

  ipcMain.handle('safer:github:request-scope', async () => {
    return await safer.requestGitHubProjectScope();
  });

  ipcMain.handle('safer:metrics', async () => {
    return await safer.getMetrics();
  });

  ipcMain.handle('safer:reviews', async () => {
    return await safer.getReviews();
  });

  ipcMain.handle('safer:review:create', async (event, options: {
    wentWell: string;
    didntGoWell: string;
    blockers: string;
    learnings: string;
    adjustments: string;
  }) => {
    await safer.createReview(options);
    return { success: true };
  });

  ipcMain.handle('safer:review:update', async (event, weekId: string) => {
    await safer.updateReview(weekId);
    return { success: true };
  });

  ipcMain.handle('safer:review:check', async () => {
    return safer.checkReviewStatus();
  });

  ipcMain.handle('safer:start', async (event, id: string) => {
    await safer.startFocusBlock(id);
    return { success: true };
  });

  ipcMain.handle('safer:stop', async () => {
    await safer.stopFocusBlock();
    return { success: true };
  });
}

// App lifecycle
app.on('ready', () => {
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

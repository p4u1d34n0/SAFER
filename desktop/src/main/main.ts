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
      execSync(`${this.saferPath} create "${title.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8'
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

  async completeItem(id: string, stressLevel: number): Promise<void> {
    try {
      execSync(`${this.saferPath} complete ${id} --stress ${stressLevel}`, {
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
      const metricsPath = path.join(os.homedir(), '.safer', 'data', 'metrics', 'summary.json');
      if (fs.existsSync(metricsPath)) {
        const data = fs.readFileSync(metricsPath, 'utf-8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Error reading metrics:', error);
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

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

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

  ipcMain.handle('safer:complete', async (event, id: string, stressLevel: number) => {
    await safer.completeItem(id, stressLevel);
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

import fs from 'fs';
import path from 'path';
import os from 'os';
import { DeliveryItem, SaferConfig, RepositoryConfig } from './types';

// Constants
export const SAFER_DIR = path.join(os.homedir(), '.safer');
export const DATA_DIR = path.join(SAFER_DIR, 'data');
export const ACTIVE_DIR = path.join(DATA_DIR, 'active');
export const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
export const REVIEWS_DIR = path.join(DATA_DIR, 'reviews');
export const METRICS_DIR = path.join(DATA_DIR, 'metrics');
export const REPOS_DIR = path.join(SAFER_DIR, 'repos');
export const TEMPLATES_DIR = path.join(SAFER_DIR, 'templates');
export const CONFIG_FILE = path.join(SAFER_DIR, 'config.json');

// Default configuration
export const DEFAULT_CONFIG: SaferConfig = {
  version: '1.0.0',
  user: {
    name: '',
    email: '',
    timezone: 'Europe/London',
  },
  limits: {
    maxWIP: 3,
    defaultTimeBox: 90,
    reviewFrequency: 'weekly',
  },
  git: {
    autoCommit: true,
    commitPrefix: '[SAFER]',
    remoteSync: false,
    remoteName: 'origin',
    remoteBranch: 'main',
  },
  calendar: {
    enabled: false,
    calendarName: 'Work',
    focusBlockColor: 'blue',
    reviewReminderColor: 'green',
    defaultFocusBlockDuration: 90,
    reviewDay: 'Friday',
    reviewTime: '16:00',
  },
  dashboard: {
    port: 3456,
    autoOpen: false,
    refreshInterval: 30,
  },
  hooks: {
    enabled: true,
    enforceDoD: true,
    requireItemLink: false,
    repositories: [],
  },
  notifications: {
    desktop: true,
    sound: false,
  },
};

// Ensure directory exists
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Check if SAFER is initialized
export function isInitialized(): boolean {
  return fs.existsSync(SAFER_DIR) && fs.existsSync(CONFIG_FILE);
}

// Load configuration
export function loadConfig(): SaferConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(content);
}

// Save configuration
export function saveConfig(config: SaferConfig): void {
  ensureDir(SAFER_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get config value by path (e.g., 'limits.maxWIP')
export function getConfigValue(keyPath: string): any {
  const config = loadConfig();
  const keys = keyPath.split('.');
  let value: any = config;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

// Set config value by path
export function setConfigValue(keyPath: string, value: any): void {
  const config = loadConfig();
  const keys = keyPath.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  saveConfig(config);
}

// Generate next delivery item ID
export function generateNextId(): string {
  const items = listActiveItems();
  const archivedItems = listArchivedItems();
  const allItems = [...items, ...archivedItems];

  if (allItems.length === 0) {
    return 'DI-001';
  }

  const ids = allItems.map(item => {
    const match = item.id.match(/DI-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const maxId = Math.max(...ids);
  return `DI-${String(maxId + 1).padStart(3, '0')}`;
}

// List active delivery items
export function listActiveItems(): DeliveryItem[] {
  ensureDir(ACTIVE_DIR);
  const files = fs.readdirSync(ACTIVE_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(ACTIVE_DIR, file), 'utf-8');
    return JSON.parse(content) as DeliveryItem;
  }).sort((a, b) => a.fence.wipSlot - b.fence.wipSlot);
}

// List archived delivery items
export function listArchivedItems(): DeliveryItem[] {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    return [];
  }

  const items: DeliveryItem[] = [];
  const years = fs.readdirSync(ARCHIVE_DIR).filter(f =>
    fs.statSync(path.join(ARCHIVE_DIR, f)).isDirectory()
  );

  for (const year of years) {
    const yearPath = path.join(ARCHIVE_DIR, year);
    const months = fs.readdirSync(yearPath).filter(f =>
      fs.statSync(path.join(yearPath, f)).isDirectory()
    );

    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(monthPath, file), 'utf-8');
        items.push(JSON.parse(content) as DeliveryItem);
      }
    }
  }

  return items.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
}

// Get delivery item by ID
export function getItem(id: string): DeliveryItem | null {
  // Check active items
  const activePath = path.join(ACTIVE_DIR, `${id}.json`);
  if (fs.existsSync(activePath)) {
    const content = fs.readFileSync(activePath, 'utf-8');
    return JSON.parse(content);
  }

  // Check archived items
  const archivedItems = listArchivedItems();
  const item = archivedItems.find(i => i.id === id);
  return item || null;
}

// Save delivery item
export function saveItem(item: DeliveryItem): void {
  ensureDir(ACTIVE_DIR);
  item.updated = new Date().toISOString();
  const filePath = path.join(ACTIVE_DIR, `${item.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
}

// Archive delivery item
export function archiveItem(item: DeliveryItem): void {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const archivePath = path.join(ARCHIVE_DIR, year, month);
  ensureDir(archivePath);

  item.status = 'archived';
  item.updated = now.toISOString();

  const filePath = path.join(archivePath, `${item.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item, null, 2));

  // Remove from active
  const activePath = path.join(ACTIVE_DIR, `${item.id}.json`);
  if (fs.existsSync(activePath)) {
    fs.unlinkSync(activePath);
  }
}

// Delete delivery item
export function deleteItem(id: string): boolean {
  const activePath = path.join(ACTIVE_DIR, `${id}.json`);
  if (fs.existsSync(activePath)) {
    fs.unlinkSync(activePath);
    return true;
  }
  return false;
}

// Check WIP limit
export function checkWipLimit(): { isWithinLimit: boolean; currentWip: number; maxWip: number } {
  const config = loadConfig();
  const activeItems = listActiveItems();
  const currentWip = activeItems.length;
  const maxWip = config.limits.maxWIP;

  return {
    isWithinLimit: currentWip < maxWip,
    currentWip,
    maxWip,
  };
}

// Get next available WIP slot
export function getNextWipSlot(): number {
  const activeItems = listActiveItems();
  const usedSlots = activeItems.map(item => item.fence.wipSlot);

  for (let slot = 1; slot <= 3; slot++) {
    if (!usedSlots.includes(slot)) {
      return slot;
    }
  }

  return 1; // Fallback (shouldn't happen if WIP limit is enforced)
}

// Repository configuration
export function getRepoConfig(repoPath: string): RepositoryConfig | null {
  const repoHash = Buffer.from(repoPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const configPath = path.join(REPOS_DIR, `${repoHash}.json`);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content);
}

// Save repository configuration
export function saveRepoConfig(config: RepositoryConfig): void {
  ensureDir(REPOS_DIR);
  const repoHash = Buffer.from(config.repoPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const configPath = path.join(REPOS_DIR, `${repoHash}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// List all repository configurations
export function listRepoConfigs(): RepositoryConfig[] {
  if (!fs.existsSync(REPOS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(REPOS_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(REPOS_DIR, file), 'utf-8');
    return JSON.parse(content) as RepositoryConfig;
  });
}

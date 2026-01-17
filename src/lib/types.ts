// Core TypeScript types for SAFER framework

export interface SaferConfig {
  version: string;
  user: {
    name: string;
    email: string;
    timezone: string;
  };
  limits: {
    maxWIP: number;
    defaultTimeBox: number;
    reviewFrequency: 'weekly' | 'biweekly';
  };
  git: {
    autoCommit: boolean;
    commitPrefix: string;
    remoteSync: boolean;
    remoteName: string;
    remoteBranch: string;
  };
  calendar: {
    enabled: boolean;
    calendarName: string;
    focusBlockColor: string;
    reviewReminderColor: string;
    defaultFocusBlockDuration: number;
    reviewDay: string;
    reviewTime: string;
  };
  dashboard: {
    port: number;
    autoOpen: boolean;
    refreshInterval: number;
  };
  hooks: {
    enabled: boolean;
    enforceDoD: boolean;
    requireItemLink: boolean;
    repositories: string[];
  };
  notifications: {
    desktop: boolean;
    sound: boolean;
  };
  github?: {
    enabled: boolean;
    owner: string;
    repo: string;
    token: string;
    branch: string;
    linkPRs: boolean;
    linkIssues: boolean;
    showCommits: boolean;
    showBuildStatus: boolean;
  };
}

export interface DeliveryItem {
  id: string;
  version: string;
  created: string;
  updated: string;
  status: 'active' | 'completed' | 'archived' | 'blocked';

  scope: {
    title: string;
    description: string;
    outcome: string;
    who: string;
    when: string;
    context?: string;
    constraints?: string[];
    risks?: string[];
  };

  align: {
    objectives: string[];
    stakeholders: string[];
    dependencies: string[];
    value: string;
  };

  fence: {
    timeBox: {
      duration: number;
      unit: 'minutes';
      sessions: FocusSession[];
    };
    definitionOfDone: DoDItem[];
    wipSlot: number;
  };

  execute: {
    commits: string[];
    branches: string[];
    workLog: WorkLogEntry[];
    github?: {
      pullRequests: number[];
      issues: number[];
      lastSync: string | null;
    };
  };

  review: {
    stressLevel: number;
    incidents: number;
    blockers: string[];
    learnings: string[];
    nextActions: string[];
  };

  metrics: {
    cycleTime: number | null;
    completionRate: number;
    actualTimeSpent: number;
    plannedTimeSpent: number;
  };
}

export interface FocusSession {
  start: string;
  end: string | null;
  duration: number | null;
  actualMinutes?: number;
  interruptions?: number;
  notes?: string;
}

export interface DoDItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
}

export interface WorkLogEntry {
  timestamp: string;
  action: string;
  notes?: string;
}

export interface WeeklyReview {
  week: string;
  date: string;
  duration: number;
  summary: {
    itemsCompleted: number;
    itemsInProgress: number;
    wipCompliance: number;
    averageStressLevel: number;
    totalIncidents: number;
  };
  completed: CompletedItemSummary[];
  inProgress: InProgressItemSummary[];
  metrics: {
    completionRate: number;
    averageCycleTime: number;
    wipViolations: number;
    dodCompliance: number;
  };
  insights: string[];
  actions: string[];
  retrospective: {
    wentWell: string[];
    needsImprovement: string[];
    willTry: string[];
  };
}

export interface CompletedItemSummary {
  id: string;
  title: string;
  cycleTime: number;
  stressLevel: number;
  learnings?: string;
}

export interface InProgressItemSummary {
  id: string;
  title: string;
  daysInProgress: number;
}

export interface MetricsSummary {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  totals: {
    itemsCreated: number;
    itemsCompleted: number;
    itemsActive: number;
    itemsBlocked: number;
  };
  wipMetrics: {
    averageWIP: number;
    maxWIPViolations: number;
    wipDistribution: Record<string, number>;
  };
  completionMetrics: {
    completionRate: number;
    averageCycleTime: number;
    cycleTimeDistribution: Record<string, number>;
  };
  qualityMetrics: {
    dodComplianceRate: number;
    averageStressLevel: number;
    totalIncidents: number;
    incidentRate: number;
  };
  timeMetrics: {
    totalFocusTime: number;
    averageSessionLength: number;
    timeBoxAdherence: number;
  };
  trends: {
    completionRateTrend: 'increasing' | 'decreasing' | 'stable';
    stressLevelTrend: 'increasing' | 'decreasing' | 'stable';
    cycleTimeTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface RepositoryConfig {
  repoPath: string;
  repoName: string;
  isShared: boolean;
  enforcementMode: 'personal' | 'strict' | 'disabled';
  teamSettings: {
    respectTeamConventions: boolean;
    commitMessageFormat: 'flexible' | 'strict';
    allowBypass: boolean;
    notifyOnly: boolean;
  };
  hooks: {
    preCommit: {
      enabled: boolean;
      dodCheck: 'block' | 'warn' | 'skip';
      commitFormat: 'required' | 'optional' | 'skip';
    };
    prepareCommitMsg: {
      enabled: boolean;
    };
  };
}

# SAFER Desktop App Roadmap

**From CLI to Desktop to SaaS**

## Executive Summary

The SAFER CLI (v1.0.0) is the foundation. The desktop Electron app is the product. SaaS is the business model.

**Vision**: SAFER becomes the "flight instruments" for knowledge workers - ambient, trusted, developmental.

**Timeline**: 6 months to desktop MVP, 12 months to SaaS launch

---

## Current State (January 2026)

✅ **SAFER CLI v1.0.0 published**
- Core SAFER workflow operational
- GitHub integration working
- WIP limits enforced
- DoD tracking functional
- Git auto-commit for data
- JSON-based local storage in `~/.safer/`

**What we have**: The engine
**What we need**: The interface

---

## The Architecture Evolution

### Phase 1: CLI Only (Current)
```
User → Terminal
       ↓
    SAFER CLI
       ↓
   ~/.safer/data (JSON + Git)
```

### Phase 2: Desktop App (6 months)
```
User → Desktop UI (Electron)
       ↓
    SAFER Core (TypeScript library)
       ↓
   ~/.safer/data (SQLite + Git)
```

### Phase 3: SaaS Hybrid (12 months)
```
User → Desktop UI (Electron)
       ↓
    SAFER Core
       ├─→ Local: ~/.safer/ (SQLite)
       └─→ Cloud: SAFER API (PostgreSQL)
              ↓
          Team Dashboard
          Leadership Analytics
          Cross-device Sync
```

---

## Why This Sequence Works

1. **CLI proves the model** - Already done
2. **Desktop proves the UX** - Next 6 months
3. **SaaS proves the business** - Following 6 months

Each phase validates the next.

---

## Technical Architecture

### Desktop App Stack

**Framework**: Electron
- Cross-platform (macOS, Windows, Linux)
- Native OS integration
- Mature ecosystem
- Easy distribution

**UI Layer**: React 19 + TypeScript
- Component reusability
- Strong typing
- Modern hooks
- Fast iteration

**State Management**: Zustand
- Simple, not Redux complexity
- TypeScript-first
- Minimal boilerplate

**Database**: SQLite (local)
- File-based (lives in ~/.safer/)
- Fast queries
- Git-friendly (can still track with Git)
- Easy migration to PostgreSQL later

**IPC**: Electron IPC
- Main process: File system, Git, system APIs
- Renderer process: UI
- Secure communication

**Styling**: Tailwind CSS
- Already using in dashboard
- Consistent design language
- Rapid prototyping

**Charts**: Recharts or Victory
- React-native
- Beautiful defaults
- Customizable

### Core Library Refactor

Extract CLI logic into `@safer/core`:

```typescript
// Current: src/index.ts (CLI commands)
// Future:  packages/core/src/index.ts (library)

export class SAFEREngine {
  // Data operations
  async createItem(title: string): Promise<DeliveryItem>
  async listItems(options?: ListOptions): Promise<DeliveryItem[]>
  async completeItem(id: string): Promise<void>

  // GitHub operations
  async importFromGitHub(): Promise<ImportResult>

  // Metrics
  async getMetrics(): Promise<Metrics>

  // Configuration
  async getConfig(): Promise<Config>
  async setConfig(key: string, value: any): Promise<void>
}
```

Then:
- **CLI** uses `@safer/core` → same as now, but cleaner
- **Desktop** uses `@safer/core` → same engine, different UI
- **API** uses `@safer/core` → same logic, cloud storage

---

## Desktop App UI Design

Based on the GPT conversation, here's the concrete implementation plan:

### 5 Core Screens

#### 1. Today (Default View)
**Purpose**: Daily focus dashboard

**Components**:
- Focus score gauge (reuse from web dashboard)
- Time allocation breakdown (roadmap vs ad-hoc vs reactive)
- Active contexts (OKRs, Jira tickets, unmapped work)
- Gentle prompt system

**Data Sources**:
- `listActiveItems()`
- `getMetrics()` → today's focus data
- Calendar events (via macOS Calendar API or Google Calendar API)

**Key Interaction**:
- "Map to OKR" button → opens OKR selector modal
- "Park" → marks item as deferred
- "Ignore" → dismisses prompt

#### 2. OKRs (Core Engine)
**Purpose**: Objective tracking and health

**Components**:
- Objective list with KR progress bars
- Linked signals (PRs, issues, time spent)
- Health indicators
- Suggested actions

**Data Sources**:
- OKR configuration (new feature to build)
- Linked delivery items
- GitHub PR/issue data
- Time tracking data (new feature)

**Key Interaction**:
- Click objective → drill into details
- "Link item" → associate DI with OKR
- "Protect time" → creates calendar block

#### 3. Signals (Behavioral Insights)
**Purpose**: Pattern detection and guidance

**Components**:
- Execution metrics (started/finished ratio)
- Focus metrics (context switches, deep work)
- Safety metrics (late-night coding, velocity spikes)
- Reflection status

**Data Sources**:
- Git commit history analysis (new feature)
- Calendar event analysis
- Work session tracking (new feature)
- Weekly review completion

**Key Interaction**:
- Click signal → see explanation + suggested action
- "Try this" → applies suggested experiment
- "Dismiss" → marks as acknowledged

#### 4. Review (Weekly/Monthly)
**Purpose**: Reflection and upward communication

**Components**:
- Auto-generated review text
- What moved (achievements)
- What distracted (distractions)
- Behavioral insights
- Suggested adjustments
- Export options (PDF, metrics, personal notes)

**Data Sources**:
- Completed items from period
- Unmapped work from period
- Pattern analysis
- OKR progress

**Key Interaction**:
- Edit sections (make it personal)
- Export → PDF for manager, JSON for systems
- "Share" → (future: post to Slack/email)

#### 5. Settings (Trust Zone)
**Purpose**: Privacy control and configuration

**Components**:
- Data source toggles (GitHub, Jira, Calendar, IDE)
- Privacy guarantees (explicit: no code inspection, no keystrokes)
- Notification preferences
- Sync settings (local-only vs cloud backup)

**Data Sources**:
- Configuration file

**Key Interaction**:
- Toggle integrations on/off
- Set notification limits
- Choose sync mode (local-only, backup, team-shared)

### System Tray Integration

SAFER lives in the menu bar / system tray:

```
┌─────────────────────────┐
│ SAFER                   │
├─────────────────────────┤
│ Focus Score: ●●●○○      │
│ Active: DI-002          │
├─────────────────────────┤
│ Open Dashboard          │
│ Quick Add Item          │
│ Start Focus Block       │
├─────────────────────────┤
│ Quit                    │
└─────────────────────────┘
```

**Key Principle**: App can be closed, system tray always present.

---

## Feature Roadmap

### Phase 1: Desktop MVP (Months 1-3)

**Month 1: Foundation**
- [ ] Refactor CLI into `@safer/core` library
- [ ] Set up Electron boilerplate
- [ ] Implement IPC communication
- [ ] Build "Today" view (basic)
- [ ] System tray integration
- [ ] Basic notifications

**Month 2: Core Screens**
- [ ] Build OKRs screen (new feature: OKR model + linking)
- [ ] Build Review screen (auto-generation logic)
- [ ] Build Settings screen (privacy controls)
- [ ] Calendar integration (read-only, macOS first)
- [ ] Implement gentle prompts ("Map to OKR")

**Month 3: Polish & Beta**
- [ ] Build Signals screen (pattern detection)
- [ ] Implement time tracking (focus sessions)
- [ ] Add keyboard shortcuts
- [ ] Add dark mode
- [ ] Beta test with 10 users
- [ ] Fix critical bugs

**Outcome**: Desktop app that replaces CLI for daily use

### Phase 2: Enhanced Desktop (Months 4-6)

**Month 4: IDE Integration**
- [ ] VS Code extension (lightweight signals)
- [ ] JetBrains plugin (IntelliJ, WebStorm)
- [ ] File system watcher (detect work patterns)
- [ ] Git hook integration (improved)

**Month 5: Advanced Features**
- [ ] Focus block timer with Pomodoro
- [ ] Calendar write access (create time blocks)
- [ ] Advanced pattern detection (ML-lite: simple heuristics)
- [ ] GitHub Projects integration (GraphQL)
- [ ] Smart DoD generation from issue templates

**Month 6: Distribution**
- [ ] Code signing (macOS)
- [ ] Windows installer
- [ ] Auto-update mechanism
- [ ] Crash reporting (Sentry)
- [ ] Usage analytics (privacy-first: Plausible)

**Outcome**: Production-ready desktop app, 100+ users

### Phase 3: SaaS Foundation (Months 7-9)

**Month 7: Cloud Architecture**
- [ ] SAFER API (Node.js/TypeScript + PostgreSQL)
- [ ] Authentication (OAuth 2.0)
- [ ] User accounts
- [ ] Data sync (bidirectional)
- [ ] Conflict resolution
- [ ] End-to-end encryption for sensitive data

**Month 8: Team Features**
- [ ] Team workspace model
- [ ] Shared OKRs
- [ ] Team dashboard (aggregated metrics)
- [ ] Role-based access control
- [ ] Invite system

**Month 9: Web Dashboard**
- [ ] Leadership view (team health)
- [ ] Cross-team analytics
- [ ] Export capabilities
- [ ] Integrations: Slack, Teams, Jira, Asana

**Outcome**: SaaS product ready for pilot customers

### Phase 4: Business Launch (Months 10-12)

**Month 10: Pricing & Packaging**
- [ ] Free tier: Desktop app, local-only
- [ ] Pro tier ($10/month): Cloud sync, advanced analytics
- [ ] Team tier ($25/user/month): Team dashboard, shared OKRs
- [ ] Enterprise: Custom pricing, SSO, dedicated support

**Month 11: Marketing & Sales**
- [ ] Website redesign (product-focused)
- [ ] Demo videos
- [ ] Case studies from beta users
- [ ] Content marketing (blog, newsletter)
- [ ] Community (Discord/Slack)

**Month 12: Scale**
- [ ] Customer success workflows
- [ ] Onboarding automation
- [ ] Payment processing (Stripe)
- [ ] Usage-based billing
- [ ] Referral program

**Outcome**: Paying customers, recurring revenue

---

## Data Architecture Evolution

### Current (CLI): JSON Files
```
~/.safer/
├── config.json
├── data/
│   ├── active/
│   │   ├── DI-001.json
│   │   ├── DI-002.json
│   │   └── DI-003.json
│   └── archive/
│       └── 2026/01/DI-001.json
```

**Pros**: Simple, Git-friendly
**Cons**: Slow queries, no relations, manual indexing

### Phase 2 (Desktop): SQLite
```
~/.safer/
├── safer.db (SQLite)
├── .git/ (for backups)
└── config.json
```

**Schema**:
```sql
-- Core tables
CREATE TABLE delivery_items (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  scope JSON,
  fence JSON,
  execute JSON,
  review JSON
);

CREATE TABLE dod_items (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  text TEXT,
  completed BOOLEAN,
  completed_at DATETIME,
  FOREIGN KEY (item_id) REFERENCES delivery_items(id)
);

CREATE TABLE okrs (
  id TEXT PRIMARY KEY,
  objective TEXT,
  key_results JSON,
  quarter TEXT,
  year INTEGER
);

CREATE TABLE item_okr_links (
  item_id TEXT,
  okr_id TEXT,
  PRIMARY KEY (item_id, okr_id)
);

CREATE TABLE focus_sessions (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  start_time DATETIME,
  end_time DATETIME,
  duration_minutes INTEGER
);

CREATE TABLE work_signals (
  id TEXT PRIMARY KEY,
  date DATE,
  signal_type TEXT, -- context_switches, late_night, high_velocity
  value REAL,
  metadata JSON
);
```

**Pros**: Fast queries, relations, still local
**Cons**: Git-unfriendly (binary), harder to debug

**Migration**: CLI can read SQLite, write JSON fallback

### Phase 3 (SaaS): PostgreSQL + SQLite Hybrid
```
Desktop App:
  ├─→ Local: ~/.safer/safer.db (SQLite)
  └─→ Cloud: SAFER API (PostgreSQL)

Sync Strategy:
  - Write local first (always fast)
  - Sync to cloud in background
  - Conflict resolution: last-write-wins with user prompt
  - Offline-first: app works without internet
```

**Pros**: Best of both worlds
**Cons**: Sync complexity

---

## Privacy & Trust Model

This is **critical** for adoption. GPT was right: this makes or breaks the product.

### Core Principles

1. **Local-First**: Data lives on your machine
2. **Explicit Sync**: You choose what goes to cloud
3. **No Surveillance**: No code inspection, no keystrokes, no screenshots
4. **Transparent Signals**: Always show what's being tracked
5. **Encryption**: End-to-end for cloud storage
6. **User Ownership**: Export anytime, delete anytime

### What SAFER Tracks

**YES** ✅
- Delivery item metadata (titles, status, DoD)
- Git commit counts and timing (not content)
- Calendar event titles and duration
- File type categories (e.g., "TypeScript file")
- Work session timing
- OKR links

**NO** ❌
- Source code content
- Keystrokes
- Screenshots
- Passwords or tokens
- Private messages
- Proprietary data

### Trust Screen (Settings)

```
┌─────────────────────────────────────┐
│ PRIVACY CONTROLS                    │
├─────────────────────────────────────┤
│                                     │
│ What SAFER Tracks:                  │
│ ✓ Delivery items & DoD              │
│ ✓ Git activity (commits, timing)   │
│ ✓ Calendar events (read-only)      │
│ ✓ Work session timing               │
│                                     │
│ What SAFER Never Tracks:            │
│ ✗ Source code content               │
│ ✗ Keystrokes or screenshots         │
│ ✗ Private messages                  │
│ ✗ Passwords or credentials          │
│                                     │
│ Data Storage:                       │
│ • Local: ~/.safer/ (your machine)  │
│ • Cloud: Encrypted, opt-in         │
│ • Export: Anytime                   │
│ • Delete: Complete removal          │
│                                     │
│ [View Data Policy]                  │
└─────────────────────────────────────┘
```

This screen must be **visible and clear**.

---

## IDE Integration (Optional, High-Trust)

### VS Code Extension

**Lightweight**: < 100 lines
**Purpose**: Signal work patterns, not track content

**What it does**:
- Emits "coding session started" event
- Tracks file type distribution (40% TypeScript, 30% tests, 30% docs)
- Detects test vs production code (by file path patterns)
- Sends to SAFER desktop app via IPC

**What it never does**:
- Read code content
- Track keystrokes
- Capture cursor position
- Send data to internet

**Opt-in**: Disabled by default, requires explicit enable

### JetBrains Plugin

Same principles, different API.

---

## Business Model Evolution

### Phase 1: Free (Months 1-6)
**Target**: Early adopters, beta users
**Product**: Desktop app, local-only
**Goal**: Validate product-market fit

**Revenue**: $0
**Users**: 100-500
**Feedback**: Everything

### Phase 2: Freemium (Months 7-9)
**Target**: Individual contributors
**Tiers**:
- **Free**: Desktop app, local storage, 1 device
- **Pro ($10/mo)**: Cloud sync, unlimited devices, advanced analytics

**Revenue**: $500-2000/month
**Users**: 500-1000 free, 50-200 paid
**Goal**: Validate willingness to pay

### Phase 3: Team (Months 10-12)
**Target**: Engineering teams (5-50 people)
**Tiers**:
- Free: As before
- Pro: As before
- **Team ($25/user/mo)**: Shared OKRs, team dashboard, aggregated metrics

**Revenue**: $5000-20000/month
**Users**: 5-10 teams
**Goal**: Validate team value proposition

### Phase 4: Enterprise (Year 2+)
**Target**: Engineering orgs (50-1000+ people)
**Tiers**:
- Free, Pro, Team: As before
- **Enterprise (Custom)**: SSO, dedicated support, custom integrations, on-premise option

**Revenue**: $50k-500k/year per customer
**Users**: 2-5 enterprise customers
**Goal**: Scale to profitability

---

## Competitive Positioning

### Direct Competitors
- **Linear**: Issue tracking (lacks behavioral layer)
- **Asana/Monday**: Task management (not developer-focused)
- **Height**: AI task manager (lacks SAFER framework)

### Indirect Competitors
- **RescueTime**: Time tracking (surveillance feel, no guidance)
- **Clockwise**: Calendar optimization (single-tool focus)
- **Jira**: Too complex, not developer-friendly

### SAFER Differentiation
1. **Behavioral, not transactional** - Guidance, not just tracking
2. **Local-first, privacy-native** - Trust by default
3. **Framework-based** - SAFER methodology, not just features
4. **Developer-centric** - Built by devs, for devs
5. **Leadership-friendly** - Outputs useful for managers

**Tagline**: "Flight instruments for knowledge work"

---

## Technical Milestones

### Milestone 1: Desktop MVP (Month 3)
✅ Electron app runs on macOS
✅ Today view functional
✅ OKRs linked to items
✅ Settings screen with privacy controls
✅ System tray integration
✅ 10 beta users

### Milestone 2: Enhanced Desktop (Month 6)
✅ IDE integration (VS Code)
✅ Focus timer
✅ Pattern detection
✅ 100+ users
✅ Code signing + distribution

### Milestone 3: SaaS Foundation (Month 9)
✅ Cloud sync working
✅ Team workspaces
✅ Web dashboard
✅ Payment system
✅ First paying customers

### Milestone 4: Business Launch (Month 12)
✅ 50+ Pro users
✅ 5+ Team customers
✅ $10k MRR
✅ Roadmap for Enterprise

---

## Risk Mitigation

### Technical Risks
1. **Electron app size** → Mitigation: Use native modules sparingly
2. **Cross-platform bugs** → Mitigation: Focus on macOS first, Windows/Linux later
3. **Data sync conflicts** → Mitigation: Last-write-wins with user prompt
4. **Performance (SQLite)** → Mitigation: Indexed queries, background processing

### Product Risks
1. **Too complex** → Mitigation: Progressive disclosure, simple defaults
2. **Feels like surveillance** → Mitigation: Privacy-first messaging, local-first architecture
3. **Low adoption** → Mitigation: Free tier generous, viral loop (team invites)
4. **Commoditization** → Mitigation: SAFER framework IP, deep integrations

### Business Risks
1. **No willingness to pay** → Mitigation: Validate early with Pro tier
2. **Long sales cycles** → Mitigation: Self-serve first, enterprise later
3. **Churn** → Mitigation: Habit-forming daily use, clear ROI
4. **Competition** → Mitigation: Speed to market, strong brand

---

## Success Metrics

### Product Metrics
- **DAU/MAU ratio** (target: >0.4) → indicates habit formation
- **Time to first value** (target: <5 min) → onboarding quality
- **Items created per user per week** (target: 3-5) → engagement
- **Weekly review completion rate** (target: >60%) → retention indicator

### Business Metrics
- **Free → Pro conversion** (target: 5-10%)
- **Pro → Team conversion** (target: 20%+)
- **MRR growth** (target: 20% month-over-month)
- **Churn rate** (target: <5% monthly)
- **NPS** (target: >50)

### Leading Indicators
- **GitHub stars** (visibility)
- **Newsletter subscribers** (interest)
- **Demo requests** (intent)
- **Slack community activity** (engagement)

---

## Go-to-Market Strategy

### Phase 1: Developer Community (Months 1-6)
- **Channels**: GitHub, Hacker News, Reddit (r/productivity, r/programming)
- **Content**: "How I built SAFER", "The problem with productivity tools", "SAFER framework explained"
- **Goal**: 100 GitHub stars, 500 newsletter subscribers

### Phase 2: Early Adopters (Months 7-9)
- **Channels**: Product Hunt, IndieHackers, Dev.to
- **Content**: Case studies, demo videos, comparison posts
- **Goal**: Product Hunt top 5, 50 paying users

### Phase 3: Teams (Months 10-12)
- **Channels**: LinkedIn, engineering manager communities
- **Content**: "How teams use SAFER", ROI calculator, leadership guides
- **Goal**: 5 team customers, 10 enterprise trials

### Phase 4: Scale (Year 2+)
- **Channels**: Paid ads (Google, LinkedIn), conferences, partnerships
- **Content**: Webinars, certification program, consulting
- **Goal**: 100+ team customers, 5+ enterprise

---

## Open Questions to Answer

1. **Pricing validation**: Will people pay $10/mo for personal productivity?
2. **Team value**: What metrics matter most to engineering managers?
3. **Enterprise needs**: SSO, compliance (SOC 2), on-premise?
4. **IDE trust**: Will developers install an IDE plugin?
5. **Calendar access**: Is read-only enough, or do we need write access?

---

## Immediate Next Steps (This Week)

If you want to proceed with desktop app:

### Step 1: Refactor CLI → Core Library
- [ ] Create `packages/core/` directory
- [ ] Extract `SAFEREngine` class from CLI commands
- [ ] Make CLI a thin wrapper around `@safer/core`
- [ ] Test: CLI still works identically

### Step 2: Electron Boilerplate
- [ ] Set up Electron + React + TypeScript project
- [ ] Configure Webpack/Vite for Electron
- [ ] Implement basic IPC (main ↔ renderer)
- [ ] Test: Window opens with "Hello SAFER"

### Step 3: First Screen (Today View)
- [ ] Connect to `@safer/core` via IPC
- [ ] Display active items
- [ ] Show today's focus score (mock for now)
- [ ] Add system tray icon

**Timeline**: 1 week for skeleton, 2 weeks for first functional screen

---

## Decision Point

You now have two paths:

### Path A: Continue CLI Refinement
- Pros: Simpler, faster iteration, already working
- Cons: Limited audience (technical users only), harder monetization

### Path B: Pivot to Desktop App
- Pros: Larger audience, better UX, clear SaaS path, stronger product
- Cons: 6+ months to launch, significant refactor, higher complexity

**My recommendation**: Path B (Desktop App)

The CLI validates the model. The desktop app is the product. The SaaS is the business.

---

## Summary

**Where we are**: CLI working, published, proven
**Where we're going**: Desktop app with SaaS evolution
**How we get there**: 3 phases over 12 months
**Why it matters**: SAFER can become the standard for developer productivity

The roadmap is aggressive but achievable. The architecture supports the business model. The privacy model builds trust.

**Ready to build?**

Let me know if you want to:
1. Start the refactor (CLI → core library)
2. Sketch the Electron boilerplate
3. Design the data models (SQLite schema)
4. Plan the first sprint

Or if you want to explore any section deeper first.

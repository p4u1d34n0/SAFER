import React, { useEffect, useState, memo } from 'react';
import { marked } from 'marked';

// Isolated timer component - only this re-renders on tick
const TimerDisplay = memo(function TimerDisplay({
  startTime,
  isActive
}: {
  startTime: Date | null;
  isActive: boolean;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    // Set initial elapsed time
    const now = new Date();
    setElapsedSeconds(Math.floor((now.getTime() - startTime.getTime()) / 1000));

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <div className="text-right font-mono text-lg font-bold text-green-600">
      {formatElapsedTime(elapsedSeconds)}
    </div>
  );
});

// TypeScript declarations for our API
declare global {
  interface Window {
    electronAPI: {
      safer: {
        list: () => Promise<any[]>;
        create: (title: string) => Promise<{ success: boolean }>;
        status: () => Promise<any>;
        systemStatus: () => Promise<{
          location: string;
          user: { name: string; email: string };
          wip: { current: number; max: number };
          git: { initialized: boolean; autoCommit: boolean; uncommittedChanges: boolean; remoteSync: boolean };
          integrations: { calendar: boolean; gitHooks: boolean; github: boolean; githubConnected: boolean; dashboardPort: number };
          review: { enforced: boolean; dayOfWeek: number; gracePeriodHours: number };
        } | null>;
        show: (id: string) => Promise<any>;
        complete: (id: string, options: { stressLevel: number; learnings: string; incidents: number; archive: boolean }) => Promise<{ success: boolean }>;
        delete: (id: string) => Promise<{ success: boolean }>;
        archive: (id: string) => Promise<{ success: boolean }>;
        config: {
          get: () => Promise<any>;
          set: (key: string, value: any) => Promise<{ success: boolean }>;
          save: (config: any) => Promise<{ success: boolean }>;
        };
        dod: {
          get: (id: string) => Promise<any>;
          check: (id: string, dodId: string) => Promise<{ success: boolean }>;
          uncheck: (id: string, dodId: string) => Promise<{ success: boolean }>;
          add: (id: string, text: string) => Promise<{ success: boolean }>;
        };
        import: {
          list: (source: string) => Promise<any[]>;
          items: (source: string, options: any) => Promise<{ success: boolean }>;
        };
        github: {
          projects: () => Promise<any[]>;
          projectItems: (projectNumber: string) => Promise<any[]>;
          requestScope: () => Promise<{ success: boolean; error?: string }>;
        };
        metrics: () => Promise<any>;
        reviews: () => Promise<any[]>;
        createReview: (options: { wentWell: string; didntGoWell: string; blockers: string; learnings: string; adjustments: string }) => Promise<{ success: boolean }>;
        updateReview: (weekId: string) => Promise<{ success: boolean }>;
        checkReviewStatus: () => Promise<{ needed: boolean; weekId: string; daysOverdue: number }>;
        start: (id: string) => Promise<{ success: boolean }>;
        stop: () => Promise<{ success: boolean }>;
      };
    };
  }
}

interface DeliveryItem {
  id: string;
  status: string;
  scope: {
    title: string;
    description: string;
  };
  fence: {
    definitionOfDone: Array<{
      id: string;
      text: string;
      completed: boolean;
    }>;
    wipSlot: number;
  };
  review: {
    stressLevel: number;
  };
}

function App() {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('today');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDodItems, setNewItemDodItems] = useState<string[]>([]);
  const [currentDodInput, setCurrentDodInput] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeItemId, setCompleteItemId] = useState<string>('');
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [reviewReminder, setReviewReminder] = useState<{ needed: boolean; weekId: string; daysOverdue: number } | null>(null);
  const [reviewReminderDismissed, setReviewReminderDismissed] = useState(false);

  useEffect(() => {
    loadItems();
    loadConfig();
    checkForActiveTimer();
    checkReviewStatus();
  }, []);

  async function checkReviewStatus() {
    try {
      const status = await window.electronAPI.safer.checkReviewStatus();
      setReviewReminder(status);
    } catch (error) {
      console.error('Failed to check review status:', error);
    }
  }

  async function loadItems() {
    setLoading(true);
    try {
      const data = await window.electronAPI.safer.list();
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    try {
      const data = await window.electronAPI.safer.config.get();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  async function checkForActiveTimer() {
    try {
      // Check all items for active sessions
      const data = await window.electronAPI.safer.list();
      for (const item of data) {
        if (item.fence?.timeBox?.sessions) {
          const activeSession = item.fence.timeBox.sessions.find((s: any) => !s.end);
          if (activeSession) {
            setActiveTimerId(item.id);
            setTimerStartTime(new Date(activeSession.start));
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for active timer:', error);
    }
  }

  async function startTimer(itemId: string) {
    try {
      await window.electronAPI.safer.start(itemId);
      setActiveTimerId(itemId);
      setTimerStartTime(new Date());
      await loadItems(); // Refresh to show updated session data
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('Failed to start focus block. Make sure no other session is active.');
    }
  }

  async function stopTimer() {
    try {
      await window.electronAPI.safer.stop();
      setActiveTimerId(null);
      setTimerStartTime(null);
      await loadItems(); // Refresh to show updated session data
    } catch (error) {
      console.error('Failed to stop timer:', error);
      alert('Failed to stop focus block.');
    }
  }

  function addDodItem() {
    if (!currentDodInput.trim()) return;
    setNewItemDodItems([...newItemDodItems, currentDodInput.trim()]);
    setCurrentDodInput('');
  }

  function removeDodItem(index: number) {
    setNewItemDodItems(newItemDodItems.filter((_, i) => i !== index));
  }

  async function handleCreateItem() {
    if (createStep === 1) {
      if (!newItemTitle.trim()) {
        alert('Please enter a title');
        return;
      }
      setCreateStep(2);
      return;
    }

    // Step 2: Create the item with DoD items
    try {
      // First create the item
      await window.electronAPI.safer.create(newItemTitle);

      // Get the newly created item to find its ID
      const updatedItems = await window.electronAPI.safer.list();
      const newItem = updatedItems.find((item: any) => item.scope.title === newItemTitle);

      if (newItem && newItemDodItems.length > 0) {
        // Add each DoD item
        for (const dodText of newItemDodItems) {
          await window.electronAPI.safer.dod.add(newItem.id, dodText);
        }
      }

      // Reset form
      setNewItemTitle('');
      setNewItemDodItems([]);
      setCurrentDodInput('');
      setCreateStep(1);
      setShowCreateDialog(false);
      await loadItems();
    } catch (error) {
      console.error('Failed to create item:', error);
      alert('Failed to create item. Make sure SAFER CLI is installed.');
    }
  }

  function handleCancelCreate() {
    setNewItemTitle('');
    setNewItemDodItems([]);
    setCurrentDodInput('');
    setCreateStep(1);
    setShowCreateDialog(false);
  }

  function ItemCard({ item }: { item: DeliveryItem }) {
    const dodComplete = item.fence.definitionOfDone.filter(d => d.completed).length;
    const dodTotal = item.fence.definitionOfDone.length;
    const dodPercent = dodTotal > 0 ? Math.round((dodComplete / dodTotal) * 100) : 0;
    const isTimerActive = activeTimerId === item.id;

    return (
      <div
        className="bg-white rounded-lg shadow-md p-4 mb-3 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1" onClick={() => setSelectedItem(item.id)} className="cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-600 font-mono font-bold">{item.id}</span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">Slot {item.fence.wipSlot}</span>
              {isTimerActive && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium animate-pulse">
                  ● Active
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{item.scope.title}</h3>
          </div>

          <div className="flex flex-col gap-2 ml-3">
            <TimerDisplay startTime={timerStartTime} isActive={isTimerActive} />
            {isTimerActive ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopTimer();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startTimer(item.id);
                }}
                disabled={activeTimerId !== null}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                ▶ Start
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 cursor-pointer" onClick={() => setSelectedItem(item.id)}>
          <div className="flex items-center gap-1">
            <span>DoD:</span>
            <span className="font-medium">{dodComplete}/{dodTotal}</span>
            <span className="text-xs">({dodPercent}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Stress:</span>
            <span className="font-medium">{item.review.stressLevel}/5</span>
          </div>
        </div>

        {dodTotal > 0 && (
          <div className="mt-3 cursor-pointer" onClick={() => setSelectedItem(item.id)}>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${dodPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function TodayView() {
    const maxWIP = config?.limits?.maxWIP || 3;

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Today</h1>
          <p className="text-gray-600">{new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">Active Items</div>
            <div className="text-4xl font-bold">{items.length} / {maxWIP}</div>
            <div className="text-sm mt-2">
              {items.length < maxWIP ? '✓ Within WIP limit' : '⚠ At WIP limit'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">Focus Score</div>
            <div className="text-4xl font-bold">
              {items.length > 0 ? '●●●○○' : '●○○○○'}
            </div>
            <div className="text-sm mt-2">3/5 - Good</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800">Active Items</h2>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + New Item
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No active items</p>
              <p className="text-sm">Create your first delivery item to get started</p>
            </div>
          ) : (
            items.map(item => <ItemCard key={item.id} item={item} />)
          )}
        </div>
      </div>
    );
  }

  function ItemDetailsView({ itemId }: { itemId: string }) {
    const [itemDetails, setItemDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newDodText, setNewDodText] = useState('');
    const [addingDod, setAddingDod] = useState(false);

    useEffect(() => {
      loadItemDetails();
    }, [itemId]);

    async function loadItemDetails() {
      setLoading(true);
      try {
        const data = await window.electronAPI.safer.show(itemId);
        setItemDetails(data);
      } catch (error) {
        console.error('Failed to load item details:', error);
      } finally {
        setLoading(false);
      }
    }

    async function toggleDod(dodId: string, currentState: boolean) {
      try {
        if (currentState) {
          await window.electronAPI.safer.dod.uncheck(itemId, dodId);
        } else {
          await window.electronAPI.safer.dod.check(itemId, dodId);
        }
        await loadItemDetails();
        await loadItems();
      } catch (error) {
        console.error('Failed to toggle DoD:', error);
      }
    }

    async function handleAddDod() {
      if (!newDodText.trim()) return;

      setAddingDod(true);
      try {
        await window.electronAPI.safer.dod.add(itemId, newDodText.trim());
        setNewDodText('');
        await loadItemDetails();
        await loadItems();
      } catch (error) {
        console.error('Failed to add DoD:', error);
        alert('Failed to add DoD item');
      } finally {
        setAddingDod(false);
      }
    }

    async function handleComplete() {
      const currentItem = items.find(i => i.id === itemId);
      if (!currentItem) return;

      const dodTotal = currentItem.fence.definitionOfDone.length;
      const dodComplete = currentItem.fence.definitionOfDone.filter(d => d.completed).length;

      // Check if no DoD items exist
      if (dodTotal === 0) {
        const message = `⚠️ No Definition of Done items defined.\n\nIt's recommended to define DoD items before completing.\n\nAdd DoD items with the DoD tab below, or complete anyway?`;
        if (!confirm(message)) {
          return;
        }
      }
      // Check if DoD items are incomplete
      else if (dodComplete < dodTotal) {
        const incompleteItems = currentItem.fence.definitionOfDone
          .filter(d => !d.completed)
          .map(d => `  ☐ ${d.text}`)
          .join('\n');

        const message = `⚠️ Definition of Done not complete (${dodComplete}/${dodTotal})\n\nIncomplete items:\n${incompleteItems}\n\nComplete anyway?`;
        if (!confirm(message)) {
          return;
        }
      }

      setCompleteItemId(itemId);
      setShowCompleteDialog(true);
    }

    async function handleDelete() {
      if (confirm(`Are you sure you want to delete ${itemId}?`)) {
        try {
          await window.electronAPI.safer.delete(itemId);
          setSelectedItem(null);
          await loadItems();
        } catch (error) {
          console.error('Failed to delete item:', error);
          alert('Failed to delete item');
        }
      }
    }

    async function handleArchive() {
      try {
        await window.electronAPI.safer.archive(itemId);
        setSelectedItem(null);
        await loadItems();
      } catch (error) {
        console.error('Failed to archive item:', error);
        alert('Failed to archive item');
      }
    }

    if (loading) {
      return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Item Details</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </div>
      );
    }

    if (!itemDetails) {
      return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Item Details</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="text-center py-12 text-red-500">Failed to load item</div>
        </div>
      );
    }

    const dodComplete = itemDetails.fence?.definitionOfDone?.filter((d: any) => d.completed).length || 0;
    const dodTotal = itemDetails.fence?.definitionOfDone?.length || 0;
    const dodPercent = dodTotal > 0 ? Math.round((dodComplete / dodTotal) * 100) : 0;

    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl p-6 overflow-y-auto z-50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Item Details</h2>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Item Header */}
        <div className="mb-6">
          <div className="text-blue-600 font-mono font-bold text-lg mb-2">{itemDetails.id}</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{itemDetails.scope?.title}</h3>
          {itemDetails.scope?.description && (
            <p className="text-gray-600 text-sm">{itemDetails.scope.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Definition of Done</span>
            <span className="text-sm text-gray-600">{dodComplete}/{dodTotal} ({dodPercent}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${dodPercent}%` }}
            />
          </div>

          {/* DoD Checklist */}
          <div className="space-y-2 mb-3">
            {itemDetails.fence?.definitionOfDone?.map((dod: any) => (
              <label
                key={dod.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={dod.completed}
                  onChange={() => toggleDod(dod.id, dod.completed)}
                  className="mt-1"
                />
                <span className={`text-sm flex-1 ${dod.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {dod.text}
                </span>
              </label>
            ))}
            {itemDetails.fence?.definitionOfDone?.length === 0 && (
              <p className="text-sm text-gray-500 italic py-2">No DoD items yet. Add one below to get started.</p>
            )}
          </div>

          {/* Add DoD Item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newDodText}
              onChange={(e) => setNewDodText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddDod();
                }
              }}
              placeholder="Add DoD item..."
              disabled={addingDod}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleAddDod}
              disabled={!newDodText.trim() || addingDod}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {addingDod ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{itemDetails.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">WIP Slot:</span>
            <span className="font-medium">{itemDetails.fence?.wipSlot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Stress Level:</span>
            <span className="font-medium">{itemDetails.review?.stressLevel}/5</span>
          </div>
          {itemDetails.scope?.who && (
            <div className="flex justify-between">
              <span className="text-gray-600">For:</span>
              <span className="font-medium">{itemDetails.scope.who}</span>
            </div>
          )}
          {itemDetails.scope?.when && (
            <div className="flex justify-between">
              <span className="text-gray-600">Due:</span>
              <span className="font-medium">{itemDetails.scope.when}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Mark Complete
          </button>
          <button
            onClick={handleArchive}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Archive
          </button>
          <button
            onClick={handleDelete}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  function CompleteItemDialog() {
    const [stressLevel, setStressLevel] = useState(3);
    const [learnings, setLearnings] = useState('');
    const [hadIncidents, setHadIncidents] = useState(false);
    const [incidentCount, setIncidentCount] = useState(1);
    const [shouldArchive, setShouldArchive] = useState(true);
    const [saving, setSaving] = useState(false);

    async function handleComplete() {
      setSaving(true);
      try {
        await window.electronAPI.safer.complete(completeItemId, {
          stressLevel,
          learnings,
          incidents: hadIncidents ? incidentCount : 0,
          archive: shouldArchive,
        });
        setShowCompleteDialog(false);
        setSelectedItem(null);
        setCompleteItemId('');
        // Reset form
        setStressLevel(3);
        setLearnings('');
        setHadIncidents(false);
        setIncidentCount(1);
        setShouldArchive(true);
        await loadItems();
      } catch (error) {
        console.error('Failed to complete item:', error);
        alert('Failed to complete item');
      } finally {
        setSaving(false);
      }
    }

    if (!showCompleteDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[450px] max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Complete Item</h3>

          {/* Stress Level */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stress Level: {stressLevel}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={stressLevel}
              onChange={(e) => setStressLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Learnings */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Learnings (optional)
            </label>
            <textarea
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              placeholder="What did you learn from this delivery?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          {/* Incidents */}
          <div className="mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hadIncidents}
                onChange={(e) => setHadIncidents(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Had incidents (bugs, rollbacks, issues)
              </span>
            </label>
            {hadIncidents && (
              <div className="mt-2 ml-6">
                <label className="block text-sm text-gray-600 mb-1">Number of incidents:</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={incidentCount}
                  onChange={(e) => setIncidentCount(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Archive option */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldArchive}
                onChange={(e) => setShouldArchive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Archive immediately after completing
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Moves item out of active list
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCompleteDialog(false);
                setCompleteItemId('');
                // Reset form
                setStressLevel(3);
                setLearnings('');
                setHadIncidents(false);
                setIncidentCount(1);
                setShouldArchive(true);
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function AllItemsView() {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">All Items</h1>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">Showing all active delivery items</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + New Item
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No active items</p>
            <p className="text-sm">Create your first delivery item to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    );
  }

  function StatusView() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadStatus();
    }, []);

    async function loadStatus() {
      setLoading(true);
      try {
        const data = await window.electronAPI.safer.systemStatus();
        setStatus(data);
      } catch (error) {
        console.error('Failed to load status:', error);
      } finally {
        setLoading(false);
      }
    }

    if (loading) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">System Status</h1>
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </div>
      );
    }

    if (!status) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">System Status</h1>
          <div className="text-center py-12 text-gray-500">Failed to load status</div>
        </div>
      );
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">System Status</h1>

        <div className="space-y-6">
          {/* WIP Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span> Work In Progress
            </h2>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${status.wip.current >= status.wip.max ? 'text-red-600' : 'text-green-600'}`}>
                {status.wip.current}/{status.wip.max}
              </div>
              <div className="text-gray-600">
                {status.wip.current >= status.wip.max ? (
                  <span className="text-red-600 font-medium">WIP limit reached - complete items before adding more</span>
                ) : status.wip.current === 0 ? (
                  <span>No active delivery items</span>
                ) : (
                  <span>{status.wip.max - status.wip.current} slots available</span>
                )}
              </div>
            </div>
          </div>

          {/* User & Location */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">👤</span> User & Location
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{status.user.name || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{status.user.email || 'Not set'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Data Location</div>
                <div className="font-mono text-sm">{status.location}</div>
              </div>
            </div>
          </div>

          {/* Git Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📁</span> Git Version Control
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Initialized</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.git.initialized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.git.initialized ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Auto Commit</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.git.autoCommit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.git.autoCommit ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Remote Sync</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.git.remoteSync ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.git.remoteSync ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {status.git.uncommittedChanges && (
                <div className="mt-2 text-amber-600 text-sm">
                  ⚠️ You have uncommitted changes
                </div>
              )}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">🔗</span> Integrations
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">GitHub</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.integrations.githubConnected ? 'bg-green-100 text-green-700' : status.integrations.github ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.integrations.githubConnected ? 'Connected' : status.integrations.github ? 'Enabled (not connected)' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Calendar</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.integrations.calendar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.integrations.calendar ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Git Hooks</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.integrations.gitHooks ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.integrations.gitHooks ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Review Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📋</span> Weekly Review
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Enforced</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${status.review.enforced ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status.review.enforced ? 'Yes' : 'No'}
                </span>
              </div>
              {status.review.enforced && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Review Day</span>
                    <span className="font-medium">{dayNames[status.review.dayOfWeek]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Grace Period</span>
                    <span className="font-medium">{status.review.gracePeriodHours} hours</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function MetricsView() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadMetrics();
    }, []);

    async function loadMetrics() {
      setLoading(true);
      try {
        const data = await window.electronAPI.safer.metrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    if (loading) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Metrics</h1>
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Metrics & Analytics</h1>

        {Object.keys(metrics).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No metrics data available yet</p>
            <p className="text-sm mt-2">Complete some delivery items to see metrics</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {metrics.totalCompleted !== undefined && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-sm text-gray-600 mb-1">Total Completed</div>
                <div className="text-4xl font-bold text-green-600">{metrics.totalCompleted}</div>
              </div>
            )}
            {metrics.averageStress !== undefined && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-sm text-gray-600 mb-1">Average Stress</div>
                <div className="text-4xl font-bold text-orange-600">{metrics.averageStress.toFixed(1)}/5</div>
              </div>
            )}
            {metrics.weeklyTrend !== undefined && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-sm text-gray-600 mb-1">This Week</div>
                <div className="text-4xl font-bold text-blue-600">{metrics.weeklyTrend}</div>
              </div>
            )}
            {metrics.currentStreak !== undefined && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-sm text-gray-600 mb-1">Current Streak</div>
                <div className="text-4xl font-bold text-purple-600">{metrics.currentStreak} days</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function ReviewView() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);
    const [wentWell, setWentWell] = useState('');
    const [didntGoWell, setDidntGoWell] = useState('');
    const [blockers, setBlockers] = useState('');
    const [learnings, setLearnings] = useState('');
    const [adjustments, setAdjustments] = useState('');

    useEffect(() => {
      loadReviews();
    }, []);

    async function loadReviews() {
      setLoading(true);
      try {
        const data = await window.electronAPI.safer.reviews();
        setReviews(data);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    }

    async function handleUpdateReview(weekId: string) {
      setUpdating(weekId);
      try {
        await window.electronAPI.safer.updateReview(weekId);
        await loadReviews();
      } catch (error) {
        console.error('Failed to update review:', error);
        alert('Failed to update review');
      } finally {
        setUpdating(null);
      }
    }

    async function handleCreateReview() {
      setSaving(true);
      try {
        await window.electronAPI.safer.createReview({
          wentWell,
          didntGoWell,
          blockers,
          learnings,
          adjustments,
        });
        // Reset form
        setWentWell('');
        setDidntGoWell('');
        setBlockers('');
        setLearnings('');
        setAdjustments('');
        setShowCreateForm(false);
        await loadReviews();
        // Re-check review status to dismiss banner if applicable
        checkReviewStatus();
        setReviewReminderDismissed(false);
      } catch (error) {
        console.error('Failed to create review:', error);
        alert('Failed to create review');
      } finally {
        setSaving(false);
      }
    }

    if (loading) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Weekly Reviews</h1>
          <div className="text-center py-12 text-gray-500">Loading...</div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Weekly Reviews</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ New Review'}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create Weekly Review</h2>
            <p className="text-sm text-gray-600 mb-4">
              Reflect on your week. Metrics will be automatically included.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What went well this week?
                </label>
                <textarea
                  value={wentWell}
                  onChange={(e) => setWentWell(e.target.value)}
                  placeholder="Completed tasks on time, good collaboration..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What didn't go well?
                </label>
                <textarea
                  value={didntGoWell}
                  onChange={(e) => setDidntGoWell(e.target.value)}
                  placeholder="Interruptions, scope creep, technical issues..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blockers encountered
                </label>
                <input
                  type="text"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Waiting on approvals, unclear requirements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key learnings
                </label>
                <input
                  type="text"
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                  placeholder="Better estimation needed, new tool discovered..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustments for next week
                </label>
                <input
                  type="text"
                  value={adjustments}
                  onChange={(e) => setAdjustments(e.target.value)}
                  placeholder="Block focus time, reduce WIP, delegate..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleCreateReview}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No reviews yet</p>
            <p className="text-sm mt-2">Click "+ New Review" to create your first weekly review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.week} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{review.week}</h3>
                  <button
                    onClick={() => handleUpdateReview(review.week)}
                    disabled={updating === review.week}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    {updating === review.week ? 'Updating...' : 'Update Metrics'}
                  </button>
                </div>
                <div
                  className="prose prose-sm max-w-none text-gray-700
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                    [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
                    [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-800
                    [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-gray-700
                    [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1
                    [&_p]:mb-3 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: marked(review.content) }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ImportView() {
    const [source, setSource] = useState('github');
    const [sourceType, setSourceType] = useState('repository'); // 'repository' or 'project'
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('5'); // Default to project 5
    const [items, setImportItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [assignedToMe, setAssignedToMe] = useState(false);
    const [labelFilter, setLabelFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('open');
    const [limitFilter, setLimitFilter] = useState('10');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [scopeError, setScopeError] = useState(false);
    const [requestingScope, setRequestingScope] = useState(false);

    useEffect(() => {
      loadProjects();
    }, []);

    async function loadProjects() {
      try {
        const data = await window.electronAPI.safer.github.projects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    }

    async function handleLoadItems() {
      setLoading(true);
      setScopeError(false);
      try {
        let data: any[];

        if (sourceType === 'project') {
          // Load from GitHub Project
          data = await window.electronAPI.safer.github.projectItems(selectedProject);
        } else {
          // Load from repository issues
          data = await window.electronAPI.safer.import.list(source);
        }

        // Apply client-side filters to preview
        if (labelFilter) {
          const labelLower = labelFilter.toLowerCase();
          data = data.filter((item: any) =>
            item.labels && item.labels.some((label: string) =>
              label.toLowerCase().includes(labelLower)
            )
          );
        }

        if (assignedToMe && config?.user?.name) {
          const userName = config.user.name.toLowerCase();
          data = data.filter((item: any) =>
            item.assignee && item.assignee.toLowerCase().includes(userName)
          );
        }

        // Apply limit
        const limit = parseInt(limitFilter) || 10;
        data = data.slice(0, limit);

        setImportItems(data);
        setSelectedItems(new Set());
      } catch (error: any) {
        console.error('Failed to load import items:', error);

        // Check if this is a scope permission error
        if (error.message && error.message.includes('read:project')) {
          setScopeError(true);
        } else {
          alert('Failed to load items. Make sure GitHub is configured in Settings.');
        }
      } finally {
        setLoading(false);
      }
    }

    async function handleRequestScope() {
      setRequestingScope(true);
      try {
        const result = await window.electronAPI.safer.github.requestScope();
        if (result.success) {
          setScopeError(false);
          alert('Permission granted! You can now load items from project boards.');
        } else {
          alert(`Failed to grant permission: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to request scope:', error);
        alert('Failed to request permission. Please run: gh auth refresh -s read:project');
      } finally {
        setRequestingScope(false);
      }
    }

    function toggleItemSelection(itemId: string) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedItems(newSelected);
    }

    function toggleAllItems() {
      if (selectedItems.size === items.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(items.map(item => item.id)));
      }
    }

    async function handleImportAll() {
      setImporting(true);
      try {
        const options: any = {
          state: stateFilter,
          limit: parseInt(limitFilter)
        };

        if (assignedToMe) {
          options.assignedToMe = true;
        }
        if (labelFilter) {
          options.label = labelFilter;
        }

        await window.electronAPI.safer.import.items(source, options);
        alert('Items imported successfully!');
        await loadItems();
        setCurrentView('today');
      } catch (error) {
        console.error('Failed to import items:', error);
        alert('Failed to import items');
      } finally {
        setImporting(false);
      }
    }

    async function handleImportSelected() {
      if (selectedItems.size === 0) {
        alert('Please select at least one item to import');
        return;
      }

      setImporting(true);
      try {
        const itemsToImport = items.filter(item => selectedItems.has(item.id));

        for (const item of itemsToImport) {
          // Create a delivery item from the GitHub issue/PR
          const title = `[GH #${item.githubNumber}] ${item.title}`;
          await window.electronAPI.safer.create(title);
        }

        alert(`Successfully imported ${itemsToImport.length} item(s)!`);
        setSelectedItems(new Set());
        await loadItems();
        setCurrentView('today');
      } catch (error) {
        console.error('Failed to import selected items:', error);
        alert('Failed to import selected items');
      } finally {
        setImporting(false);
      }
    }

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Import from GitHub</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Import From</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="repository"
                    checked={sourceType === 'repository'}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Repository Issues</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="project"
                    checked={sourceType === 'project'}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Project Board</span>
                </label>
              </div>
            </div>

            {sourceType === 'repository' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="github">GitHub Issues & PRs</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {projects.length > 0 ? (
                    projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  ) : (
                    <option value="5">OOP Roadmap (Project #5)</option>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Only items assigned to me</span>
              </label>
            </div>

            {sourceType === 'repository' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="all">All</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Label Filter (optional)</label>
              <input
                type="text"
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                placeholder="e.g., bug, feature-request"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Items</label>
              <input
                type="number"
                value={limitFilter}
                onChange={(e) => setLimitFilter(e.target.value)}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLoadItems}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Loading...' : 'Load Preview'}
              </button>
              <button
                onClick={handleImportAll}
                disabled={importing}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {importing ? 'Importing...' : 'Import All'}
              </button>
            </div>
          </div>
        </div>

        {scopeError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-yellow-800">GitHub Permission Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To import from GitHub Project Boards, you need to grant the <code className="bg-yellow-100 px-2 py-1 rounded">read:project</code> permission.</p>
                  <p className="mt-2">Click the button below to open your browser and authorize this permission.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleRequestScope}
                    disabled={requestingScope}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
                  >
                    {requestingScope ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authorizing...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Grant Permission
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">Preview ({items.length} items)</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleAllItems}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-600">Select All</span>
                </label>
              </div>
              <button
                onClick={handleImportSelected}
                disabled={importing || selectedItems.size === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {importing ? 'Importing...' : `Import Selected (${selectedItems.size})`}
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-md p-4 transition-all ${
                    selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{item.type}</span>
                        {item.githubNumber && (
                          <span className="text-sm text-gray-600">#{item.githubNumber}</span>
                        )}
                        {item.status && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {item.status}
                          </span>
                        )}
                        {item.state && item.state !== 'open' && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {item.state}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.title}</h3>
                      {item.labels && item.labels.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {item.labels.map((label: string, idx: number) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.assignee && (
                        <div className="text-sm text-gray-600 mt-2">Assignee: {item.assignee}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function SettingsView() {
    const [localConfig, setLocalConfig] = useState<any>(config);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
      setLocalConfig(config);
    }, [config]);

    async function handleSave() {
      if (!localConfig) return;

      setSaving(true);
      setSaveMessage('');
      try {
        await window.electronAPI.safer.config.save(localConfig);
        setSaveMessage('✓ Settings saved successfully');
        // Reload the parent config state
        await loadConfig();
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('✗ Failed to save settings');
        console.error('Failed to save config:', error);
      } finally {
        setSaving(false);
      }
    }

    function updateLocalConfig(path: string, value: any) {
      if (!localConfig) return;

      const keys = path.split('.');
      const newConfig = { ...localConfig };
      let current: any = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      setLocalConfig(newConfig);
    }

    if (!localConfig) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>
          <div className="text-center py-12 text-gray-500">Loading configuration...</div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saveMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            saveMessage.startsWith('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* User Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">User Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={localConfig.user?.name || ''}
                onChange={(e) => updateLocalConfig('user.name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={localConfig.user?.email || ''}
                onChange={(e) => updateLocalConfig('user.email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Workflow Limits</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum WIP (Work in Progress)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={localConfig.limits?.maxWIP || 3}
                onChange={(e) => updateLocalConfig('limits.maxWIP', parseInt(e.target.value))}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of active delivery items (recommended: 3)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Box (minutes)
              </label>
              <input
                type="number"
                min="30"
                max="240"
                step="15"
                value={localConfig.limits?.timeBox || 90}
                onChange={(e) => updateLocalConfig('limits.timeBox', parseInt(e.target.value))}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Default focus block duration (recommended: 90)
              </p>
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">GitHub Integration</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localConfig.github?.enabled || false}
                  onChange={(e) => updateLocalConfig('github.enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable GitHub integration</span>
              </label>
            </div>
            {localConfig.github?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner/Organization</label>
                  <input
                    type="text"
                    value={localConfig.github?.owner || ''}
                    onChange={(e) => updateLocalConfig('github.owner', e.target.value)}
                    placeholder="e.g., oxfordop"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                  <input
                    type="text"
                    value={localConfig.github?.repo || ''}
                    onChange={(e) => updateLocalConfig('github.repo', e.target.value)}
                    placeholder="e.g., oop-site-code"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={localConfig.github?.branch || 'main'}
                    onChange={(e) => updateLocalConfig('github.branch', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Project Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Project Settings</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure how SAFER interacts with your projects. These settings apply to git hooks and workflow enforcement.
          </p>

          <div className="space-y-6">
            {/* Default Enforcement Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Enforcement Mode
              </label>
              <select
                value={localConfig.projects?.defaultMode || 'personal'}
                onChange={(e) => updateLocalConfig('projects.defaultMode', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="disabled">Disabled - No git hooks or enforcement</option>
                <option value="personal">Personal - Warnings only, never blocks</option>
                <option value="strict">Strict - Blocks commits if requirements not met</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {localConfig.projects?.defaultMode === 'disabled' && 'SAFER will not interact with your git workflow'}
                {localConfig.projects?.defaultMode === 'personal' && 'SAFER will remind you but won\'t prevent commits (recommended for shared repos)'}
                {localConfig.projects?.defaultMode === 'strict' && 'SAFER will block commits until requirements are met (recommended for personal projects)'}
              </p>
            </div>

            {/* DoD Checking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Definition of Done Checking
              </label>
              <select
                value={localConfig.projects?.dodCheck || 'warn'}
                onChange={(e) => updateLocalConfig('projects.dodCheck', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never - Don't check DoD at commit</option>
                <option value="ask">Ask - Prompt whether to check DoD</option>
                <option value="warn">Warn - Show DoD status but allow commit</option>
                <option value="block">Block - Prevent commit if DoD incomplete</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls whether SAFER checks your Definition of Done before allowing commits
              </p>
            </div>

            {/* Commit Message Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commit Message Format
              </label>
              <select
                value={localConfig.projects?.commitFormat || 'optional'}
                onChange={(e) => updateLocalConfig('projects.commitFormat', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never - Don't suggest delivery item references</option>
                <option value="ask">Ask - Prompt for delivery item reference</option>
                <option value="optional">Optional - Suggest but don't require [DI-XXX]</option>
                <option value="required">Required - Must include [DI-XXX] reference</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls whether commits must reference a delivery item like [DI-001]
              </p>
            </div>

            {/* Focus Block Reminders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Focus Block Reminders
              </label>
              <select
                value={localConfig.projects?.focusReminders || 'ask'}
                onChange={(e) => updateLocalConfig('projects.focusReminders', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never - Don't remind about focus blocks</option>
                <option value="ask">Ask - Prompt to start focus block when working</option>
                <option value="always">Always - Auto-start focus block with item</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls whether SAFER prompts you to start focused work sessions
              </p>
            </div>

            {/* Weekly Review Reminders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Review Reminders
              </label>
              <select
                value={localConfig.projects?.weeklyReview || 'ask'}
                onChange={(e) => updateLocalConfig('projects.weeklyReview', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never - Don't remind about weekly reviews</option>
                <option value="ask">Ask - Prompt for weekly review on Fridays</option>
                <option value="always">Always - Create calendar event automatically</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls whether SAFER reminds you to complete weekly retrospectives
              </p>
            </div>

            {/* Allow Bypass */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localConfig.projects?.allowBypass !== false}
                  onChange={(e) => updateLocalConfig('projects.allowBypass', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Allow git commit --no-verify bypass
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                When enabled, you can use --no-verify to skip SAFER checks (recommended)
              </p>
            </div>
          </div>

          {/* Notification */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> These settings control SAFER's behavior in your local environment only.
              Other developers on shared repositories won't see SAFER prompts or enforcement.
            </p>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Privacy & Data</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold mb-2">What SAFER tracks:</p>
            <ul className="list-disc ml-6 mb-4 text-sm space-y-1">
              <li>Delivery items and Definition of Done</li>
              <li>Git commit counts (not content)</li>
              <li>Work session timing</li>
            </ul>
            <p className="font-semibold mb-2">What SAFER never tracks:</p>
            <ul className="list-disc ml-6 text-sm space-y-1">
              <li>Source code content</li>
              <li>Keystrokes or screenshots</li>
              <li>Passwords or tokens</li>
            </ul>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <p className="text-gray-600 mb-2">SAFER Desktop v0.1.0</p>
          <p className="text-sm text-gray-500">Built on the SAFER Framework</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <div className="text-2xl font-bold mb-8">SAFER</div>
        <nav className="flex-1">
          <button
            onClick={() => setCurrentView('today')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'today'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            📊 Today
          </button>
          <button
            onClick={() => setCurrentView('all')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'all'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            📋 All Items
          </button>
          <button
            onClick={() => setCurrentView('metrics')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'metrics'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            📈 Metrics
          </button>
          <button
            onClick={() => setCurrentView('review')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'review'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            📝 Review
          </button>
          <button
            onClick={() => setCurrentView('status')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'status'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            🔧 Status
          </button>
          <button
            onClick={() => setCurrentView('import')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'import'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            📥 Import
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'settings'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            ⚙️ Settings
          </button>
        </nav>
        <div className="text-xs text-gray-500 mt-4">
          Desktop App v0.1.0
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Review Reminder Banner */}
        {reviewReminder?.needed && !reviewReminderDismissed && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-amber-600 text-xl">⚠️</span>
              <div>
                <p className="font-medium text-amber-800">
                  Weekly Review Needed: {reviewReminder.weekId}
                </p>
                <p className="text-sm text-amber-700">
                  {reviewReminder.daysOverdue === 0
                    ? "It's review day! Take a few minutes to reflect on last week."
                    : `${reviewReminder.daysOverdue} day${reviewReminder.daysOverdue > 1 ? 's' : ''} overdue. Complete your weekly review to track progress.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('review')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Do Review Now
              </button>
              <button
                onClick={() => setReviewReminderDismissed(true)}
                className="text-amber-600 hover:text-amber-800 px-2 py-1 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {currentView === 'today' && <TodayView />}
        {currentView === 'all' && <AllItemsView />}
        {currentView === 'metrics' && <MetricsView />}
        {currentView === 'review' && <ReviewView />}
        {currentView === 'status' && <StatusView />}
        {currentView === 'import' && <ImportView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

      {/* Create Item Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Create Delivery Item</h2>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <div className={`flex items-center gap-1 ${createStep === 1 ? 'text-blue-600 font-medium' : ''}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${createStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</span>
                  <span>Title</span>
                </div>
                <span>→</span>
                <div className={`flex items-center gap-1 ${createStep === 2 ? 'text-blue-600 font-medium' : ''}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${createStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</span>
                  <span>Definition of Done</span>
                </div>
              </div>
            </div>

            {createStep === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Title</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateItem()}
                  placeholder="Enter delivery item title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-sm text-gray-600 mb-4">Describe what you want to deliver (e.g., "Implement user authentication")</p>
              </div>
            )}

            {createStep === 2 && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Title: {newItemTitle}</p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Definition of Done</label>
                <p className="text-sm text-gray-600 mb-3">Add checkpoints that must be completed before this item is done</p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={currentDodInput}
                    onChange={(e) => setCurrentDodInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDodItem()}
                    placeholder="e.g., Tests written and passing"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addDodItem}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>

                {newItemDodItems.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {newItemDodItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="flex-1 text-sm">{item}</span>
                        <button
                          onClick={() => removeDodItem(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newItemDodItems.length === 0 && (
                  <div className="text-sm text-gray-500 italic mb-4">No DoD items yet. Add at least one checkpoint above.</div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {createStep === 2 && (
                <button
                  onClick={() => setCreateStep(1)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleCreateItem}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {createStep === 1 ? 'Next' : 'Create Item'}
              </button>
              <button
                onClick={handleCancelCreate}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Sidebar */}
      {selectedItem && <ItemDetailsView itemId={selectedItem} />}

      {/* Complete Item Dialog */}
      <CompleteItemDialog />
    </div>
  );
}

export default App;

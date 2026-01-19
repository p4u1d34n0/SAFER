import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  safer: {
    list: () => ipcRenderer.invoke('safer:list'),
    create: (title: string) => ipcRenderer.invoke('safer:create', title),
    status: () => ipcRenderer.invoke('safer:status'),
    systemStatus: () => ipcRenderer.invoke('safer:system-status'),
    show: (id: string) => ipcRenderer.invoke('safer:show', id),
    complete: (id: string, options: { stressLevel: number; learnings: string; incidents: number; archive: boolean }) => ipcRenderer.invoke('safer:complete', id, options),
    delete: (id: string) => ipcRenderer.invoke('safer:delete', id),
    archive: (id: string) => ipcRenderer.invoke('safer:archive', id),
    config: {
      get: () => ipcRenderer.invoke('safer:config:get'),
      set: (key: string, value: any) => ipcRenderer.invoke('safer:config:set', key, value),
      save: (config: any) => ipcRenderer.invoke('safer:config:save', config),
    },
    dod: {
      get: (id: string) => ipcRenderer.invoke('safer:dod:get', id),
      check: (id: string, dodId: string) => ipcRenderer.invoke('safer:dod:check', id, dodId),
      uncheck: (id: string, dodId: string) => ipcRenderer.invoke('safer:dod:uncheck', id, dodId),
      add: (id: string, text: string) => ipcRenderer.invoke('safer:dod:add', id, text),
    },
    import: {
      list: (source: string) => ipcRenderer.invoke('safer:import:list', source),
      items: (source: string, options: any) => ipcRenderer.invoke('safer:import', source, options),
    },
    github: {
      projects: () => ipcRenderer.invoke('safer:github:projects'),
      projectItems: (projectNumber: string) => ipcRenderer.invoke('safer:github:project-items', projectNumber),
      requestScope: () => ipcRenderer.invoke('safer:github:request-scope'),
    },
    metrics: () => ipcRenderer.invoke('safer:metrics'),
    reviews: () => ipcRenderer.invoke('safer:reviews'),
    createReview: (options: { wentWell: string; didntGoWell: string; blockers: string; learnings: string; adjustments: string }) => ipcRenderer.invoke('safer:review:create', options),
    updateReview: (weekId: string) => ipcRenderer.invoke('safer:review:update', weekId),
    checkReviewStatus: () => ipcRenderer.invoke('safer:review:check'),
    start: (id: string) => ipcRenderer.invoke('safer:start', id),
    stop: () => ipcRenderer.invoke('safer:stop'),
  },
});

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  safer: {
    list: () => ipcRenderer.invoke('safer:list'),
    create: (title: string) => ipcRenderer.invoke('safer:create', title),
    status: () => ipcRenderer.invoke('safer:status'),
    show: (id: string) => ipcRenderer.invoke('safer:show', id),
    complete: (id: string, stressLevel: number) => ipcRenderer.invoke('safer:complete', id, stressLevel),
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
    start: (id: string) => ipcRenderer.invoke('safer:start', id),
    stop: () => ipcRenderer.invoke('safer:stop'),
  },
});

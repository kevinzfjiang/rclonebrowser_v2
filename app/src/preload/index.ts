import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // App
  ping: async () => ipcRenderer.invoke('app:ping'),
  rcloneVersion: async () => ipcRenderer.invoke('rclone:version'),
  // Config
  configDump: async () => ipcRenderer.invoke('rclone:configDump'),
  configFile: async () => ipcRenderer.invoke('rclone:configFile'),
  listRemotes: async () => ipcRenderer.invoke('rclone:listRemotes'),
  createRemote: async (name: string, type: string, opts: Record<string, string>) => ipcRenderer.invoke('rclone:createRemote', name, type, opts),
  updateRemote: async (name: string, opts: Record<string, string>) => ipcRenderer.invoke('rclone:updateRemote', name, opts),
  deleteRemote: async (name: string) => ipcRenderer.invoke('rclone:deleteRemote', name),
  // Files
  lsjson: async (remotePath: string, extra: string[] = []) => ipcRenderer.invoke('rclone:lsjson', remotePath, extra),
  // Jobs
  jobsList: async () => ipcRenderer.invoke('jobs:list'),
  addTransfer: async (payload: { id: string; kind: 'copy'|'move'|'sync'; src: string; dst: string; extra?: string[] }) => ipcRenderer.invoke('jobs:addTransfer', payload),
  addMount: async (payload: { id: string; remotePath: string; mountPoint: string; extra?: string[] }) => ipcRenderer.invoke('jobs:addMount', payload),
  startJob: async (id: string) => ipcRenderer.invoke('jobs:start', id),
  cancelJob: async (id: string) => ipcRenderer.invoke('jobs:cancel', id),
  // Settings
  settingsGet: async () => ipcRenderer.invoke('settings:get'),
  settingsSet: async (s: Partial<{ bwlimit: string; transfers: number; checkers: number; retries: number; rcEnabled: boolean }>) => ipcRenderer.invoke('settings:set', s),
  // Unmount
  rcloneUnmount: async (mountPoint: string) => ipcRenderer.invoke('rclone:unmount', mountPoint)
});

export {};

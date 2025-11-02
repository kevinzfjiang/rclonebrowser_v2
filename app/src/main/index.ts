import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import type { IpcMainInvokeEvent } from 'electron';
import { JobManager } from './jobManager';
import * as rc from './rclone';
import { getSettings, setSettings } from './settings';

let mainWindow: BrowserWindow | null = null;
const jobs = new JobManager();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
  preload: path.join(path.dirname(fileURLToPath(import.meta.url)), '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../renderer/index.html'));
  }

  mainWindow.on('closed', () => (mainWindow = null));
};

app.whenReady().then(() => {
  // Persist user data under /config
  try { app.setPath('userData', '/config/userData'); } catch {}
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:ping', () => 'pong');

ipcMain.handle('rclone:version', async () => {
  return new Promise<string>((resolve, reject) => {
    const p = spawn('rclone', ['version']);
    let out = '';
    let err = '';
    p.stdout.on('data', (d: Buffer) => (out += d.toString()));
    p.stderr.on('data', (d: Buffer) => (err += d.toString()));
    p.on('close', (code: number) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || `rclone exited ${code}`));
    });
  });
});

// Config management
ipcMain.handle('rclone:configDump', () => rc.configDump());
ipcMain.handle('rclone:configFile', () => rc.configFile());
ipcMain.handle('rclone:listRemotes', () => rc.listRemotes());
ipcMain.handle('rclone:createRemote', (_e: IpcMainInvokeEvent, name: string, type: string, opts: Record<string, string>) => rc.createRemote(name, type, opts));
ipcMain.handle('rclone:updateRemote', (_e: IpcMainInvokeEvent, name: string, opts: Record<string, string>) => rc.updateRemote(name, opts));
ipcMain.handle('rclone:deleteRemote', (_e: IpcMainInvokeEvent, name: string) => rc.deleteRemote(name));

// File listing
ipcMain.handle('rclone:lsjson', (_e: IpcMainInvokeEvent, remotePath: string, extra: string[] = []) => rc.lsjson(remotePath, extra));

// Jobs
ipcMain.handle('jobs:list', () => jobs.list());
ipcMain.handle('jobs:addTransfer', (_e: IpcMainInvokeEvent, payload: { id: string; kind: 'copy'|'move'|'sync'; src: string; dst: string; extra?: string[] }) => {
  jobs.add({ id: payload.id, type: 'transfer', createdAt: Date.now(), status: 'queued', log: [], kind: payload.kind, src: payload.src, dst: payload.dst, extra: payload.extra || [] });
});
ipcMain.handle('jobs:addMount', (_e: IpcMainInvokeEvent, payload: { id: string; remotePath: string; mountPoint: string; extra?: string[] }) => {
  jobs.add({ id: payload.id, type: 'mount', createdAt: Date.now(), status: 'queued', log: [], remotePath: payload.remotePath, mountPoint: payload.mountPoint, extra: payload.extra || [] });
});
ipcMain.handle('jobs:start', (_e: IpcMainInvokeEvent, id: string) => jobs.start(id));
ipcMain.handle('jobs:cancel', (_e: IpcMainInvokeEvent, id: string) => jobs.cancel(id));

// Settings
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:set', (_e: IpcMainInvokeEvent, s: Partial<ReturnType<typeof getSettings>>) => setSettings(s));

// Unmount
ipcMain.handle('rclone:unmount', (_e: IpcMainInvokeEvent, mountPoint: string) => rc.unmount(mountPoint));

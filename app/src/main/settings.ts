import Store from 'electron-store';

export interface Settings {
  bwlimit: string; // e.g. "10M"
  transfers: number; // concurrent transfers
  checkers: number; // concurrent checkers
  retries: number; // failed retry count
  rcEnabled: boolean; // future use
}

const defaults: Settings = {
  bwlimit: '',
  transfers: 4,
  checkers: 8,
  retries: 3,
  rcEnabled: false
};

const store = new Store<Settings>({ name: 'settings', defaults });

export function getSettings(): Settings {
  return store.store;
}

export function setSettings(s: Partial<Settings>): Settings {
  const merged = { ...store.store, ...s };
  store.store = merged as Settings;
  return store.store;
}

export function settingsToArgs(s: Settings): string[] {
  const args: string[] = [];
  if (s.bwlimit) args.push('--bwlimit', s.bwlimit);
  if (s.transfers) args.push('--transfers', String(s.transfers));
  if (s.checkers) args.push('--checkers', String(s.checkers));
  if (s.retries) args.push('--retries', String(s.retries));
  return args;
}

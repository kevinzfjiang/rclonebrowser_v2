import { execa } from 'execa';

export type RcloneArgs = string[];

export async function run(args: RcloneArgs, opts: { json?: boolean } = {}) {
  const p = await execa('rclone', args, { all: true });
  if (opts.json) {
    try {
      return JSON.parse(p.stdout);
    } catch {
      return p.stdout;
    }
  }
  return p.stdout;
}

export async function version() {
  return run(['version']);
}

export async function configDump() {
  return run(['config', 'dump'], { json: true });
}

export async function configFile() {
  return run(['config', 'file']);
}

export async function listRemotes(): Promise<string[]> {
  const dump = await configDump();
  return Object.keys(dump || {});
}

export async function lsjson(remotePath: string, extra: string[] = []) {
  return run(['lsjson', remotePath, ...extra], { json: true });
}

export async function createRemote(name: string, type: string, options: Record<string, string>) {
  const args = ['config', 'create', name, type];
  for (const [k, v] of Object.entries(options)) args.push(k, v);
  return run(args);
}

export async function deleteRemote(name: string) {
  return run(['config', 'delete', name]);
}

export async function updateRemote(name: string, options: Record<string, string>) {
  const args = ['config', 'update', name];
  for (const [k, v] of Object.entries(options)) args.push(k, v);
  return run(args);
}

export type TransferKind = 'copy' | 'move' | 'sync';

export function transfer(kind: TransferKind, src: string, dst: string, extra: string[] = []) {
  return execa('rclone', [kind, src, dst, '--use-json-log', ...extra], { all: true });
}

export function mount(remotePath: string, mountPoint: string, extra: string[] = []) {
  return execa('rclone', ['mount', remotePath, mountPoint, '--use-json-log', ...extra], { all: true });
}

export async function unmount(mountPoint: string) {
  try {
    return await execa('fusermount3', ['-u', mountPoint], { all: true });
  } catch {
    return execa('fusermount', ['-u', mountPoint], { all: true });
  }
}

import { ChildProcess } from 'node:child_process';
import Store from 'electron-store';
import { transfer, mount } from './rclone';
import { getSettings, settingsToArgs } from './settings';

export type JobType = 'transfer' | 'mount';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BaseJob {
  id: string;
  type: JobType;
  createdAt: number;
  status: JobStatus;
  log: string[];
  progress?: { bytes?: number; speed?: number; transferred?: number; checks?: number; errors?: number };
}

export interface TransferJob extends BaseJob {
  type: 'transfer';
  kind: 'copy' | 'move' | 'sync';
  src: string;
  dst: string;
  extra: string[];
}

export interface MountJob extends BaseJob {
  type: 'mount';
  remotePath: string;
  mountPoint: string;
  extra: string[];
}

type Job = TransferJob | MountJob;

const store = new Store<{ jobs: Record<string, Job> }>({ name: 'jobs' });

export class JobManager {
  private jobs: Map<string, { job: Job; proc?: ChildProcess }> = new Map();

  constructor() {
    const persisted = (store.get('jobs') ?? {}) as Record<string, Job>;
    for (const [id, job] of Object.entries(persisted)) {
      this.jobs.set(id, { job });
    }
  }

  list() {
    return Array.from(this.jobs.values()).map(x => x.job);
  }

  get(id: string) {
    return this.jobs.get(id)?.job;
  }

  add(job: Job) {
    this.jobs.set(job.id, { job });
    this.persist();
  }

  start(id: string) {
    const entry = this.jobs.get(id);
    if (!entry) throw new Error('Job not found');
    const job = entry.job;
    job.status = 'running';
    let p: ChildProcess;
    const settingsArgs = settingsToArgs(getSettings());
    if (job.type === 'transfer') {
      p = transfer(job.kind, job.src, job.dst, [...settingsArgs, ...job.extra]);
    } else {
      p = mount(job.remotePath, job.mountPoint, [...settingsArgs, ...job.extra]);
    }
    entry.proc = p;
  p.all?.on('data', (d: any) => {
      const line = d.toString();
      job.log.push(line);
      // Parse JSON log entries from rclone --use-json-log
      try {
        const obj = JSON.parse(line);
        if (obj && obj['msg'] && obj['level']) {
          // Extract metrics
          const stats = obj['stats'] || obj;
          job.progress = job.progress || {};
          if (typeof stats['bytes'] === 'number') job.progress.bytes = stats['bytes'];
          if (typeof stats['speed'] === 'number') job.progress.speed = stats['speed'];
          if (typeof stats['transfers'] === 'number') job.progress.transferred = stats['transfers'];
          if (typeof stats['checks'] === 'number') job.progress.checks = stats['checks'];
          if (typeof stats['errors'] === 'number') job.progress.errors = stats['errors'];
        }
      } catch { /* ignore non-JSON lines */ }
      this.persist();
    });
  p.on('close', (code: number) => {
      job.status = code === 0 ? 'completed' : 'failed';
      this.persist();
    });
    this.persist();
  }

  cancel(id: string) {
    const entry = this.jobs.get(id);
    if (entry?.proc && !entry.proc.killed) {
      entry.proc.kill();
      entry.job.status = 'cancelled';
      this.persist();
    }
  }

  private persist() {
    const obj: Record<string, Job> = {};
    for (const [id, { job }] of this.jobs.entries()) obj[id] = job;
    store.set('jobs', obj);
  }
}

import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Switch, Paper } from '@mui/material';
import './i18n';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      rcloneVersion: () => Promise<string>;
      configDump: () => Promise<any>;
      configFile: () => Promise<string>;
      listRemotes: () => Promise<string[]>;
      createRemote: (name: string, type: string, opts: Record<string, string>) => Promise<any>;
      updateRemote: (name: string, opts: Record<string, string>) => Promise<any>;
      deleteRemote: (name: string) => Promise<any>;
      lsjson: (remotePath: string, extra?: string[]) => Promise<any[]>;
      jobsList: () => Promise<any[]>;
      addTransfer: (payload: { id: string; kind: 'copy'|'move'|'sync'; src: string; dst: string; extra?: string[] }) => Promise<void>;
      addMount: (payload: { id: string; remotePath: string; mountPoint: string; extra?: string[] }) => Promise<void>;
      startJob: (id: string) => Promise<void>;
      cancelJob: (id: string) => Promise<void>;
    };
  }
}

const RemotesTab: React.FC = () => {
  const { t } = useTranslation();
  const [remotes, setRemotes] = React.useState<string[]>([]);
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('s3');
  const [opts, setOpts] = React.useState<Record<string, string>>({});
  const load = async () => setRemotes(await window.api.listRemotes());
  React.useEffect(() => { load(); }, []);
  return (
    <Box p={2}>
      <Button onClick={load}>{t('remotes')}</Button>
      <Box mt={2}>
        <TextField label="Name" size="small" value={name} onChange={e=>setName(e.target.value)} />
        <FormControl size="small" sx={{ ml: 1, minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={type} onChange={e=>setType(e.target.value as string)}>
            <MenuItem value="s3">s3</MenuItem>
            <MenuItem value="webdav">webdav</MenuItem>
            <MenuItem value="drive">drive</MenuItem>
          </Select>
        </FormControl>
        <Button sx={{ ml: 1 }} variant="contained" onClick={async ()=>{ await window.api.createRemote(name, type, opts); await load(); }}>{t('add')}</Button>
      </Box>
      <Box mt={2}>
        {remotes.map(r=> (
          <Box key={r} display="flex" alignItems="center" gap={1}>
            <Typography>{r}</Typography>
            <Button size="small" color="error" onClick={async ()=>{ await window.api.deleteRemote(r); await load(); }}>{t('delete')}</Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const BrowserTab: React.FC = () => {
  const [src, setSrc] = React.useState('');
  const [dst, setDst] = React.useState('');
  const [items, setItems] = React.useState<any[]>([]);
  const list = async () => { if (src) setItems(await window.api.lsjson(src)); };
  const enqueue = async (kind: 'copy'|'move'|'sync') => {
    const id = `${kind}-${Date.now()}`;
    await window.api.addTransfer({ id, kind, src, dst });
  };
  return (
    <Box p={2}>
      <Paper sx={{ p:1 }}>
        <Box display="flex" gap={1}>
          <TextField label="Source" fullWidth size="small" value={src} onChange={e=>setSrc(e.target.value)} />
          <TextField label="Dest" fullWidth size="small" value={dst} onChange={e=>setDst(e.target.value)} />
        </Box>
        <Box mt={1} display="flex" gap={1}>
          <Button variant="contained" onClick={list}>List</Button>
          <Button onClick={()=>enqueue('copy')}>Copy</Button>
          <Button onClick={()=>enqueue('move')}>Move</Button>
          <Button onClick={()=>enqueue('sync')}>Sync</Button>
        </Box>
      </Paper>
      <Box mt={2}>
        {items.map(it=> (
          <Box key={it.Path} display="flex" justifyContent="space-between"><span>{it.Name}</span><span>{it.IsDir? 'dir':'file'}</span></Box>
        ))}
      </Box>
    </Box>
  );
};

const QueueTab: React.FC = () => {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const load = async () => setJobs(await window.api.jobsList());
  React.useEffect(()=>{ load(); const id = setInterval(load, 2000); return ()=>clearInterval(id); }, []);
  return (
    <Box p={2}>
      {jobs.map(j=> (
        <Paper key={j.id} sx={{ p:1, mb:1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>{j.type} {j.status}</span>
            <Box>
              <Button size="small" onClick={()=>window.api.startJob(j.id)}>Start</Button>
              <Button size="small" color="error" onClick={()=>window.api.cancelJob(j.id)}>Cancel</Button>
            </Box>
          </Box>
          {j.progress && (
            <Box mt={1} display="flex" gap={2}>
              <span>bytes: {j.progress.bytes ?? '-'}</span>
              <span>speed: {j.progress.speed ?? '-'}</span>
              <span>transfers: {j.progress.transferred ?? '-'}</span>
              <span>checks: {j.progress.checks ?? '-'}</span>
              <span>errors: {j.progress.errors ?? '-'}</span>
            </Box>
          )}
          <Box mt={1} sx={{ maxHeight: 120, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
            {(j.log || []).slice(-20).map((l: string, idx: number)=> <div key={idx}>{l}</div>)}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

const MountTab: React.FC = () => {
  const [remote, setRemote] = React.useState('');
  const [mountPoint, setMountPoint] = React.useState('/media/mnt');
  const start = async () => {
    const id = `mount-${Date.now()}`;
    await window.api.addMount({ id, remotePath: remote, mountPoint });
    await window.api.startJob(id);
  };
  const unmount = async () => { await window.api.rcloneUnmount(mountPoint); };
  return (
    <Box p={2}>
      <TextField label="Remote Path" fullWidth size="small" value={remote} onChange={e=>setRemote(e.target.value)} />
      <TextField sx={{ mt:1 }} label="Mount Point" fullWidth size="small" value={mountPoint} onChange={e=>setMountPoint(e.target.value)} />
      <Box mt={1} display="flex" gap={1}>
        <Button variant="contained" onClick={start}>Mount</Button>
        <Button color="error" onClick={unmount}>Unmount</Button>
      </Box>
    </Box>
  );
};

const SettingsTab: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [dark, setDark] = React.useState(false);
  const [bwlimit, setBwlimit] = React.useState('');
  const [transfers, setTransfers] = React.useState(4);
  const [checkers, setCheckers] = React.useState(8);
  const [retries, setRetries] = React.useState(3);
  React.useEffect(()=>{ (async ()=>{
    try {
      const s = await window.api.settingsGet();
      setBwlimit(s.bwlimit || '');
      setTransfers(s.transfers || 4);
      setCheckers(s.checkers || 8);
      setRetries(s.retries || 3);
    } catch {}
  })(); }, []);
  const save = async () => {
    await window.api.settingsSet({ bwlimit, transfers, checkers, retries });
  };
  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <Typography>{t('language')}</Typography>
        <Select size="small" value={i18n.language} onChange={e=>i18n.changeLanguage(e.target.value as string)}>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="zh-CN">中文</MenuItem>
        </Select>
        <Typography sx={{ ml: 2 }}>{t('theme')}</Typography>
        <Switch checked={dark} onChange={e=>setDark(e.target.checked)} />
      </Box>
      <Box mt={2} display="flex" gap={2}>
        <TextField label="bwlimit" size="small" value={bwlimit} onChange={e=>setBwlimit(e.target.value)} />
        <TextField label="transfers" type="number" size="small" value={transfers} onChange={e=>setTransfers(Number(e.target.value))} />
        <TextField label="checkers" type="number" size="small" value={checkers} onChange={e=>setCheckers(Number(e.target.value))} />
        <TextField label="retries" type="number" size="small" value={retries} onChange={e=>setRetries(Number(e.target.value))} />
        <Button variant="contained" onClick={save}>Save</Button>
      </Box>
      <ThemePreview dark={dark} />
    </Box>
  );
};

const ThemePreview: React.FC<{ dark: boolean }> = ({ dark }) => {
  const theme = React.useMemo(()=>createTheme({ palette: { mode: dark ? 'dark' : 'light' } }), [dark]);
  return (
    <ThemeProvider theme={theme}>
      <Box mt={2} p={2} sx={{ border: '1px solid', borderColor: 'divider' }}>Theme preview</Box>
    </ThemeProvider>
  );
};

const Shell: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState(0);
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">{t('title')}</Typography>
          <Box sx={{ ml: 'auto' }}>
            <Button color="inherit" onClick={async ()=>alert(await window.api.ping())}>{t('ping')}</Button>
            <Button color="inherit" onClick={async ()=>alert(await window.api.rcloneVersion())}>{t('version')}</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Tabs value={tab} onChange={(_e, v)=>setTab(v)}>
        <Tab label={t('remotes')} />
        <Tab label={t('browser')} />
        <Tab label={t('queue')} />
        <Tab label={t('mount')} />
        <Tab label={t('settings')} />
      </Tabs>
      {tab===0 && <RemotesTab />}
      {tab===1 && <BrowserTab />}
      {tab===2 && <QueueTab />}
      {tab===3 && <MountTab />}
      {tab===4 && <SettingsTab />}
    </Box>
  );
};

export default Shell;

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CssBaseline } from '@mui/material';

const root = createRoot(document.getElementById('root')!);
root.render(<>
  <CssBaseline />
  <App />
</>);

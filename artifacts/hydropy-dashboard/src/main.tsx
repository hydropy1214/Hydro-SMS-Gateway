import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// Wire up auth token so every API request sends Authorization: Bearer <token>
setAuthTokenGetter(() => localStorage.getItem('hydropy_token'));

createRoot(document.getElementById('root')!).render(<App />);

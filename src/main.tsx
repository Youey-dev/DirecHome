import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// The one typeface, self-hosted (no third-party font request)
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

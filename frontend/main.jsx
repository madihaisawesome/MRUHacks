import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// StrictMode double-mounts effects and can break getUserMedia on remount.
createRoot(document.getElementById('root')).render(<App />);
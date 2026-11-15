import { render } from 'preact';
import { App } from './App';
import { initPwa } from './lib/pwa';
import { S, emit, load, onSaveError, reload, LS_KEY } from './lib/store';
import { sheetsOpen } from './ui/sheets';
import { toast } from './ui/toast';
import './styles/fonts.css';
import './styles/app.css';

load();
onSaveError(toast);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

render(<App />, document.getElementById('app')!);

// Данные могла изменить другая вкладка или окно установленного приложения
const sync = () => { if (!sheetsOpen()) { reload(); emit(); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
window.addEventListener('storage', e => { if (e.key === LS_KEY) sync(); });

if (typeof matchMedia === 'function') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S().theme === 0) emit(); });
}

initPwa(() => toast('StuStu готов работать без интернета'));

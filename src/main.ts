import './style.css';
import { getAuthState, handleOAuthCallback } from './api/auth';
import { getTodayTrigger, computeState, type AppState } from './timer';
import { postsToday, hasEverPosted } from './state';
import { renderCountdown, updateCountdownDisplay } from './screens/countdown';
import { renderCapture } from './screens/capture';
import { renderFeed } from './screens/feed';
import { renderLogin } from './screens/login';
import { renderInstallNudge } from './components/installNudge';

const app = document.getElementById('app')!;
type Screen = AppState | 'login';
let activeScreen: Screen | null = null;
let tickId: number | null = null;

function mount(screen: Screen): void {
  app.innerHTML = '';
  if (screen === 'login') app.appendChild(renderLogin());
  else if (screen === 'before_trigger') app.appendChild(renderCountdown());
  else if (screen === 'awaiting_capture') app.appendChild(renderCapture());
  else app.appendChild(renderFeed());
  renderInstallNudge();
}

function tick(): void {
  const auth = getAuthState();
  const screen: Screen = auth
    ? computeState(getTodayTrigger(), postsToday(), !hasEverPosted())
    : 'login';

  if (screen !== activeScreen) {
    activeScreen = screen;
    mount(screen);
  }

  if (screen === 'before_trigger') {
    updateCountdownDisplay(getTodayTrigger());
  }
}

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    // Clean up URL before rendering so the code isn't re-used on refresh
    history.replaceState({}, '', window.location.pathname);
    try {
      await handleOAuthCallback(code);
    } catch (err) {
      console.error('OAuth callback error:', err);
    }
  }

  tick();
  tickId = window.setInterval(tick, 1000);
}

init();

if (import.meta.hot) {
  import.meta.hot.dispose(() => { if (tickId !== null) clearInterval(tickId); });
}

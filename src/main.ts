import './style.css';
import { getTodayTrigger, computeState, type AppState } from './timer';
import { hasPostedToday } from './state';
import { renderCountdown, updateCountdownDisplay } from './screens/countdown';
import { renderCapture } from './screens/capture';
import { renderFeed } from './screens/feed';
import { renderInstallNudge } from './components/installNudge';

const app = document.getElementById('app')!;
let activeState: AppState | null = null;
let tickId: number | null = null;

function mount(state: AppState): void {
  app.innerHTML = '';
  if (state === 'before_trigger') {
    app.appendChild(renderCountdown());
  } else if (state === 'awaiting_capture') {
    app.appendChild(renderCapture());
  } else {
    app.appendChild(renderFeed());
  }
  renderInstallNudge();
}

function tick(): void {
  const trigger = getTodayTrigger();
  const state = computeState(trigger, hasPostedToday());

  if (state !== activeState) {
    activeState = state;
    mount(state);
  }

  if (state === 'before_trigger') {
    updateCountdownDisplay(trigger);
  }
}

tick();
tickId = window.setInterval(tick, 1000);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickId !== null) clearInterval(tickId);
  });
}

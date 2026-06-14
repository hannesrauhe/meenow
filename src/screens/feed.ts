import { SLEEPING_CAT } from '../icons';
import { clearAuth } from '../api/auth';

// Phase 5 will replace this with the actual Pixelfed timeline feed.
export function renderFeed(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen gap-6 text-center';
  el.id = 'screen-feed';

  el.innerHTML = `
    <div class="flex flex-col items-center gap-4 text-ink/40">
      <div class="w-36 h-24">${SLEEPING_CAT}</div>
      <div class="space-y-1">
        <p class="text-sm">No meenow posts from friends yet today.</p>
        <p class="text-xs text-ink/25">Feed coming in Phase 5.</p>
      </div>
    </div>
    <button id="btn-logout" class="text-xs text-ink/30 underline underline-offset-2">Disconnect account</button>
  `;

  el.querySelector('#btn-logout')?.addEventListener('click', () => {
    clearAuth();
    window.location.reload();
  });

  return el;
}

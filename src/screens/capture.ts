import { markPostedToday } from '../state';
import { CAT_EARS_SHUTTER } from '../icons';

// Phase 2 will replace this with the actual dual-camera capture flow.
export function renderCapture(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'screen gap-8 text-center';
  el.id = 'screen-capture';

  el.innerHTML = `
    <div class="flex flex-col items-center gap-6">
      <div class="w-16 h-16 text-gold">${CAT_EARS_SHUTTER}</div>
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-ink">It's meenow time!</h2>
        <p class="text-sm text-ink/60 max-w-xs leading-relaxed">
          Camera capture is coming in Phase 2.
        </p>
      </div>
      <button id="btn-dev-post" class="btn-primary">
        Simulate post (dev only)
      </button>
    </div>
  `;

  el.querySelector('#btn-dev-post')?.addEventListener('click', () => {
    markPostedToday();
    window.location.reload();
  });

  return el;
}

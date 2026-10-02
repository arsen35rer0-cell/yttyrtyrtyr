import './styles.css';
import { boot } from './app.js';

function showFatalError(error) {
  console.error(error);

  const overlay = document.getElementById('error-overlay');
  const message = document.getElementById('error-message');
  const reloadButton = document.getElementById('error-reload');

  if (overlay && message) {
    overlay.hidden = false;
    message.textContent = error?.stack || String(error);
  }

  if (reloadButton) {
    reloadButton.onclick = () => window.location.reload();
  }
}

window.addEventListener('error', (event) => {
  const app = document.getElementById('app');

  if (!app || app.dataset.ready !== 'true') {
    showFatalError(event.error || event.message || 'Неизвестная ошибка загрузки.');
  }
});

boot()
  .then(() => {
    const app = document.getElementById('app');

    if (app) {
      app.dataset.ready = 'true';
    }
  })
  .catch(showFatalError);

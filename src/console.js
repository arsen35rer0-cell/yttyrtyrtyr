export class ConsolePanel {
  constructor(root) {
    this.root = root;
    this.list = root.querySelector('#console-list');
    this.clearButton = root.querySelector('#console-clear');
    this.filterButtons = Array.from(root.querySelectorAll('[data-filter]'));
    this.entries = [];
    this.filter = 'all';

    this.clearButton?.addEventListener('click', () => {
      this.clear();
    });

    this.filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setFilter(button.dataset.filter);
      });
    });
  }

  normalizeLevel(level) {
    if (level === 'error' || level === 'warn' || level === 'info') {
      return level;
    }

    return 'info';
  }

  setFilter(filter) {
    this.filter = filter;

    this.filterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.filter === filter);
    });

    for (const entry of this.entries) {
      entry.hidden = !(filter === 'all' || entry.dataset.level === filter);
    }
  }

  add(rawLevel, payload = []) {
    const level = this.normalizeLevel(rawLevel);

    const entry = document.createElement('div');
    entry.className = `console-entry console-${level}`;
    entry.dataset.level = level;
    entry.hidden = !(this.filter === 'all' || level === this.filter);

    const time = document.createElement('span');
    time.className = 'console-time';
    time.textContent = new Date().toLocaleTimeString();

    const badge = document.createElement('span');
    badge.className = 'console-badge';
    badge.textContent = level;

    const text = document.createElement('pre');
    text.className = 'console-text';
    text.textContent = String(payload.join('\n'));

    entry.append(time, badge, text);

    this.list.appendChild(entry);
    this.entries.push(entry);

    if (this.entries.length > 800) {
      const oldest = this.entries.shift();
      oldest.remove();
    }

    this.list.scrollTop = this.list.scrollHeight;
  }

  clear() {
    for (const entry of this.entries) {
      entry.remove();
    }

    this.entries = [];
  }
}

export const DEFAULT_FILES = {
  'index.html': `<div class="stage">
  <article class="card">
    <p class="badge">WebForge IDE</p>
    <h1>Живой предпросмотр</h1>
    <p>
      Редактируй HTML, CSS и JavaScript слева.
      Предпросмотр обновляется автоматически.
    </p>

    <div class="row">
      <button id="magic">Сделать магию</button>
      <span id="count">0</span>
    </div>
  </article>
</div>
`,

  'style.css': `:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.35), transparent 30%),
    radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.25), transparent 25%),
    #05070f;
  color: #e5e7eb;
  overflow: hidden;
}

.stage {
  padding: 24px;
}

.card {
  width: min(560px, calc(100vw - 48px));
  padding: 28px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.65);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  animation: appear 0.5s ease;
}

.badge {
  display: inline-block;
  margin: 0 0 12px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #dbeafe;
  background: rgba(59, 130, 246, 0.16);
  border: 1px solid rgba(59, 130, 246, 0.24);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 12px;
  font-size: 34px;
  line-height: 1.08;
}

p {
  margin: 0;
  color: #94a3b8;
  line-height: 1.6;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 20px;
}

button {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1, #22d3ee);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.3);
}

button:active {
  transform: scale(0.98);
}

#count {
  font-size: 24px;
  font-weight: 700;
  min-width: 34px;
  text-align: center;
}

body.magic {
  animation: hue 2s linear infinite;
}

@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes hue {
  from {
    filter: hue-rotate(0deg);
  }
  to {
    filter: hue-rotate(360deg);
  }
}
`,

  'script.js': `const button = document.getElementById('magic');
const count = document.getElementById('count');

let value = 0;

if (button && count) {
  button.addEventListener('click', () => {
    value += 1;
    count.textContent = String(value);

    document.body.classList.toggle('magic', value % 2 === 0);

    console.log('Клик по кнопке. Текущее значение:', value);
  });
}

console.info('Проект WebForge запущен.');
`
};

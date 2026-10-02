import { DEFAULT_FILES } from './defaultProject.js';
import { loadSettings, saveSettings, defaultSettings } from './settings.js';
import { createEditor } from './editor.js';
import { buildPreviewHtml, buildExportHtml } from './preview.js';
import { ConsolePanel } from './console.js';
import { debounce, download } from './utils.js';

const FILE_ORDER = ['index.html', 'style.css', 'script.js'];
const SESSION_KEY = 'webforge.session.v1';

export async function boot() {
  const els = {
    app: document.getElementById('app'),
    fileList: document.getElementById('file-list'),
    tabs: document.getElementById('tabs'),
    editorHost: document.getElementById('editor-host'),
    previewFrame: document.getElementById('preview-frame'),
    consolePanel: document.getElementById('console-panel'),
    btnNew: document.getElementById('btn-new'),
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    btnExport: document.getElementById('btn-export'),
    btnRun: document.getElementById('btn-run'),
    btnTheme: document.getElementById('btn-theme'),
    autoRun: document.getElementById('autorun'),
    previewReload: document.getElementById('preview-reload'),
    statusText: document.getElementById('status-text'),
    cursorInfo: document.getElementById('cursor-info'),
    toastRoot: document.getElementById('toast-root'),
    errorReload: document.getElementById('error-reload')
  };

  let settings = loadSettings();
  const session = loadSession();

  let files = normalizeFiles(session?.files || DEFAULT_FILES);
  let activeFile = FILE_ORDER.includes(session?.activeFile)
    ? session.activeFile
    : FILE_ORDER[0];

  const editors = new Map();

  let projectDirty = false;

  const consolePanel = new ConsolePanel(els.consolePanel);

  const schedulePreview = debounce(() => {
    if (settings.autoRun) {
      runPreview();
    }
  }, 550);

  const scheduleSessionSave = debounce(saveSession, 800);

  applyTheme();
  applyFontSize();
  createEditors();
  bindUI();
  renderTabs();
  renderFiles();
  setActiveFile(activeFile);
  runPreview();
  status('Готов');

  window.addEventListener('message', onPreviewMessage);
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  function bindUI() {
    els.btnNew.addEventListener('click', newProject);
    els.btnOpen.addEventListener('click', openProject);
    els.btnSave.addEventListener('click', saveProject);
    els.btnExport.addEventListener('click', exportHtml);
    els.btnRun.addEventListener('click', runPreview);
    els.previewReload.addEventListener('click', runPreview);
    els.btnTheme.addEventListener('click', toggleTheme);

    els.autoRun.checked = Boolean(settings.autoRun);

    els.autoRun.addEventListener('change', () => {
      settings.autoRun = els.autoRun.checked;
      saveSettings(settings);

      if (settings.autoRun) {
        runPreview();
      }
    });

    els.previewFrame.addEventListener('load', () => {
      status('Предпросмотр готов');
    });

    els.errorReload?.addEventListener('click', () => {
      window.location.reload();
    });

    window.addEventListener(
      'keydown',
      (event) => {
        const modifier = event.ctrlKey || event.metaKey;

        if (!modifier) {
          return;
        }

        const key = event.key.toLowerCase();

        if (key === 's') {
          event.preventDefault();
          saveProject();
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          runPreview();
        }

        if (key === 'e') {
          event.preventDefault();
          exportHtml();
        }
      },
      true
    );
  }

  function renderTabs() {
    els.tabs.innerHTML = '';

    for (const file of FILE_ORDER) {
      const button = document.createElement('button');
      button.className = 'tab' + (file === activeFile ? ' active' : '');
      button.innerHTML = `<span class="tab-dot"></span>${file}`;

      button.addEventListener('click', () => {
        setActiveFile(file);
      });

      els.tabs.appendChild(button);
    }
  }

  function renderFiles() {
    els.fileList.innerHTML = '';

    for (const file of FILE_ORDER) {
      const button = document.createElement('button');
      button.className = 'file-item' + (file === activeFile ? ' active' : '');
      button.innerHTML = `<span class="file-dot"></span>${file}`;

      button.addEventListener('click', () => {
        setActiveFile(file);
      });

      els.fileList.appendChild(button);
    }
  }

  function setActiveFile(file) {
    activeFile = file;

    renderTabs();
    renderFiles();

    editors.forEach((editor, name) => {
      editor.root.hidden = name !== file;
    });

    editors.get(file)?.view.focus();
    status(`Файл: ${file}`);
  }

  function destroyEditors() {
    editors.forEach((editor) => {
      editor.view.destroy();
    });

    editors.clear();
    els.editorHost.innerHTML = '';
  }

  function createEditors() {
    destroyEditors();

    for (const file of FILE_ORDER) {
      const editor = createEditor({
        file,
        doc: files[file],
        parent: els.editorHost,
        dark: settings.theme === 'dark',
        onChange(value) {
          files[file] = value;
          projectDirty = true;

          updateDirtyUI();
          schedulePreview();
          scheduleSessionSave();
          status(`Изменён ${file}`);
        },
        onCursor(text) {
          els.cursorInfo.textContent = text;
        }
      });

      editor.root.hidden = file !== activeFile;
      editors.set(file, editor);
    }
  }

  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme;

    els.btnTheme.textContent = settings.theme === 'dark' ? '☀️' : '🌙';

    editors.forEach((editor) => {
      editor.setTheme(settings.theme === 'dark');
    });
  }

  function toggleTheme() {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings(settings);
    applyTheme();
  }

  function applyFontSize() {
    document.documentElement.style.setProperty(
      '--editor-font-size',
      `${Number(settings.fontSize || 14)}px`
    );
  }

  function runPreview() {
    try {
      status('Сборка предпросмотра...');

      const documentHtml = buildPreviewHtml(files);
      els.previewFrame.srcdoc = documentHtml;
    } catch (error) {
      console.error(error);
      toast('Ошибка предпросмотра: ' + error.message, 'error');
    }
  }

  function onPreviewMessage(event) {
    if (!els.previewFrame || event.source !== els.previewFrame.contentWindow) {
      return;
    }

    const data = event.data;

    if (!data || data.source !== 'webforge-preview' || data.type !== 'console') {
      return;
    }

    consolePanel.add(data.level || 'info', data.payload || []);

    if (data.level === 'error') {
      status('В предпросмотре есть ошибки');
    }
  }

  async function saveProject() {
    status('Сохранение проекта...');

    const payload = {
      files,
      settings
    };

    if (window.ide?.saveProject) {
      try {
        const result = await window.ide.saveProject(payload);

        if (result?.ok) {
          projectDirty = false;
          updateDirtyUI();
          toast('Проект сохранён', 'success');
          status('Проект сохранён: ' + result.filePath);
          return;
        }

        if (result?.canceled) {
          status('Сохранение отменено');
          return;
        }

        toast(result?.error || 'Не удалось сохранить проект', 'error');
      } catch (error) {
        toast('Ошибка сохранения: ' + error.message, 'error');
      }

      return;
    }

    download(
      'project.webide.json',
      JSON.stringify(
        {
          app: 'webforge-ide',
          version: 1,
          files,
          settings
        },
        null,
        2
      ),
      'application/json'
    );

    toast('Проект скачан как JSON', 'success');
  }

  async function openProject() {
    if (window.ide?.openProject) {
      try {
        const result = await window.ide.openProject();

        if (result?.ok && result.project) {
          applyProject(result.project);
          toast('Проект открыт', 'success');
          return;
        }

        if (result?.canceled) {
          status('Открытие отменено');
          return;
        }

        toast(result?.error || 'Не удалось открыть проект', 'error');
      } catch (error) {
        toast('Ошибка открытия: ' + error.message, 'error');
      }

      return;
    }

    fallbackOpenProject();
  }

  function fallbackOpenProject() {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.json,.webide,application/json';

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const project = JSON.parse(text);

        applyProject(project);
        toast('Проект открыт', 'success');
      } catch (error) {
        toast('Не удалось открыть файл: ' + error.message, 'error');
      }
    };

    input.click();
  }

  async function exportHtml() {
    status('Экспорт HTML...');

    const html = buildExportHtml(files);

    if (window.ide?.exportHtml) {
      try {
        const result = await window.ide.exportHtml(html);

        if (result?.ok) {
          toast('HTML экспортирован', 'success');
          status('HTML экспортирован: ' + result.filePath);
          return;
        }

        if (result?.canceled) {
          status('Экспорт отменён');
          return;
        }

        toast(result?.error || 'Не удалось экспортировать HTML', 'error');
      } catch (error) {
        toast('Ошибка экспорта: ' + error.message, 'error');
      }

      return;
    }

    download('index.html', html, 'text/html');
    toast('HTML скачан', 'success');
  }

  function newProject() {
    if (projectDirty) {
      const confirmed = window.confirm(
        'Создать новый проект? Несохранённые изменения будут потеряны.'
      );

      if (!confirmed) {
        return;
      }
    }

    applyProject({
      files: DEFAULT_FILES,
      settings: defaultSettings
    });

    toast('Новый проект создан', 'success');
  }

  function applyProject(project) {
    files = normalizeFiles(project?.files || {});

    if (project?.settings) {
      settings = {
        ...settings,
        ...project.settings
      };
    }

    activeFile = FILE_ORDER[0];

    els.autoRun.checked = Boolean(settings.autoRun);

    applyTheme();
    applyFontSize();
    createEditors();
    renderTabs();
    renderFiles();
    setActiveFile(activeFile);

    saveSettings(settings);
    runPreview();
    saveSession();

    projectDirty = false;
    updateDirtyUI();
  }

  function normalizeFiles(input = {}) {
    const result = {};

    for (const file of FILE_ORDER) {
      result[file] =
        typeof input[file] === 'string'
          ? input[file]
          : DEFAULT_FILES[file];
    }

    return result;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return {
        files: parsed.files,
        activeFile: parsed.activeFile
      };
    } catch {
      return null;
    }
  }

  function saveSession() {
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          files,
          activeFile,
          savedAt: Date.now()
        })
      );
    } catch {
      // Если локальное хранилище недоступно, просто пропускаем.
    }
  }

  function updateDirtyUI() {
    document.body.classList.toggle('dirty', projectDirty);
    els.btnSave.classList.toggle('attention', projectDirty);
  }

  function status(text) {
    els.statusText.textContent = text;
  }

  function toast(message, type = 'info') {
    const toastElement = document.createElement('div');

    toastElement.className = `toast toast-${type}`;
    toastElement.textContent = message;

    els.toastRoot.appendChild(toastElement);

    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });

    setTimeout(() => {
      toastElement.classList.remove('show');

      setTimeout(() => {
        toastElement.remove();
      }, 350);
    }, 3200);
  }

  function onWindowError(event) {
    console.error(event.error || event.message);
    toast('Ошибка интерфейса: ' + (event.message || 'неизвестная ошибка'), 'error');
  }

  function onUnhandledRejection(event) {
    console.error(event.reason);
    toast('Необработанная ошибка: ' + String(event.reason), 'error');
  }
}

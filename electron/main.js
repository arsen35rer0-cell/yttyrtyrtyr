const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');

let mainWindow = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();

    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.focus();
  });

  app.whenReady()
    .then(() => {
      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch((error) => {
      console.error('Не удалось запустить приложение:', error);
      app.quit();
    });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('uncaughtException:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection:', error);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#05070f',
    title: 'WebForge IDE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, url) => {
    const currentUrl = contents.getURL();

    const allowed =
      url === currentUrl ||
      url.startsWith('file://') ||
      url.startsWith('http://localhost:5173') ||
      url.startsWith('devtools://');

    if (!allowed) {
      navigationEvent.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url).catch(() => {});
    }

    return { action: 'deny' };
  });

  contents.on('render-process-gone', (event, details) => {
    console.error('Рендер-процесс завершился:', details);

    const window = BrowserWindow.fromWebContents(contents);

    if (window && !window.isDestroyed()) {
      setTimeout(() => {
        window.webContents.reloadIgnoringCache();
      }, 300);
    }
  });
});

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender) || mainWindow || undefined;
}

function makeErrorResult(error) {
  return {
    ok: false,
    error: error?.message || String(error)
  };
}

ipcMain.handle('project:save', async (event, payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Некорректные данные проекта.');
    }

    const window = getWindowFromEvent(event);

    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Сохранить проект WebForge',
      defaultPath: 'project.webide.json',
      filters: [
        {
          name: 'WebForge Project',
          extensions: ['webide', 'json']
        }
      ]
    });

    if (canceled || !filePath) {
      return {
        ok: false,
        canceled: true
      };
    }

    const serialized = JSON.stringify(
      {
        app: 'webforge-ide',
        version: 1,
        savedAt: new Date().toISOString(),
        files: payload.files || {},
        settings: payload.settings || {}
      },
      null,
      2
    );

    await fs.writeFile(filePath, serialized, 'utf8');

    return {
      ok: true,
      filePath
    };
  } catch (error) {
    return makeErrorResult(error);
  }
});

ipcMain.handle('project:open', async (event) => {
  try {
    const window = getWindowFromEvent(event);

    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Открыть проект WebForge',
      buttonLabel: 'Открыть',
      filters: [
        {
          name: 'WebForge Project',
          extensions: ['webide', 'json']
        }
      ],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return {
        ok: false,
        canceled: true
      };
    }

    const raw = await fs.readFile(filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !parsed.files) {
      throw new Error('Выбранный файл не является проектом WebForge.');
    }

    return {
      ok: true,
      project: parsed,
      filePath: filePaths[0]
    };
  } catch (error) {
    return makeErrorResult(error);
  }
});

ipcMain.handle('project:export-html', async (event, html) => {
  try {
    if (typeof html !== 'string' || html.length === 0) {
      throw new Error('HTML для экспорта пуст.');
    }

    const window = getWindowFromEvent(event);

    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Экспорт HTML',
      defaultPath: 'index.html',
      filters: [
        {
          name: 'HTML',
          extensions: ['html']
        }
      ]
    });

    if (canceled || !filePath) {
      return {
        ok: false,
        canceled: true
      };
    }

    await fs.writeFile(filePath, html, 'utf8');

    return {
      ok: true,
      filePath
    };
  } catch (error) {
    return makeErrorResult(error);
  }
});

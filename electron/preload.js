const { contextBridge, ipcRenderer } = require('electron');

const versions =
  typeof process !== 'undefined' && process.versions
    ? process.versions
    : {};

contextBridge.exposeInMainWorld('ide', {
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportHtml: (html) => ipcRenderer.invoke('project:export-html', html),
  versions
});

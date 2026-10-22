const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  home: () => ipcRenderer.invoke('fs:home'),
  readdir: (d) => ipcRenderer.invoke('fs:readdir', d),
  readfile: (f) => ipcRenderer.invoke('fs:readfile', f),
  stat: (f) => ipcRenderer.invoke('fs:stat', f),
  drives: () => ipcRenderer.invoke('fs:drives'),
  reveal: (f) => ipcRenderer.send('fs:reveal', f),
  open: (f) => ipcRenderer.send('fs:open', f),
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close')
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  home: () => ipcRenderer.invoke('fs:home'),
  readdir: (d) => ipcRenderer.invoke('fs:readdir', d),
  readfile: (f) => ipcRenderer.invoke('fs:readfile', f),
  stat: (f) => ipcRenderer.invoke('fs:stat', f),
  drives: () => ipcRenderer.invoke('fs:drives'),
  reveal: (f) => ipcRenderer.send('fs:reveal', f),
  open: (f) => ipcRenderer.send('fs:open', f),
  openWith: (f) => ipcRenderer.send('fs:openwith', f),
  copy: (files) => ipcRenderer.invoke('fs:copy', files),
  paste: (dir) => ipcRenderer.invoke('fs:paste', dir),
  remove: (f) => ipcRenderer.invoke('fs:delete', f),
  rename: (f, n) => ipcRenderer.invoke('fs:rename', f, n),
  props: (f) => ipcRenderer.invoke('fs:props', f),
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close')
});

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('carloiDesktop', {
  platform: process.platform,
  versions: process.versions,
});

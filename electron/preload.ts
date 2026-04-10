import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)
// Signals to the renderer that it is running inside Electron.
// Used in src/routes.tsx to activate hash routing when loading from file://.
contextBridge.exposeInMainWorld('__ELECTRON__', true)

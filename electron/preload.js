const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("etherealDesktop", {
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  setPreference: (change) => ipcRenderer.invoke("desktop:preferences", change),
  windowAction: (action) => ipcRenderer.invoke("desktop:window", action),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("desktop:state", listener);
    return () => ipcRenderer.removeListener("desktop:state", listener);
  },
});

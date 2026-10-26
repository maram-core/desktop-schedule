const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  session,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

let window;
let settings;
let settingsPath;
let recreationTimer;
const development = !app.isPackaged && process.argv.includes("--dev");
const rendererURL = development
  ? "http://127.0.0.1:3000/"
  : pathToFileURL(path.join(__dirname, "../build/index.html")).href;
const supportsBlur =
  process.platform === "darwin" ||
  (process.platform === "win32" && Number(os.release().split(".")[2]) >= 22621);
const defaults = {
  frameless: true,
  alwaysOnTop: false,
  appearance: supportsBlur ? "blur" : "solid",
};

function readSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return {
      frameless:
        typeof saved.frameless === "boolean"
          ? saved.frameless
          : defaults.frameless,
      alwaysOnTop:
        typeof saved.alwaysOnTop === "boolean"
          ? saved.alwaysOnTop
          : defaults.alwaysOnTop,
      appearance: [
        "solid",
        "transparent",
        ...(supportsBlur ? ["blur"] : []),
      ].includes(saved.appearance)
        ? saved.appearance
        : defaults.appearance,
    };
  } catch {
    return { ...defaults };
  }
}
function state() {
  return {
    ...settings,
    platform: process.platform,
    supportsBlur,
    maximized: Boolean(window && !window.isDestroyed() && window.isMaximized()),
  };
}
function broadcast() {
  if (window && !window.isDestroyed())
    window.webContents.send("desktop:state", state());
}
function trusted(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url !== rendererURL
  ) {
    throw new Error("Untrusted desktop request");
  }
}
function createWindow(bounds) {
  const previous = window;
  const transparent = settings.appearance === "transparent";
  const next = new BrowserWindow({
    width: 1180,
    height: 900,
    minWidth: 620,
    minHeight: 640,
    ...bounds,
    title: "Ethereal Schedule & Task Manager",
    frame: !settings.frameless,
    roundedCorners: true,
    transparent,
    resizable: !transparent,
    maximizable: !transparent,
    backgroundColor: settings.appearance === "solid" ? "#f5f4f8" : "#00000000",
    vibrancy:
      settings.appearance === "blur" && process.platform === "darwin"
        ? "under-window"
        : undefined,
    visualEffectState: "active",
    backgroundMaterial:
      settings.appearance === "blur" && process.platform === "win32"
        ? "acrylic"
        : "none",
    alwaysOnTop: settings.alwaysOnTop,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  window = next;
  next.webContents.setWindowOpenHandler(({ url }) => {
    // No remote content is ever loaded into a privileged application window.
    if (/^https:\/\//.test(url)) shell.openExternal(url).catch(console.error);
    return { action: "deny" };
  });
  next.webContents.on("will-navigate", (event, url) => {
    if (url !== rendererURL) event.preventDefault();
  });
  next.webContents.on("will-attach-webview", (event) => event.preventDefault());
  next.on("maximize", broadcast);
  next.on("unmaximize", broadcast);
  next.once("ready-to-show", () => {
    next.show();
    if (previous && !previous.isDestroyed()) previous.destroy();
  });
  next.on("closed", () => {
    if (window === next) window = null;
  });
  next.loadURL(rendererURL).catch((error) => {
    console.error("Unable to load Ethereal:", error);
    app.quit();
  });
}

app.whenReady().then(() => {
  settingsPath = path.join(app.getPath("userData"), "window-preferences.json");
  settings = readSettings();
  // Windows requires a frameless window for transparency.
  if (settings.appearance === "transparent") settings.frameless = true;
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
  ipcMain.handle("desktop:get-state", (event) => {
    trusted(event);
    return state();
  });
  ipcMain.handle("desktop:preferences", (event, change) => {
    trusted(event);
    if (
      !change ||
      typeof change !== "object" ||
      Array.isArray(change) ||
      Object.keys(change).length !== 1
    )
      throw new Error("Invalid preference");
    const next = { ...settings };
    if (
      Object.hasOwn(change, "alwaysOnTop") &&
      typeof change.alwaysOnTop === "boolean"
    )
      next.alwaysOnTop = change.alwaysOnTop;
    else if (
      Object.hasOwn(change, "frameless") &&
      typeof change.frameless === "boolean"
    ) {
      next.frameless = change.frameless;
      if (!next.frameless && next.appearance === "transparent")
        next.appearance = "solid";
    } else if (
      Object.hasOwn(change, "appearance") &&
      ["solid", "transparent", ...(supportsBlur ? ["blur"] : [])].includes(
        change.appearance,
      )
    ) {
      next.appearance = change.appearance;
      if (next.appearance === "transparent") next.frameless = true;
    } else throw new Error("Unsupported preference");
    // Persist before reporting success; the renderer displays write failures.
    const temporary = `${settingsPath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(temporary, settingsPath);
    const recreate =
      next.frameless !== settings.frameless ||
      next.appearance !== settings.appearance;
    settings = next;
    window.setAlwaysOnTop(settings.alwaysOnTop);
    broadcast();
    if (recreate) {
      const bounds = window.getNormalBounds();
      // Let the renderer receive the response before replacing its window.
      clearTimeout(recreationTimer);
      recreationTimer = setTimeout(() => {
        if (window && !window.isDestroyed()) createWindow(bounds);
      }, 150);
    }
    return state();
  });
  ipcMain.handle("desktop:window", (event, action) => {
    trusted(event);
    if (action === "minimize") window.minimize();
    else if (action === "maximize" && settings.appearance !== "transparent")
      window.isMaximized() ? window.unmaximize() : window.maximize();
    else if (action === "close") window.close();
    else throw new Error("Unsupported window action");
  });
  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

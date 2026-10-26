# Ethereal Schedule & Task Manager

A calm, responsive daily planner built with React and TypeScript. Frosted-glass panels, pastel glows, and a week strip keep your plans in one personal workspace.

## Features

- Navigate any day using the week strip, day arrows, Today button, or keyboard-accessible calendar modal.
- Add daily schedule slots with start/end times and Focus, Personal, Wellbeing, or Meeting categories. Mark them complete or delete them. Slots sort by start time; overlapping plans are allowed. Slots must end after they start on the same day.
- Create nested checklists (up to four subtask levels). Completing a parent completes its descendants; child completion updates the parent. Delete a task to remove its entire branch.
- See daily completion across checklist items (including parents and subtasks) and schedule slots.
- Write a separate reflection for each day.
- Automatically save your plans in this browser's local storage. No account or backend is required. Data does not sync between devices or browsers; clearing site storage removes it. A warning appears if the browser cannot save.

## Development

Node.js 24.19.0 and npm 11.9.0 were used for validation.

```sh
npm ci
npm start
```

The development server uses port 3000. To run without opening a browser:

```sh
CI=true BROWSER=none HOST=127.0.0.1 PORT=3000 npm start
```

## Validation and production

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

The tests cover nested completion, local persistence, daily isolation, calendar navigation, time validation, deletion, and invalid-storage recovery. Production output is written to `build/` and can be hosted by a static web server. Google Fonts are optional; system sans-serif fonts provide a fallback.

## Desktop app (Electron)

Use Node.js **22.12 or newer** (Node 24 is recommended). Install development dependencies with `npm ci`.

```sh
# Build React and launch a standalone desktop window (no web server needed)
npm run electron:start

# Or develop with React hot reload and Electron together, using port 3000
npm run electron:dev
```

Close any existing web development server on port 3000 before using `electron:dev`. Closing the Electron process also stops its development server. The browser-only workflow (`npm start`) remains available; desktop controls only appear inside Electron.

The desktop toolbar provides:

- **Always on top:** pin or unpin the window immediately.
- **Frameless window:** switch between a draggable custom glass title bar with minimize/maximize/close controls and a native OS frame.
- **Soft solid:** resizable pastel window, available on every platform.
- **Transparent:** sets Electron's `transparent: true`, enables the frameless window, and makes the page translucent. Transparent windows have a fixed size and cannot maximize, following Electron's platform limitations. Resize in solid mode before switching to transparency.
- **Native blur:** macOS `vibrancy: 'under-window'` or Windows 11 (build 22621+) `backgroundMaterial: 'acrylic'`. This option is disabled on unsupported systems. Linux transparency and rounded corners depend on the desktop compositor; native desktop blur is not available there. Older Windows versions may display square window corners.

Changing appearance or frame briefly recreates the window. Window preferences are stored in `window-preferences.json` in Electron's user-data directory. Schedule data stays in that application's local storage across window changes and launches. The desktop app and browser development server have separate storage; existing browser plans are not automatically imported. Uninstalling or clearing the desktop app's profile can remove plans.

The renderer runs with Node integration disabled, context isolation and sandboxing enabled. A small preload bridge exposes only window actions and validated preferences; remote navigation and permission requests are blocked.

### Installers

```sh
# On Windows: build the x64 NSIS installer (.exe)
npm run dist:win

# On macOS: build a disk image (.dmg) for the build machine's architecture
npm run dist:mac
# Choose Apple Silicon or Intel explicitly when needed:
npm run dist:mac -- --arm64
npm run dist:mac -- --x64

# On Linux: build an AppImage
npm run dist:linux

# Create an unpacked app for the current platform, without an installer
npm run desktop:pack
```

Artifacts are written to `dist/`, using the Ethereal app icon. `npm run dist` builds the default target for the current platform. Build Windows installers on Windows and DMGs on macOS; this Linux environment does not validate their native appearance or installation. Electron supports Windows 10+, macOS 13+, and supported modern Linux distributions. Native blur requires the newer Windows version noted above.

Local unsigned installers can be built without signing credentials. Signing/notarization for distribution requires your own platform certificates and electron-builder signing configuration. Build outputs, dependencies, and signing credentials are not committed.

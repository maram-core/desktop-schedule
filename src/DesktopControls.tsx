import { useEffect, useState } from "react";
import "./DesktopControls.css";

export default function DesktopControls() {
  const [state, setState] = useState<DesktopState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const api = window.etherealDesktop;
    if (!api) return;
    let active = true;
    api
      .getState()
      .then((s) => {
        if (active) setState(s);
      })
      .catch(() => {
        if (active) setError("Desktop controls are unavailable.");
      });
    const unsubscribe = api.onState((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "desktop-transparent",
      state?.appearance === "transparent",
    );
    document.documentElement.classList.toggle(
      "desktop-blur",
      state?.appearance === "blur",
    );
    return () => {
      document.documentElement.classList.remove(
        "desktop-transparent",
        "desktop-blur",
      );
    };
  }, [state?.appearance]);
  if (!window.etherealDesktop) return null;
  async function preference(change: DesktopPreference) {
    setBusy(true);
    setError("");
    try {
      setState(await window.etherealDesktop!.setPreference(change));
    } catch {
      setError("Could not save window preferences. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function action(value: "minimize" | "maximize" | "close") {
    try {
      await window.etherealDesktop!.windowAction(value);
    } catch {
      setError("The window action could not be completed.");
    }
  }
  return (
    <div className="desktop-chrome">
      <div className="desktop-titlebar">
        <span className="desktop-drag-label">✧ ETHEREAL SCHEDULE</span>
        <div className="desktop-actions">
          <button
            className={`desktop-pill ${state?.alwaysOnTop ? "pinned" : ""}`}
            disabled={!state || busy}
            aria-pressed={state?.alwaysOnTop || false}
            onClick={() => preference({ alwaysOnTop: !state?.alwaysOnTop })}
          >
            ⌖ {state?.alwaysOnTop ? "Pinned on top" : "Always on top"}
          </button>
          {state?.frameless && (
            <div className="window-buttons">
              <button
                aria-label="Minimize window"
                onClick={() => action("minimize")}
              >
                −
              </button>
              <button
                aria-label={
                  state.maximized ? "Restore window" : "Maximize window"
                }
                disabled={state.appearance === "transparent"}
                title={
                  state.appearance === "transparent"
                    ? "Use Solid or Native blur to resize or maximize"
                    : undefined
                }
                onClick={() => action("maximize")}
              >
                □
              </button>
              <button
                className="window-close"
                aria-label="Close window"
                onClick={() => action("close")}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      {state && (
        <div className="desktop-options">
          <label>
            <input
              type="checkbox"
              checked={state.frameless}
              disabled={busy}
              onChange={(e) => preference({ frameless: e.target.checked })}
            />{" "}
            Frameless window
          </label>
          <label>
            Appearance{" "}
            <select
              aria-label="Window appearance"
              value={state.appearance}
              disabled={busy}
              onChange={(e) =>
                preference({
                  appearance: e.target.value as DesktopState["appearance"],
                })
              }
            >
              <option value="solid">Soft solid</option>
              <option value="transparent">Transparent</option>
              <option value="blur" disabled={!state.supportsBlur}>
                Native blur{!state.supportsBlur ? " (macOS / Windows 11)" : ""}
              </option>
            </select>
          </label>
          <span>
            Appearance and frame changes reopen this window.
            {state.appearance === "transparent"
              ? " Transparent windows have a fixed size."
              : ""}
          </span>
        </div>
      )}
      {error && (
        <p className="desktop-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

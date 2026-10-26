export {};
declare global {
  type DesktopState = {
    platform: string;
    frameless: boolean;
    alwaysOnTop: boolean;
    appearance: "solid" | "transparent" | "blur";
    maximized: boolean;
    supportsBlur: boolean;
  };
  type DesktopPreference =
    | { alwaysOnTop: boolean }
    | { frameless: boolean }
    | { appearance: DesktopState["appearance"] };
  interface Window {
    etherealDesktop?: {
      getState(): Promise<DesktopState>;
      setPreference(change: DesktopPreference): Promise<DesktopState>;
      windowAction(action: "minimize" | "maximize" | "close"): Promise<void>;
      onState(callback: (state: DesktopState) => void): () => void;
    };
  }
}

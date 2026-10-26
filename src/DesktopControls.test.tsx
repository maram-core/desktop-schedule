import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DesktopControls from "./DesktopControls";

const initial: DesktopState = {
  platform: "win32",
  frameless: true,
  alwaysOnTop: false,
  appearance: "solid",
  maximized: false,
  supportsBlur: true,
};
let unsubscribe: jest.Mock;
beforeEach(() => {
  unsubscribe = jest.fn();
  window.etherealDesktop = {
    getState: jest.fn().mockResolvedValue(initial),
    setPreference: jest
      .fn()
      .mockImplementation((change) =>
        Promise.resolve({ ...initial, ...change }),
      ),
    windowAction: jest.fn().mockResolvedValue(undefined),
    onState: jest.fn().mockReturnValue(unsubscribe),
  };
});
afterEach(() => {
  delete window.etherealDesktop;
});

test("does not show desktop-only controls in the browser", () => {
  delete window.etherealDesktop;
  const { container } = render(<DesktopControls />);
  expect(container).toBeEmptyDOMElement();
});

test("toggles pinning through the scoped preload bridge and releases its listener", async () => {
  const view = render(<DesktopControls />);
  const pin = await screen.findByRole("button", { name: /Always on top/ });
  await waitFor(() => expect(pin).toBeEnabled());
  fireEvent.click(pin);
  expect(window.etherealDesktop!.setPreference).toHaveBeenCalledWith({
    alwaysOnTop: true,
  });
  expect(
    await screen.findByRole("button", { name: /Pinned on top/ }),
  ).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByLabelText("Minimize window"));
  expect(window.etherealDesktop!.windowAction).toHaveBeenCalledWith("minimize");
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test("updates the transparent background and hides custom controls in framed mode", async () => {
  window.etherealDesktop!.getState = jest
    .fn()
    .mockResolvedValue({
      ...initial,
      frameless: false,
      appearance: "transparent",
    });
  const view = render(<DesktopControls />);
  await screen.findByLabelText("Window appearance");
  expect(document.documentElement).toHaveClass("desktop-transparent");
  expect(screen.queryByLabelText("Close window")).not.toBeInTheDocument();
  view.unmount();
  expect(document.documentElement).not.toHaveClass("desktop-transparent");
});

test("reports preference write failures without falsely showing a pinned window", async () => {
  window.etherealDesktop!.setPreference = jest
    .fn()
    .mockRejectedValue(new Error("disk full"));
  render(<DesktopControls />);
  const pin = await screen.findByRole("button", { name: /Always on top/ });
  await waitFor(() => expect(pin).toBeEnabled());
  fireEvent.click(pin);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not save window preferences",
  );
  expect(pin).toHaveAttribute("aria-pressed", "false");
});

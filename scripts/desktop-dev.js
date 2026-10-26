// Start CRA and Electron together; stop both when either process exits.
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const electron = require("electron");
const root = path.join(__dirname, "..");
const server = spawn(
  process.execPath,
  [require.resolve("react-scripts/scripts/start")],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      BROWSER: "none",
      HOST: "127.0.0.1",
      PORT: "3000",
      CI: "true",
    },
  },
);
let desktop;
let stopped = false;
let timer;
let attempts = 0;
function stop(code = 0) {
  if (stopped) return;
  stopped = true;
  clearTimeout(timer);
  desktop?.kill();
  server.kill();
  process.exitCode = code;
}
server.on("error", (error) => {
  console.error(error);
  stop(1);
});
server.on("exit", (code) => stop(code || 0));
function waitForServer() {
  if (stopped) return;
  if (++attempts > 120) {
    console.error(
      "React did not start within 120 seconds. Check whether port 3000 is occupied.",
    );
    stop(1);
    return;
  }
  const request = http.get("http://127.0.0.1:3000/", (response) => {
    let html = "";
    response.on("data", (chunk) => {
      html += chunk;
    });
    response.on("end", () => {
      if (stopped) return;
      if (
        response.statusCode !== 200 ||
        !html.includes('<div id="root"></div>')
      ) {
        timer = setTimeout(waitForServer, 1000);
        return;
      }
      desktop = spawn(electron, [".", "--dev"], {
        cwd: root,
        stdio: "inherit",
        env: process.env,
      });
      desktop.on("error", (error) => {
        console.error(error);
        stop(1);
      });
      desktop.on("exit", (code) => stop(code || 0));
    });
  });
  request.setTimeout(1500, () => request.destroy());
  request.on("error", () => {
    if (!stopped) timer = setTimeout(waitForServer, 1000);
  });
}
waitForServer();
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

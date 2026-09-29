import { spawnSync } from "node:child_process";

const composeArgs = ["compose", "-f", "infra/docker/e2e/docker-compose.yaml"];
const playwrightArgs = process.argv.slice(2);
let receivedSignal;
let cleanupStarted = false;

process.once("SIGINT", () => {
  receivedSignal = "SIGINT";
});
process.once("SIGTERM", () => {
  receivedSignal = "SIGTERM";
});

const runDockerCompose = (args) => {
  const result = spawnSync("docker", [...composeArgs, ...args], {
    stdio: "inherit",
  });

  if (result.signal) {
    receivedSignal ??= result.signal;
    return receivedSignal === "SIGINT" ? 130 : 143;
  }

  return result.status ?? 1;
};

const cleanup = () => {
  if (cleanupStarted) return;

  cleanupStarted = true;
  runDockerCompose(["down"]);
};

let exitCode = 1;

try {
  exitCode = runDockerCompose([
    "up",
    "-d",
    "--build",
    "--wait",
    "client",
    "server",
  ]);

  if (exitCode === 0 && !receivedSignal) {
    exitCode = runDockerCompose(["run", "--rm", "--no-deps", "seed"]);
  }

  if (exitCode === 0 && !receivedSignal) {
    exitCode = runDockerCompose([
      "run",
      "--rm",
      "--build",
      "--no-deps",
      "playwright",
      "pnpm",
      "-F",
      "client",
      "exec",
      "playwright",
      "test",
      ...playwrightArgs,
    ]);
  }
} finally {
  cleanup();
}

process.exit(
  receivedSignal === "SIGINT"
    ? 130
    : receivedSignal === "SIGTERM"
      ? 143
      : exitCode,
);

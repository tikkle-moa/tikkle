import { spawn } from "node:child_process";

const composeArgs = ["compose", "-f", "infra/docker/e2e/docker-compose.yaml"];
const playwrightArgs = process.argv.slice(2);
let receivedSignal;
let activeProcess;

const handleSignal = (signal) => {
  receivedSignal ??= signal;
  activeProcess?.kill(signal);
};

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

const runCommand = (command, args) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    activeProcess = child;

    child.once("close", (code) => {
      if (activeProcess === child) activeProcess = undefined;
      resolve(code ?? 1);
    });
  });
};

const runDockerCompose = (args) =>
  runCommand("docker", [...composeArgs, ...args]);

let exitCode = 1;

try {
  if (!receivedSignal) {
    exitCode = await runDockerCompose([
      "up",
      "-d",
      "--build",
      "--wait",
      "client",
      "server",
    ]);
  }

  if (exitCode === 0 && !receivedSignal) {
    exitCode = await runDockerCompose(["run", "--rm", "--no-deps", "seed"]);
  }

  if (exitCode === 0 && !receivedSignal) {
    exitCode = await runDockerCompose([
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
  await runDockerCompose(["down"]);
}

process.exit(
  receivedSignal === "SIGINT"
    ? 130
    : receivedSignal === "SIGTERM"
      ? 143
      : exitCode,
);

import { spawn } from "node:child_process";

const playwrightArgs = process.argv.slice(2);
// Playwright CLI options whose next token is an option value, not a test filter.
const valueOptions = new Set([
  "--browser",
  "-c",
  "--config",
  "-g",
  "--grep",
  "-G",
  "--grep-invert",
  "--global-timeout",
  "-j",
  "--workers",
  "--last-failed-file",
  "--max-failures",
  "--output",
  "--project",
  "--repeat-each",
  "--reporter",
  "--retries",
  "--shard",
  "--test-list",
  "--test-list-invert",
  "--timeout",
  "--trace",
  "--tsconfig",
  "--ui-host",
  "--ui-port",
  "--update-source-method",
]);
const snapshotModes = new Set(["all", "changed", "missing", "none"]);
const optionalValueOptions = new Map([
  ["--debug", new Set(["inspector", "cli"])],
  ["--only-changed", undefined],
  ["-u", snapshotModes],
  ["--update-snapshots", snapshotModes],
]);
const testSelectors = [];

for (let index = 0; index < playwrightArgs.length; index += 1) {
  const argument = playwrightArgs[index];
  if (valueOptions.has(argument)) {
    if (
      playwrightArgs[index + 1] &&
      !playwrightArgs[index + 1].startsWith("-")
    ) {
      index += 1;
    }
  } else if (optionalValueOptions.has(argument)) {
    const value = playwrightArgs[index + 1];
    const acceptedValues = optionalValueOptions.get(argument);
    if (
      value &&
      !value.startsWith("-") &&
      (!acceptedValues || acceptedValues.has(value))
    ) {
      index += 1;
    }
  } else if (!argument.startsWith("-")) {
    testSelectors.push(argument);
  }
}

const hasSpecificE2eScope = (selector) => {
  const scope = selector.match(/^e2e\/([^/]+)/)?.[1];
  return Boolean(
    scope && /^[\w-]+(?:\.(?:spec|test)\.[cm]?[jt]sx?)?$/.test(scope),
  );
};
const hasBroadTestSelector = testSelectors.some(
  (selector) => !hasSpecificE2eScope(selector),
);
const needsPaymentMock =
  testSelectors.length === 0 ||
  hasBroadTestSelector ||
  testSelectors.some((selector) =>
    /(?:^|\/)reservation-checkout(?:\/|\.|$)/.test(selector),
  );
const composeArgs = ["compose", "-f", "infra/docker/e2e/docker-compose.yaml"];

if (needsPaymentMock) {
  composeArgs.push("-f", "infra/docker/e2e/docker-compose.payment.yaml");
}

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

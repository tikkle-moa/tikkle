import { spawnSync } from "node:child_process";

const composeArgs = ["compose", "-f", "infra/docker/docker-compose.e2e.yaml"];
const playwrightArgs = process.argv.slice(2);

const runDockerCompose = (args) => {
  const result = spawnSync("docker", [...composeArgs, ...args], {
    stdio: "inherit",
  });

  return result.status ?? 1;
};

let exitCode = 1;

try {
  exitCode = runDockerCompose([
    "up",
    "-d",
    "--build",
    "--wait",
    "client-e2e",
    "server-e2e",
  ]);

  if (exitCode === 0) {
    exitCode = runDockerCompose(["run", "--rm", "e2e-seed"]);
  }

  if (exitCode === 0) {
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
  runDockerCompose(["down"]);
}

process.exit(exitCode);

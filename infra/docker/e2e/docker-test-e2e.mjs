import { spawnSync } from "node:child_process";

const composeArgs = ["compose", "-f", "infra/docker/e2e/docker-compose.yaml"];
const playwrightArgs = process.argv.slice(2);
const redisPassword = "tikkle_e2e_redis_password";
const bookingSessions = [
  ["00000000-0000-4000-8000-000000000001", "1"],
  ["00000000-0000-4000-8000-000000000002", "2"],
];

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
    "client",
    "server",
  ]);

  if (exitCode === 0) {
    exitCode = runDockerCompose(["run", "--rm", "--no-deps", "seed"]);
  }

  if (exitCode === 0) {
    for (const [tokenId, userId] of bookingSessions) {
      exitCode = runDockerCompose([
        "exec",
        "-T",
        "redis",
        "redis-cli",
        "-a",
        redisPassword,
        "SET",
        `auth:refresh:${tokenId}`,
        userId,
        "EX",
        "3600",
      ]);

      if (exitCode !== 0) break;
    }
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

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const composeArgs = ["compose", "-f", "infra/docker/e2e/docker-compose.yaml"];
const redisPassword = "tikkle_e2e_redis_password";
const sessionConfig = JSON.parse(
  readFileSync(
    new URL(
      "../../../apps/client/e2e/config/e2e-auth-sessions.config.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const sessions = [sessionConfig.checkout, ...sessionConfig.occupancy];

for (const { tokenId, userId } of sessions) {
  const result = spawnSync(
    "docker",
    [
      ...composeArgs,
      "exec",
      "-T",
      "redis",
      "redis-cli",
      "-a",
      redisPassword,
      "SET",
      `auth:refresh:${tokenId}`,
      String(userId),
      "EX",
      "3600",
    ],
    { stdio: "inherit" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

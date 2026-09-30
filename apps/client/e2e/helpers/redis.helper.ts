import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const redisCommand = async (...args: string[]) => {
  const { stdout } = await execFileAsync("redis-cli", ["-h", "redis", "-a", "tikkle_e2e_redis_password", "--no-auth-warning", "--raw", ...args]);
  return stdout.trim();
};

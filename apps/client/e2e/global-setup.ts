import { E2E_AUTH_SESSIONS } from "./config/e2e-auth-sessions.config";
import { redisCommand } from "./helpers/redis.helper";

const registerAuthSessions = async () => {
  const sessions = [E2E_AUTH_SESSIONS.checkout, ...E2E_AUTH_SESSIONS.occupancy];

  await Promise.all(sessions.map(({ tokenId, userId }) => redisCommand("SET", `auth:refresh:${tokenId}`, String(userId), "EX", "3600")));
};

export default registerAuthSessions;

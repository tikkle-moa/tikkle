import { readFileSync } from "node:fs";

interface E2EAuthSession {
  tokenId: string;
  userId: number;
}

interface E2EAuthSessionsConfig {
  checkout: E2EAuthSession;
  occupancy: [E2EAuthSession, E2EAuthSession];
}

export const E2E_AUTH_SESSIONS = JSON.parse(
  readFileSync(new URL("./e2e-auth-sessions.config.json", import.meta.url), "utf8"),
) as E2EAuthSessionsConfig;

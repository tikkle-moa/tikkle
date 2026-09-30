import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const deleteReservationsForPerformance = async (performanceId: number) => {
  if (!Number.isInteger(performanceId) || performanceId <= 0) {
    throw new Error(`Invalid performance ID: ${performanceId}`);
  }

  await execFileAsync(
    "mysql",
    [
      "--default-character-set=utf8mb4",
      "-h",
      "mysql",
      "-u",
      "tikkle_e2e",
      "tikkle_e2e",
      "-e",
      `DELETE FROM reservation_seats WHERE performance_id = ${performanceId};\nDELETE FROM reservations WHERE performance_id = ${performanceId};\nDELETE FROM outbox_events WHERE performance_id = ${performanceId};`,
    ],
    { env: { ...process.env, MYSQL_PWD: "tikkle_e2e_password" } },
  );
};

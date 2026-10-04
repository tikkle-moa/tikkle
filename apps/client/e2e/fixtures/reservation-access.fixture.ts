import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const runMysql = async (query: string) => {
  const { stdout } = await execFileAsync(
    "mysql",
    ["--default-character-set=utf8mb4", "-N", "-B", "-h", "mysql", "-u", "tikkle_e2e", "tikkle_e2e", "-e", query],
    { env: { ...process.env, MYSQL_PWD: "tikkle_e2e_password" } },
  );

  return stdout.trim();
};

const createReservationAccessScenario = async () => {
  const suffix = randomUUID();
  const ownerGroupId = `e2e-access-owner-${suffix}`;
  const otherGroupId = `e2e-access-other-${suffix}`;
  const ownerOrderId = `e2e-access-owner-order-${suffix}`;
  const otherOrderId = `e2e-access-other-order-${suffix}`;

  const rows = await runMysql(`
    INSERT INTO reservations (
      performance_id, booker_user_id, group_id, order_id, order_name,
      amount, status, payment_expires_at, created_at
    ) VALUES
      (900000, 2, '${ownerGroupId}', '${ownerOrderId}', 'E2E 본인 예매', 150000, 'SUCCEEDED', DATE_ADD(NOW(), INTERVAL 1 DAY), NOW()),
      (900000, 3, '${otherGroupId}', '${otherOrderId}', 'E2E 타인 예매', 150000, 'SUCCEEDED', DATE_ADD(NOW(), INTERVAL 1 DAY), NOW());
    SELECT group_id, id FROM reservations
    WHERE group_id IN ('${ownerGroupId}', '${otherGroupId}')
    ORDER BY group_id;
  `);

  const reservationIds = new Map(
    rows.split("\n").map((row) => {
      const [groupId, id] = row.split("\t");
      return [groupId, Number(id)];
    }),
  );
  const ownerReservationId = reservationIds.get(ownerGroupId);
  const otherReservationId = reservationIds.get(otherGroupId);

  if (!ownerReservationId || !otherReservationId) {
    throw new Error("예매 접근 권한 E2E 데이터를 생성하지 못했습니다.");
  }

  return { ownerReservationId, otherReservationId };
};

const cleanupReservationAccessScenario = async ({
  ownerReservationId,
  otherReservationId,
}: Awaited<ReturnType<typeof createReservationAccessScenario>>) => {
  await runMysql(`
    DELETE FROM reservation_seats WHERE reservation_id IN (${ownerReservationId}, ${otherReservationId});
    DELETE FROM reservations WHERE id IN (${ownerReservationId}, ${otherReservationId});
  `);
};

export const test = base.extend<{
  reservationAccessScenario: Awaited<ReturnType<typeof createReservationAccessScenario>>;
}>({
  reservationAccessScenario: async ({ request: _request }, use) => {
    const scenario = await createReservationAccessScenario();

    try {
      // Playwright fixture의 use는 React Hook이 아닙니다.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await use(scenario);
    } finally {
      await cleanupReservationAccessScenario(scenario);
    }
  },
});

export const E2E_SEED_CONCERTS = {
  normal: {
    id: 900000,
    title: "E2E 정상 콘서트",
  },
  withoutPerformance: {
    id: 900001,
    title: "E2E 회차 없는 콘서트",
  },
} as const;

export const E2E_SEED_PERFORMANCES = {
  upcoming: {
    id: 900000,
    concertId: E2E_SEED_CONCERTS.normal.id,
    name: "E2E 정상 콘서트 1회차",
  },
  ended: {
    id: 900001,
    concertId: E2E_SEED_CONCERTS.normal.id,
    name: "E2E 종료 회차",
  },
} as const;

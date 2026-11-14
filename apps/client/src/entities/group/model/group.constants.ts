export const GROUP_QUERY_KEYS = {
  current: (performanceId: number) => ["groups", "current", performanceId] as const,
  detail: (groupId: number) => ["groups", "detail", groupId] as const,
};

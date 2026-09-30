import { apiClient } from "@shared/api";

import type { CreatePerformanceRequest, UpdatePerformanceRequest } from "@entities/performance";

export const createPerformance = async (request: CreatePerformanceRequest) => {
  const { data, error, response } = await apiClient.POST("/api/performances", {
    body: request,
  });

  if (!response.ok || error || !data) {
    throw new Error("공연 회차 등록에 실패했습니다.");
  }
};

export const updatePerformance = async (performanceId: number, request: UpdatePerformanceRequest) => {
  const { data, error, response } = await apiClient.PATCH("/api/performances/{id}", {
    params: { path: { id: performanceId } },
    body: request,
  });

  if (!response.ok || error || !data) {
    throw new Error("공연 회차 수정에 실패했습니다.");
  }
};

export const deletePerformance = async (performanceId: number) => {
  const { error, response } = await apiClient.DELETE("/api/performances/{id}", {
    params: { path: { id: performanceId } },
  });

  if (!response.ok || error) {
    throw new Error("공연 회차 삭제에 실패했습니다.");
  }
};

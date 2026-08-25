import { type Page, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { setApiRole } from "./auth.api";

import { TEST_CSRF_TOKEN } from "../config/api.config";

export const createConcert = async (page: Page, titlePrefix = "E2E 수정 대상") => {
  const concert = {
    title: `${titlePrefix} ${randomUUID()}`,
    genre: "ROCK_METAL" as const,
    placeName: "E2E 기존 공연장",
    posterUrl: null,
    description: "E2E 수정 전 설명",
  };
  const response = await page.request.post("/api/concerts", {
    headers: { "X-XSRF-TOKEN": TEST_CSRF_TOKEN },
    data: concert,
  });

  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(201);
  expect(body).toMatchObject({ success: true, data: concert });

  return body.data as typeof concert & { id: number; createdAt: string };
};

export const deleteConcert = async (page: Page, concertId: number) => {
  await setApiRole(page, "ADMIN");
  const response = await page.request.delete(`/api/concerts/${concertId}`, {
    headers: { "X-XSRF-TOKEN": TEST_CSRF_TOKEN },
  });
  if (response.status() === 404) return;

  const body = await response.text();
  expect(response.ok(), `DELETE /api/concerts/${concertId}: ${response.status()} ${body}`).toBe(true);
};

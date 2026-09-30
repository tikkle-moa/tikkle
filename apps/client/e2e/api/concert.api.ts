import { type Page, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { createApiAuthHeaders } from "./auth.api";
import { getDefaultVenue } from "./venue.api";

export const createConcert = async (page: Page, titlePrefix = "E2E 수정 대상") => {
  const venue = await getDefaultVenue(page);
  const concert = {
    title: `${titlePrefix} ${randomUUID()}`,
    genre: "ROCK_METAL" as const,
    venueId: venue.id,
    posterUrl: null,
    description: "E2E 수정 전 설명",
  };
  const response = await page.request.post("/api/concerts", {
    headers: createApiAuthHeaders("ADMIN"),
    data: concert,
  });

  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(201);
  expect(body).toMatchObject({ success: true, data: { ...concert, venueName: venue.name } });

  return body.data as typeof concert & { id: number; venueName: string; createdAt: string };
};

export const deleteConcert = async (page: Page, concertId: number) => {
  const response = await page.request.delete(`/api/concerts/${concertId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });
  if (response.status() === 404) return;

  const body = await response.text();
  expect(response.ok(), `DELETE /api/concerts/${concertId}: ${response.status()} ${body}`).toBe(true);
};

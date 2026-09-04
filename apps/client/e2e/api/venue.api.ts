import { type Page, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { createApiAuthHeaders } from "./auth.api";

export interface E2EVenue {
  id: number;
  name: string;
}

interface E2EVenueSeat {
  id: number;
  venueId: number;
  sectionName: string;
  seatNumber: number;
  seatLabel: string;
  price: number;
  positionX: number;
  positionY: number;
  createdAt: string;
}

export type E2ECreateVenueSeat = Omit<E2EVenueSeat, "id" | "venueId" | "createdAt">;

interface E2EVenueDetail {
  venue: E2EVenue & {
    address: string;
    description: string | null;
    width: number;
    height: number;
    stagePositionX: number;
    stagePositionY: number;
    stageWidth: number;
    stageHeight: number;
    createdAt: string;
  };
  venueSeats: E2EVenueSeat[];
}

export const getDefaultVenue = async (page: Page): Promise<E2EVenue> => {
  const response = await page.request.get("/api/venues");
  const body = await response.json();

  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body).toMatchObject({ success: true });
  expect(body.data.length).toBeGreaterThan(0);

  return body.data[0];
};

const DEFAULT_VENUE_SEATS: E2ECreateVenueSeat[] = [
  {
    sectionName: "기존구역",
    seatNumber: 1,
    seatLabel: "기존구역 1번",
    price: 50_000,
    positionX: 20,
    positionY: 30,
  },
];

export const createVenue = async (
  page: Page,
  namePrefix = "E2E 수정 대상",
  venueSeats: E2ECreateVenueSeat[] = DEFAULT_VENUE_SEATS,
): Promise<E2EVenueDetail> => {
  const request = {
    venue: {
      name: `${namePrefix} ${randomUUID()}`,
      address: "서울특별시 E2E구 수정로 1",
      description: "E2E 수정 전 설명",
      width: 100,
      height: 100,
      stagePositionX: 50,
      stagePositionY: 5,
      stageWidth: 40,
      stageHeight: 10,
    },
    venueSeats,
  };
  const response = await page.request.post("/api/venues", {
    headers: createApiAuthHeaders("ADMIN"),
    data: request,
  });
  const body = await response.json();

  expect(response.status(), JSON.stringify(body)).toBe(201);
  expect(body).toMatchObject({ success: true, data: request });

  return body.data;
};

export const deleteVenue = async (page: Page, venueId: number) => {
  const response = await page.request.delete(`/api/venues/${venueId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });
  if (response.status() === 404) return;

  const body = await response.text();
  expect(response.ok(), `DELETE /api/venues/${venueId}: ${response.status()} ${body}`).toBe(true);
};

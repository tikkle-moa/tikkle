import { type Page, expect } from "@playwright/test";

export interface E2EVenue {
  id: number;
  name: string;
}

export const getDefaultVenue = async (page: Page): Promise<E2EVenue> => {
  const response = await page.request.get("/api/venues");
  const body = await response.json();

  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body).toMatchObject({ success: true });
  expect(body.data.length).toBeGreaterThan(0);

  return body.data[0];
};

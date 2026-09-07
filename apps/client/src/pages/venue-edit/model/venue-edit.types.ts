import type { VenueDetailResponse } from "@entities/venue";

export type LoadState = { status: "loading" } | { status: "error"; error: string } | { status: "success"; data: VenueDetailResponse };

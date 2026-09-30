import type { ConcertResponse } from "@entities/concert";

export type LoadState = { status: "loading" } | { status: "error"; error: string } | { status: "success"; data: ConcertResponse };

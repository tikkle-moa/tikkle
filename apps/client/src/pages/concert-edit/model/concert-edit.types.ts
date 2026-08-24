import type { CreateConcertRequest } from "@entities/concert";

export type LoadState = { status: "loading" } | { status: "error"; error: string } | { status: "success"; data: CreateConcertRequest };

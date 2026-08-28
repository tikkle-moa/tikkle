import type { CreateConcertRequest } from "@entities/concert";

export type ConcertFormMode = "create" | "edit";

export type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "error"; error: string };

export type ConcertFormErrors = Partial<Record<keyof CreateConcertRequest, string>>;

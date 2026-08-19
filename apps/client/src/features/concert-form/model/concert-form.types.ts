import type { CreateConcertRequest } from "@entities/concert";

export type ConcertFormErrors = Partial<Record<keyof CreateConcertRequest, string>>;

export type ConcertFormMode = "create" | "edit";

import type { CreateConcertRequest } from "@entities/concert";

export type ConcertFormMode = "create" | "edit";

export type ConcertFormErrors = Partial<Record<keyof CreateConcertRequest, string>>;

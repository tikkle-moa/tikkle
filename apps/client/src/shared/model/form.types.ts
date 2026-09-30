export type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "error"; error: string };

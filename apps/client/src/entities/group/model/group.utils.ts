export class GroupApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GroupApiError";
    this.status = status;
  }
}

const getErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("error" in error)) return null;

  const apiError = error.error;
  if (typeof apiError !== "object" || apiError === null || !("message" in apiError)) return null;
  return typeof apiError.message === "string" ? apiError.message : null;
};

export const createGroupRequestError = (error: unknown, status: number, fallback: string) =>
  new GroupApiError(getErrorMessage(error) ?? fallback, status);

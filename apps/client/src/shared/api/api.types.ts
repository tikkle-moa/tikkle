export interface ApiError {
  code: number;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: ApiError;
}

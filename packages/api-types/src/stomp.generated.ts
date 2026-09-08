/**
 * This file was generated from the Springwolf AsyncAPI document.
 * Source: http://localhost:8080/api/springwolf/docs
 * Do not make direct changes to this file.
 */

export interface StompCommandFailure {
  action: string;
  error: StompCommandError;
  requestId: string;
  success: boolean;
}
export interface StompCommandError {
  code: string;
  message: string;
}

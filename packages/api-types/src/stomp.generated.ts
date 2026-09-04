/**

 * This file was generated from asyncapi.yaml.

 * Do not make direct changes to this file.

 */

export interface StompCommandRequest {
  requestId: string;
  action: string;
  data: Record<string, unknown>;
}

export interface StompCommandSuccess {
  requestId: string;
  action: string;
  success: true;
  data: Record<string, unknown>;
}

export interface StompCommandFailure {
  requestId: string;
  action: string;
  success: false;
  error: StompCommandError;
}

export interface StompCommandError {
  code: string;
  message: string;
}

export interface StompEvent {
  eventId: string;
  version: number;
  occurredAt: string;
  type: string;
  data: Record<string, unknown>;
}

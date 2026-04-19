// ABOUTME: Custom error class and error code constants for consistent API error handling.
// ABOUTME: Factory methods produce typed errors; errorHandler middleware consumes them.

import { HTTP_STATUS } from './constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: string = ERROR_CODES.VALIDATION_ERROR) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, code);
  }

  static unauthorized(message: string, code: string = ERROR_CODES.AUTH_INVALID_TOKEN) {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, code);
  }

  static forbidden(message: string, code: string = ERROR_CODES.FORBIDDEN) {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, code);
  }

  static notFound(message: string, code: string = ERROR_CODES.NOT_FOUND) {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, code);
  }

  static conflict(message: string, code: string = ERROR_CODES.CONFLICT) {
    return new AppError(message, HTTP_STATUS.CONFLICT, code);
  }

  static tooManyRequests(message: string, code: string = ERROR_CODES.TOO_MANY_REQUESTS) {
    return new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS, code);
  }

  static badGateway(message: string, code: string = ERROR_CODES.GEOCODE_UPSTREAM_ERROR) {
    return new AppError(message, HTTP_STATUS.BAD_GATEWAY, code);
  }

  static internal(message: string) {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, false);
  }
}

export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_OTP_LOCKED: 'AUTH_OTP_LOCKED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_EMAIL_ALREADY_VERIFIED: 'AUTH_EMAIL_ALREADY_VERIFIED',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',

  // Account
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Profile
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_ALREADY_EXISTS: 'PROFILE_ALREADY_EXISTS',
  PROFILE_UPLOAD_FAILED: 'PROFILE_UPLOAD_FAILED',
  PROFILE_INVALID_FILE: 'PROFILE_INVALID_FILE',

  // Geocode
  GEOCODE_UPSTREAM_ERROR: 'GEOCODE_UPSTREAM_ERROR',

  // Search
  INVALID_SEARCH_FILTERS: 'INVALID_SEARCH_FILTERS',
  SEARCH_FAILED: 'SEARCH_FAILED',

  // Collaboration
  COLLAB_REQUEST_NOT_FOUND: 'COLLAB_REQUEST_NOT_FOUND',
  COLLAB_UNAUTHORIZED: 'COLLAB_UNAUTHORIZED',
  COLLAB_INVALID_ROLE: 'COLLAB_INVALID_ROLE',
  COLLAB_INVALID_STATUS_TRANSITION: 'COLLAB_INVALID_STATUS_TRANSITION',

  // Messaging
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  CONVERSATION_UNAUTHORIZED: 'CONVERSATION_UNAUTHORIZED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

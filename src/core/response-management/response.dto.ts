import { ResponseCode } from './response.enum';
import { HttpStatus } from './http-status.enum';

export interface ApiResponse<T = unknown> {
  statusCode: HttpStatus;
  responseCode: ResponseCode;
  message: string;
  data?: T;
}

export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  statusCode: HttpStatus;
  responseCode: ResponseCode;
  message: string;
  data?: T;
}

export interface ErrorResponse extends ApiResponse {
  statusCode: HttpStatus;
  responseCode: ResponseCode;
  message: string;
  data?: null;
  errors?: unknown[];
}

import { ResponseCode } from './response.enum';
import { HttpStatus } from './http-status.enum';
import { SuccessResponse, ErrorResponse } from './response.dto';

export class ResponseService {
  private static getHttpStatusFromResponseCode(responseCode: ResponseCode): HttpStatus {
    const statusMap: Partial<Record<ResponseCode, HttpStatus>> = {
      [ResponseCode.SUCCESS]: HttpStatus.OK,
      [ResponseCode.CREATED]: HttpStatus.CREATED,
      [ResponseCode.UPDATED]: HttpStatus.OK,
      [ResponseCode.DELETED]: HttpStatus.OK,
      [ResponseCode.RETRIEVED]: HttpStatus.OK,
      [ResponseCode.LOGIN_SUCCESS]: HttpStatus.OK,
      [ResponseCode.LOGOUT_SUCCESS]: HttpStatus.OK,
      [ResponseCode.VALIDATION_SUCCESS]: HttpStatus.OK,
      [ResponseCode.PROCESSING_SUCCESS]: HttpStatus.OK,
      [ResponseCode.VALIDATION_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
      [ResponseCode.AUTHENTICATION_ERROR]: HttpStatus.UNAUTHORIZED,
      [ResponseCode.AUTHORIZATION_ERROR]: HttpStatus.FORBIDDEN,
      [ResponseCode.NOT_FOUND_ERROR]: HttpStatus.NOT_FOUND,
      [ResponseCode.CONFLICT_ERROR]: HttpStatus.CONFLICT,
      [ResponseCode.BAD_REQUEST_ERROR]: HttpStatus.BAD_REQUEST,
      [ResponseCode.INTERNAL_SERVER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
      [ResponseCode.DATABASE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
      [ResponseCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
      [ResponseCode.SESSION_EXPIRED]: HttpStatus.UNAUTHORIZED,
      [ResponseCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
      [ResponseCode.INVALID_TOKEN]: HttpStatus.UNAUTHORIZED,
      [ResponseCode.NO_DATA_FOUND]: HttpStatus.NOT_FOUND,
      [ResponseCode.ALREADY_EXISTS]: HttpStatus.CONFLICT,
      [ResponseCode.RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
    };
    return statusMap[responseCode] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  success<T>(
    responseCode: ResponseCode,
    message?: string,
    data?: T
  ): SuccessResponse<T> {
    const statusCode = ResponseService.getHttpStatusFromResponseCode(responseCode);
    return {
      statusCode,
      responseCode,
      message: message ?? 'Success',
      data,
    };
  }

  error(
    responseCode: ResponseCode,
    message?: string,
    errors?: unknown[]
  ): ErrorResponse {
    const statusCode = ResponseService.getHttpStatusFromResponseCode(responseCode);
    return {
      statusCode,
      responseCode,
      message: message ?? 'Error',
      data: null,
      errors,
    };
  }

  badRequest(message?: string, errors?: unknown[]): ErrorResponse {
    return this.error(ResponseCode.BAD_REQUEST_ERROR, message, errors);
  }

  notFound(message?: string): ErrorResponse {
    return this.error(ResponseCode.NOT_FOUND_ERROR, message);
  }

  unauthorized(message?: string): ErrorResponse {
    return this.error(ResponseCode.AUTHENTICATION_ERROR, message);
  }

  conflict(message?: string): ErrorResponse {
    return this.error(ResponseCode.CONFLICT_ERROR, message);
  }

  rateLimited(message?: string, errors?: unknown[]): ErrorResponse {
    const statusCode = HttpStatus.TOO_MANY_REQUESTS;
    return {
      statusCode,
      responseCode: ResponseCode.RATE_LIMITED,
      message: message ?? 'Too many requests',
      data: null,
      errors,
    };
  }
}

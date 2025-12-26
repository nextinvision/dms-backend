import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ValidationExceptionFilter.name);

    catch(exception: BadRequestException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const exceptionResponse: any = exception.getResponse();

        // Extract validation errors
        const validationErrors =
            typeof exceptionResponse === 'object' && 'message' in exceptionResponse
                ? exceptionResponse.message
                : exceptionResponse;

        const errorResponse = {
            statusCode: 400,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: 'Validation failed',
            errors: Array.isArray(validationErrors) ? validationErrors : [validationErrors],
        };

        this.logger.warn(
            `Validation failed for ${request.method} ${request.url}: ${JSON.stringify(validationErrors)}`,
        );

        response.status(400).json(errorResponse);
    }
}

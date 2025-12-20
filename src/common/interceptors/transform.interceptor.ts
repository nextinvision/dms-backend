import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface Response<T> {
    data: T;
    success: boolean;
    meta: {
        timestamp: string;
        requestId: string;
    };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => ({
                data: data.data || data,
                pagination: data.pagination,
                success: true,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: uuidv4(),
                },
            })),
        );
    }
}

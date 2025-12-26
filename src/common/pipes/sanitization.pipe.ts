import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value === 'string') {
            return this.sanitizeString(value);
        }

        if (typeof value === 'object' && value !== null) {
            return this.sanitizeObject(value);
        }

        return value;
    }

    private sanitizeString(str: string): string {
        // Remove HTML tags and script content
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    private sanitizeObject(obj: any): any {
        const sanitized: any = Array.isArray(obj) ? [] : {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = this.transform(obj[key], {} as ArgumentMetadata);
            }
        }

        return sanitized;
    }
}

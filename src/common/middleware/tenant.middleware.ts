import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
    use(req: any, res: Response, next: NextFunction) {
        const user = req.user; // This will be available if JwtAuthGuard or similar has run

        if (!user) {
            return next();
        }

        // Admin can access all
        if (user.role === 'admin' || user.role === 'central_inventory_manager') {
            req.tenantFilter = {};
            return next();
        }

        // SC users: auto-filter by serviceCenterId
        if (user.serviceCenterId) {
            req.tenantFilter = {
                serviceCenterId: user.serviceCenterId,
            };
        } else if (user.role !== 'admin') {
            // If user has no SC ID and is not admin, they might be restricted to nothing or we handle it based on role
            req.tenantFilter = {
                serviceCenterId: 'none', // Block access if no SC assigned
            };
        }

        next();
    }
}

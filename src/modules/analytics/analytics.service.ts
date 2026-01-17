import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(serviceCenterId?: string) {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;

        const [
            appointmentsToday,
            activeJobCards,
            invoicesToday,
            lowStockCount,
            revenueToday
        ] = await Promise.all([
            this.prisma.appointment.count({
                where: { ...where, appointmentDate: { gte: startOfToday, lte: endOfToday } },
            }),
            this.prisma.jobCard.count({
                where: { ...where, status: { notIn: ['COMPLETED', 'INVOICED'] } },
            }),
            this.prisma.invoice.count({
                where: { ...where, createdAt: { gte: startOfToday, lte: endOfToday } },
            }),
            this.prisma.inventory.count({
                where: { ...where, stockQuantity: { lte: 5 } }, // Simplified low stock for analytics fast count
            }),
            this.prisma.invoice.aggregate({
                where: { ...where, status: 'PAID', createdAt: { gte: startOfToday, lte: endOfToday } },
                _sum: { grandTotal: true },
            }),
        ]);

        return {
            appointmentsToday,
            activeJobCards,
            invoicesToday,
            lowStockCount,
            revenueToday: revenueToday._sum.grandTotal || 0,
        };
    }

    async getRevenueStats(serviceCenterId?: string, months: number = 6) {
        try {
            // Validate and limit months to prevent performance issues
            const validMonths = Math.min(Math.max(1, months || 6), 24); // Between 1 and 24 months
            const stats = [];
            
            for (let i = 0; i < validMonths; i++) {
                const date = subMonths(new Date(), i);
                const start = startOfMonth(date);
                const end = endOfMonth(date);

                const where: any = { 
                    status: 'PAID', 
                    createdAt: { 
                        gte: start, 
                        lte: end 
                    } 
                };
                if (serviceCenterId) {
                    where.serviceCenterId = serviceCenterId;
                }

                try {
                    const revenue = await this.prisma.invoice.aggregate({
                        where,
                        _sum: { grandTotal: true },
                    });

                    stats.push({
                        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
                        revenue: revenue._sum.grandTotal || 0,
                    });
                } catch (error) {
                    console.error(`Error fetching revenue for month ${i}:`, error);
                    // Continue with next month even if one fails
                    stats.push({
                        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
                        revenue: 0,
                    });
                }
            }

            return stats.reverse();
        } catch (error) {
            console.error('Error in getRevenueStats:', error);
            throw error;
        }
    }
}

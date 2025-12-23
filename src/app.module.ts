import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { JobCardsModule } from './modules/job-cards/job-cards.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PartsIssuesModule } from './modules/parts-issues/parts-issues.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ServiceCentersModule } from './modules/service-centers/service-centers.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { TenantIsolationMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CustomersModule,
    VehiclesModule,
    AppointmentsModule,
    JobCardsModule,
    InventoryModule,
    InvoicesModule,
    QuotationsModule,
    PurchaseOrdersModule,
    PartsIssuesModule,
    AnalyticsModule,
    ServiceCentersModule,
    UsersModule,
    AuthModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantIsolationMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

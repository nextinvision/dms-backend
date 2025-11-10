import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServiceCentersModule } from './modules/service-centers/service-centers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ServiceCentersModule,
    DashboardModule,
    ApprovalsModule,
    ComplaintsModule,
    InventoryModule,
    FinanceModule,
    AuditLogsModule,
    SearchModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

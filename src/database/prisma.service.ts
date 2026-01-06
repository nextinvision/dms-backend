import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['error', 'warn'], // Log only errors and warnings to reduce noise
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry(retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.$connect();
        console.log('Successfully connected to the database');
        return;
      } catch (error) {
        console.error(`Failed to connect to database (attempt ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
}


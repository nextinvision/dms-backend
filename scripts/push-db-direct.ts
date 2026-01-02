import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const directUrl = process.env.DATABASE_URL?.replace(':6543/', ':5432/').replace('?pgbouncer=true', '');

if (!directUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

console.log('Using direct URL for push...');

try {
    execSync(`npx prisma db push --accept-data-loss --skip-generate`, {
        env: { ...process.env, DATABASE_URL: directUrl },
        stdio: 'inherit'
    });
    console.log('Push successful');
} catch (error) {
    console.error('Push failed', error);
    process.exit(1);
}

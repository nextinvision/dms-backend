### DMS Backend (Nest.js + Prisma + Supabase)

Backend service for Dealer Management System using Nest.js, Prisma, PostgreSQL (Supabase), Redis, and BullMQ.

## ✅ Super Admin Panel - 100% Complete

All 12 modules from the Super Admin Panel User Flow have been implemented:
- ✅ Authentication & Dashboard
- ✅ Service Center Management
- ✅ User Management
- ✅ Inventory Management
- ✅ Approvals
- ✅ Complaints
- ✅ Financial Management
- ✅ Search & Quick Actions
- ✅ Audit Logs
- ✅ System Configuration
- ✅ Reports Structure

**Total: 54 API Endpoints**

See `API_DOCUMENTATION.md` for complete API reference.

#### Prerequisites
- Node.js 20+
- PNPM or NPM
- Redis (optional, for rate limits/queues)
- Supabase project (Postgres + Storage) or PostgreSQL database

#### Environment (.env)
Copy `.env.example` to `.env` and fill values.

#### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `env.example` to `.env`
   - Update `DATABASE_URL` and `JWT_SECRET`

3. **Setup database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

#### Scripts
- `npm run dev` – start in watch mode
- `npm run build` – build for production
- `npm run start:prod` – start production server
- `npm run prisma:generate` – generate Prisma client
- `npm run prisma:migrate` – run DB migrations
- `npm run prisma:studio` – open Prisma Studio
- `npm run seed` – seed baseline data

#### Default Credentials
After seeding:
- **Email:** `admin@dms.com`
- **Password:** `admin123`
- **Role:** `SUPER_ADMIN`

⚠️ **IMPORTANT:** Change the password immediately after first login!

#### Structure
See `workflow.md` for architecture and module boundaries.

#### Documentation
- `API_DOCUMENTATION.md` - Complete API reference with examples
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Detailed implementation summary
- `IMPLEMENTATION_STATUS.md` - Current implementation status
- `SETUP_INSTRUCTIONS.md` - Detailed setup guide

#### Supabase notes
- Use `DATABASE_URL` from Supabase.
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side Storage access (keep secret!).
- Enable `uuid-ossp` and `pg_trgm` via initial migration.



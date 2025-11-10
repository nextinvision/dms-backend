# DMS Backend Setup Instructions

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (or Supabase)
- Redis (optional, for caching and queues)
- PNPM or NPM

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your values:

```bash
cp env.example .env
```

Edit `.env` and update:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generate a strong secret (min 32 characters)
- Other configuration as needed

### 3. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 4. Run Database Migrations

```bash
pnpm prisma:migrate
```

This will:
- Create the database schema
- Enable required PostgreSQL extensions (uuid-ossp, pg_trgm)

### 5. Seed Initial Data

```bash
pnpm seed
```

This creates:
- Super Admin user (email: `admin@dms.com`, password: `admin123`)
- Sample Service Center
- Sample Parts and Inventory

**⚠️ IMPORTANT: Change the default password after first login!**

### 6. Start Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:4000` (or the port specified in `.env`)

## Testing the API

### 1. Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dms.com","password":"admin123"}'
```

Save the `accessToken` from the response.

### 2. Test Dashboard

```bash
curl -X GET http://localhost:4000/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Service Centers

```bash
# Get all service centers
curl -X GET http://localhost:4000/service-centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create a service center
curl -X POST http://localhost:4000/service-centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service Center",
    "code": "SC003",
    "address": "123 Test St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }'
```

## API Documentation

See `API_DOCUMENTATION.md` for complete API reference with all 54 endpoints.

## Implemented Modules

All 12 Super Admin Panel modules are implemented:

1. ✅ **Authentication & Dashboard** - Login, JWT, KPIs, alerts
2. ✅ **Service Center Management** - Full CRUD with statistics
3. ✅ **User Management** - User CRUD with role and SC assignment
4. ✅ **Inventory Management** - Parts, stock, transfers
5. ✅ **Approvals** - Approval workflow for all request types
6. ✅ **Complaints** - Complaint management and tracking
7. ✅ **Financial Management** - Invoices, payments, credit notes
8. ✅ **Search & Quick Actions** - Global search for customers/vehicles
9. ✅ **Audit Logs** - Complete audit trail with filtering
10. ✅ **System Configuration** - Settings management
11. ✅ **Dashboard** - Real-time metrics and KPIs
12. ✅ **Reports** - Data available via existing endpoints

See `COMPLETE_IMPLEMENTATION_SUMMARY.md` for detailed feature list.

## Project Structure

```
dms-backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seed.ts           # Seed script
├── src/
│   ├── common/           # Shared utilities, guards, decorators
│   ├── config/           # Configuration module
│   ├── database/         # Prisma service
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── users/        # User management
│   │   ├── service-centers/ # Service center management
│   │   ├── dashboard/    # Dashboard & KPIs
│   │   ├── approvals/    # Approval workflows
│   │   ├── complaints/   # Complaint management
│   │   ├── inventory/    # Inventory management
│   │   ├── finance/      # Financial management
│   │   ├── search/       # Global search
│   │   ├── audit-logs/   # Audit logs
│   │   └── settings/     # System configuration
│   └── main.ts           # Application entry point
└── package.json
```

## Common Commands

```bash
# Development
pnpm dev                  # Start in watch mode
pnpm build                # Build for production
pnpm start:prod           # Start production server

# Database
pnpm prisma:generate      # Generate Prisma client
pnpm prisma:migrate       # Run migrations
pnpm prisma:studio        # Open Prisma Studio
pnpm seed                 # Seed database

# Testing
pnpm test                 # Run tests
pnpm test:watch           # Run tests in watch mode
pnpm test:e2e             # Run e2e tests
```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` in `.env` is correct
- Ensure PostgreSQL is running
- Check if database exists

### Migration Issues

- If migrations fail, check PostgreSQL extensions are enabled
- You may need to manually enable extensions:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";
  ```

### Port Already in Use

- Change `PORT` in `.env` to a different port
- Or kill the process using the port

## Next Steps

After successful setup:

1. Test all API endpoints using Postman or cURL
2. Change the default admin password
3. Create additional service centers and users
4. Review and customize configuration as needed

## Support

For issues or questions, refer to:
- `API_DOCUMENTATION.md` - API reference
- `workflow.md` - Architecture and design decisions


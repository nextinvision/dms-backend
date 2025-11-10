### Dealer Management System (DMS) – Backend (Nest.js) Technical Design v1
Scope: Backend-only. Concrete plan to implement every module using Nest.js + Prisma + PostgreSQL. No frontend details. Optimized for step-by-step delivery and production-readiness.

## 1) High-Level Architecture
- **Backend framework**: Nest.js (REST-first; GraphQL optional later)
- **Runtime**: Node 20 LTS
- **ORM**: Prisma (PostgreSQL on Supabase)
- **Cache**: Redis (ioredis) for sessions, rate limits, search cache, queues
- **Queues/Scheduler**: BullMQ + Redis; Nest Schedule for light cron
- **File storage**: Supabase Storage buckets in prod; local `storage/` in dev
- **Mail**: Nodemailer (SMTP)
- **SMS**: Provider abstraction (MSG91/Twilio adapters; stub for dev)
- **PDF**: `pdfmake` or `puppeteer` (server renders invoices/quotations)
- **Telemetry**: Nest logger + Pino transport; request-id per request
- **Observability**: Health checks (`/health`), Prometheus metrics optional
- **Containerization**: Docker (Postgres, Redis, API), docker-compose for local

Directory layout (key):
- `src/app.module.ts` (root)
- `src/common/` (guards, pipes, interceptors, filters, decorators, utils)
- `src/config/` (env validation via `zod`/`joi`)
- `src/database/` (prisma service, migrations, seeds)
- `src/modules/*` (feature modules listed below)
- `src/integrations/*` (smtp, sms, storage, pdf, payment-stub)
- `src/jobs/*` (bullmq processors)
- `storage/` (uploads, generated pdfs in dev)

### 1.1 Project Structure (bottleneck-free)
Use modular, layered design with strict boundaries and independent deployability.

```bash
dms-backend/
  src/
    config/                 # env schema, config service
    database/               # prisma client, migrations, seeds
    common/                 # shared guards/pipes/filters/interceptors/decorators
    core/                   # cross-cutting: rbac, auth-policy, event bus, caching
    integrations/           # adapters: smtp, sms, storage(supabase), pdf, payments
    jobs/                   # bullmq queues and processors
    modules/
      auth/                 # login, tokens, password reset, sessions
      users/
      search/
      dashboard/
      inventory/
      sales/
      workshop/
      home-service/
      requests/
      approvals/
      billing/
      payments/
      reports/
      notifications/
      feedback/
      complaints/
    app.module.ts
  prisma/
    schema.prisma
    migrations/
    seeds/
  test/                     # unit + e2e tests
  storage/                  # local dev only
```

Layering inside each module:
- `domain/` (entities, enums, repository ports, domain services)
- `application/` (use cases, DTOs, validators)
- `infrastructure/` (prisma repositories, http controllers, mappers)
- `presentation/` (controllers if you prefer separation; optional)

Guidelines to avoid bottlenecks:
- Define repository interfaces in `domain` and implement in `infrastructure` (DI via tokens).
- Keep controllers thin; all logic in use cases. DTOs isolated from DB models.
- Emit domain events; background processors decouple heavy work.
- Feature toggles and config-driven thresholds (no hardcoded limits).
- Write-side transactions small; read-side projections (`ServiceHistory`, KPIs) updated async.
- No module may import another module’s `infrastructure` layer; depend on `application`/`domain` only.
- Long-running tasks must go through queues; controllers return 202 with job ids where applicable.

Cross-cutting
- RBAC via custom `RolesGuard` using policy-based checks
- Global validation pipe (class-validator + class-transformer)
- Global exception filter -> consistent Problem+JSON error structure
- Rate limiting on auth, search, public endpoints
- ETag + Cache-Control for read-heavy endpoints, Redis for data caches
- Multi-SC tenancy: service center scoping on entities; Admin bypass

## 2) Environment & Configuration
- `NODE_ENV`, `PORT`
- `DATABASE_URL` (Supabase Postgres connection string)
- `REDIS_URL`
- `JWT_SECRET`, `JWT_EXPIRES_IN=30m`, `JWT_REFRESH_EXPIRES_IN=7d`
- `BCRYPT_SALT_ROUNDS=12`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- SMS: `SMS_PROVIDER`, `MSG91_KEY` or `TWILIO_*`
- STORAGE: `UPLOAD_DRIVER=local|supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
- `INVOICE_PREFIX_DEFAULT="SC-INV-"`
- `CRON_TZ="Asia/Kolkata"`

Config module validates env and injects typed config.

### Supabase usage decisions
- Use Supabase Postgres for primary data store (managed PG, extensions).
- Use Supabase Storage for files (photos, PDFs). Adapter provides signed URLs.
- Keep Nest-managed auth (JWT + RBAC) for fine-grained roles and policies. Optionally verify Supabase Auth JWTs via JWKS later if we expose a customer portal.

## 3) Database Schema (Prisma – Complete)

### 3.1 Enums

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  CALL_CENTER
  SERVICE_ADVISOR
  SC_MANAGER
  SC_STAFF
  SERVICE_ENGINEER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum ServiceCenterStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  APPROVE
  REJECT
  ASSIGN
  TRANSFER
  PAYMENT
  EXPORT
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum ApprovalType {
  SERVICE_REQUEST
  WARRANTY_CLAIM
  STOCK_TRANSFER
  STOCK_ADJUSTMENT
  DISCOUNT_REQUEST
  REFUND_REQUEST
}

enum InvoiceStatus {
  UNPAID
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  ONLINE
  CHEQUE
}

enum ComplaintStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
  ESCALATED
}

enum ComplaintSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### 3.2 Models

#### User & Authentication

**User**
- `id` (String, UUID, Primary Key)
- `email` (String, Unique, Indexed)
- `phone` (String, Optional, Unique)
- `password` (String, Hashed with bcrypt)
- `firstName` (String)
- `lastName` (String, Optional)
- `role` (UserRole Enum)
- `status` (UserStatus Enum, Default: ACTIVE)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `lastLoginAt` (DateTime, Optional)
- `createdBy` (String, Optional, FK to User)
- `updatedBy` (String, Optional, FK to User)
- **Relations**: sessions, auditLogs, serviceCenters (via ServiceCenterAssignment), createdUsers, updatedUsers
- **Indexes**: email, role, status

**Session**
- `id` (String, UUID, Primary Key)
- `userId` (String, FK to User, Indexed)
- `refreshToken` (String, Unique, Indexed)
- `ipAddress` (String, Optional)
- `userAgent` (String, Optional)
- `expiresAt` (DateTime)
- `createdAt` (DateTime)
- **Relations**: user (Cascade Delete)

#### Service Center

**ServiceCenter**
- `id` (String, UUID, Primary Key)
- `name` (String)
- `code` (String, Unique, Indexed)
- `address` (String)
- `city` (String, Indexed)
- `state` (String)
- `pincode` (String)
- `phone` (String, Optional)
- `email` (String, Optional)
- `status` (ServiceCenterStatus Enum, Default: ACTIVE, Indexed)
- `capacity` (Int, Optional) - Max concurrent jobs
- `technicianCount` (Int, Optional)
- `serviceRadius` (Float, Optional) - Service radius in km
- `homeServiceEnabled` (Boolean, Default: false)
- `invoicePrefix` (String, Optional) - e.g., "SC001-INV-"
- `bankName` (String, Optional)
- `bankAccount` (String, Optional)
- `bankIFSC` (String, Optional)
- `gstNumber` (String, Optional)
- `panNumber` (String, Optional)
- `serviceTypes` (String[]) - Array of service types
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `createdBy` (String, Optional)
- `updatedBy` (String, Optional)
- **Relations**: assignments, inventory, jobCards, invoices, stockTransfers, complaints

**ServiceCenterAssignment**
- `id` (String, UUID, Primary Key)
- `userId` (String, FK to User, Indexed)
- `serviceCenterId` (String, FK to ServiceCenter, Indexed)
- `assignedAt` (DateTime, Default: now())
- `assignedBy` (String, Optional)
- **Relations**: user (Cascade Delete), serviceCenter (Cascade Delete)
- **Unique Constraint**: [userId, serviceCenterId]

#### Audit Logs

**AuditLog**
- `id` (String, UUID, Primary Key)
- `userId` (String, Optional, FK to User, Indexed)
- `action` (AuditAction Enum, Indexed)
- `entityType` (String, Optional) - e.g., "User", "ServiceCenter", "Invoice"
- `entityId` (String, Optional)
- `description` (String, Optional)
- `ipAddress` (String, Optional)
- `userAgent` (String, Optional)
- `metadata` (Json, Optional) - Additional data
- `createdAt` (DateTime, Indexed)
- **Relations**: user (SetNull on Delete)
- **Indexes**: userId, action, [entityType, entityId], createdAt

#### Customer & Vehicle

**Customer**
- `id` (String, UUID, Primary Key)
- `firstName` (String)
- `lastName` (String, Optional)
- `phone` (String, Unique, Indexed)
- `email` (String, Optional, Indexed)
- `address` (String, Optional)
- `city` (String, Optional)
- `state` (String, Optional)
- `pincode` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: vehicles, invoices, complaints

**Vehicle**
- `id` (String, UUID, Primary Key)
- `customerId` (String, FK to Customer, Indexed)
- `make` (String)
- `model` (String)
- `year` (Int, Optional)
- `registration` (String, Unique, Indexed)
- `vin` (String, Unique, Indexed)
- `color` (String, Optional)
- `fuelType` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: customer (Cascade Delete), jobCards, serviceHistory

**ServiceHistory**
- `id` (String, UUID, Primary Key)
- `vehicleId` (String, FK to Vehicle, Indexed)
- `serviceCenterId` (String, Optional, Indexed)
- `jobCardId` (String, Optional)
- `serviceDate` (DateTime)
- `serviceType` (String)
- `description` (String, Optional)
- `totalAmount` (Decimal, Default: 0)
- `createdAt` (DateTime)
- **Relations**: vehicle (Cascade Delete)
- **Indexes**: [vehicleId, serviceDate DESC], serviceCenterId

#### Job Cards

**JobCard**
- `id` (String, UUID, Primary Key)
- `jobNumber` (String, Unique)
- `serviceCenterId` (String, FK to ServiceCenter, Indexed)
- `vehicleId` (String, FK to Vehicle)
- `customerId` (String)
- `serviceType` (String)
- `description` (String, Optional)
- `status` (String, Default: "created") - created, approved, assigned, in_progress, parts_pending, completed, qc, invoiced, delivered
- `assignedEngineerId` (String, Optional, Indexed)
- `estimatedCost` (Decimal, Optional)
- `actualCost` (Decimal, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `completedAt` (DateTime, Optional)
- **Relations**: serviceCenter, vehicle
- **Indexes**: serviceCenterId, status, assignedEngineerId

#### Inventory

**Part**
- `id` (String, UUID, Primary Key)
- `sku` (String, Unique, Indexed)
- `name` (String)
- `description` (String, Optional)
- `category` (String, Optional, Indexed)
- `manufacturer` (String, Optional)
- `unitPrice` (Decimal, Default: 0)
- `supplier` (String, Optional)
- `reorderLevel` (Int, Default: 0)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: inventory, transferItems

**Inventory**
- `id` (String, UUID, Primary Key)
- `serviceCenterId` (String, FK to ServiceCenter, Indexed)
- `partId` (String, FK to Part, Indexed)
- `quantity` (Int, Default: 0)
- `minLevel` (Int, Default: 0)
- `maxLevel` (Int, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: serviceCenter (Cascade Delete), part (Cascade Delete)
- **Unique Constraint**: [serviceCenterId, partId]

**StockTransfer**
- `id` (String, UUID, Primary Key)
- `transferNumber` (String, Unique)
- `fromServiceCenterId` (String, Optional)
- `toServiceCenterId` (String, FK to ServiceCenter, Indexed)
- `status` (String, Default: "pending", Indexed) - pending, approved, in_transit, received, rejected
- `requestedBy` (String, Optional)
- `approvedBy` (String, Optional)
- `approvedAt` (DateTime, Optional)
- `receivedAt` (DateTime, Optional)
- `notes` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: serviceCenter, items, approval

**StockTransferItem**
- `id` (String, UUID, Primary Key)
- `transferId` (String, FK to StockTransfer, Indexed)
- `partId` (String, FK to Part)
- `quantity` (Int)
- `receivedQuantity` (Int, Optional, Default: 0)
- **Relations**: transfer (Cascade Delete), part

#### Approvals

**Approval**
- `id` (String, UUID, Primary Key)
- `type` (ApprovalType Enum)
- `status` (ApprovalStatus Enum, Default: PENDING)
- `entityType` (String) - e.g., "ServiceRequest", "StockTransfer"
- `entityId` (String)
- `stockTransferId` (String, Optional, Unique, FK to StockTransfer, Indexed)
- `requestedBy` (String, Optional, Indexed)
- `approvedBy` (String, Optional)
- `approvedAt` (DateTime, Optional)
- `rejectedBy` (String, Optional)
- `rejectedAt` (DateTime, Optional)
- `comments` (String, Optional)
- `rejectionReason` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: stockTransfer (Cascade Delete)
- **Indexes**: [type, status], [entityType, entityId], requestedBy, stockTransferId

#### Invoicing & Payments

**Invoice**
- `id` (String, UUID, Primary Key)
- `invoiceNumber` (String, Unique, Indexed)
- `serviceCenterId` (String, FK to ServiceCenter, Indexed)
- `customerId` (String, FK to Customer)
- `jobCardId` (String, Optional)
- `subtotal` (Decimal, Default: 0)
- `tax` (Decimal, Default: 0)
- `discount` (Decimal, Default: 0)
- `totalAmount` (Decimal, Default: 0)
- `paidAmount` (Decimal, Default: 0)
- `status` (InvoiceStatus Enum, Default: UNPAID, Indexed)
- `dueDate` (DateTime, Optional)
- `paidAt` (DateTime, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: serviceCenter, customer, payments
- **Indexes**: serviceCenterId, status, invoiceNumber

**Payment**
- `id` (String, UUID, Primary Key)
- `invoiceId` (String, FK to Invoice, Indexed)
- `amount` (Decimal)
- `method` (PaymentMethod Enum)
- `reference` (String, Optional)
- `notes` (String, Optional)
- `createdAt` (DateTime)
- **Relations**: invoice (Cascade Delete)

#### Complaints

**Complaint**
- `id` (String, UUID, Primary Key)
- `complaintNumber` (String, Unique)
- `serviceCenterId` (String, Optional, FK to ServiceCenter, Indexed)
- `customerId` (String, FK to Customer)
- `jobCardId` (String, Optional)
- `title` (String)
- `description` (String)
- `severity` (ComplaintSeverity Enum, Default: MEDIUM, Indexed)
- `status` (ComplaintStatus Enum, Default: OPEN, Indexed)
- `assignedTo` (String, Optional, Indexed) - User ID
- `resolvedBy` (String, Optional)
- `resolvedAt` (DateTime, Optional)
- `resolution` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- **Relations**: serviceCenter (SetNull on Delete), customer (Cascade Delete)
- **Indexes**: status, severity, serviceCenterId, assignedTo

#### System Configuration

**SystemConfig**
- `id` (String, UUID, Primary Key)
- `key` (String, Unique, Indexed)
- `value` (String)
- `description` (String, Optional)
- `category` (String, Optional, Indexed) - e.g., "email", "sms", "business_rules", "security"
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `updatedBy` (String, Optional)

### 3.3 Indexes for Performance

**Unique Constraints:**
- `Vehicle.vin` (unique)
- `Vehicle.registration` (unique)
- `Customer.phone` (unique)
- `User.email` (unique)
- `User.phone` (unique)
- `ServiceCenter.code` (unique)
- `Invoice.invoiceNumber` (unique)
- `JobCard.jobNumber` (unique)
- `Part.sku` (unique)
- `StockTransfer.transferNumber` (unique)
- `Complaint.complaintNumber` (unique)
- `SystemConfig.key` (unique)
- `[serviceCenterId, partId]` on Inventory (unique)
- `[userId, serviceCenterId]` on ServiceCenterAssignment (unique)

**Composite Indexes:**
- `ServiceHistory([vehicleId, serviceDate DESC])` - For timeline queries
- `AuditLog([entityType, entityId])` - For entity-specific audit queries
- `Approval([type, status])` - For approval workflow queries
- `Approval([entityType, entityId])` - For entity-specific approvals

**Single Column Indexes:**
- `User.email`, `User.role`, `User.status`
- `Session.userId`, `Session.refreshToken`
- `ServiceCenter.code`, `ServiceCenter.status`, `ServiceCenter.city`
- `AuditLog.userId`, `AuditLog.action`, `AuditLog.createdAt`
- `Customer.phone`, `Customer.email`
- `Vehicle.registration`, `Vehicle.vin`, `Vehicle.customerId`
- `ServiceHistory.serviceCenterId`
- `JobCard.serviceCenterId`, `JobCard.status`, `JobCard.assignedEngineerId`
- `Part.sku`, `Part.category`
- `Inventory.serviceCenterId`, `Inventory.partId`
- `StockTransfer.status`, `StockTransfer.toServiceCenterId`
- `StockTransferItem.transferId`
- `Approval.requestedBy`, `Approval.stockTransferId`
- `Invoice.serviceCenterId`, `Invoice.status`, `Invoice.invoiceNumber`
- `Payment.invoiceId`
- `Complaint.status`, `Complaint.severity`, `Complaint.serviceCenterId`, `Complaint.assignedTo`
- `SystemConfig.key`, `SystemConfig.category`

**Recommended Additional Indexes (via SQL migration):**
- GIN index using `pg_trgm` extension on `Vehicle.registration`, `Vehicle.vin`, `Customer.firstName`, `Customer.phone` for fuzzy search
- Composite index on `Invoice([serviceCenterId, createdAt DESC])` for dashboard queries

### 3.4 Postgres Extensions

Enable the following extensions on Supabase:
- `uuid-ossp` - For UUID generation
- `pg_trgm` - For trigram-based fuzzy text search

Create them via an initial SQL migration:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 3.5 Relationships Summary

- **User** ↔ **ServiceCenter**: Many-to-Many via `ServiceCenterAssignment`
- **User** → **Session**: One-to-Many (Cascade Delete)
- **User** → **AuditLog**: One-to-Many (SetNull on Delete)
- **User** → **User**: Self-referential (createdBy, updatedBy)
- **ServiceCenter** → **Inventory**: One-to-Many (Cascade Delete)
- **ServiceCenter** → **JobCard**: One-to-Many
- **ServiceCenter** → **Invoice**: One-to-Many
- **ServiceCenter** → **StockTransfer**: One-to-Many
- **Customer** → **Vehicle**: One-to-Many (Cascade Delete)
- **Customer** → **Invoice**: One-to-Many
- **Customer** → **Complaint**: One-to-Many (Cascade Delete)
- **Vehicle** → **JobCard**: One-to-Many
- **Vehicle** → **ServiceHistory**: One-to-Many (Cascade Delete)
- **Part** → **Inventory**: One-to-Many (Cascade Delete)
- **Part** → **StockTransferItem**: One-to-Many
- **StockTransfer** → **StockTransferItem**: One-to-Many (Cascade Delete)
- **StockTransfer** → **Approval**: One-to-One (Optional)
- **Invoice** → **Payment**: One-to-Many (Cascade Delete)

## 4) Security & Auth
- Password hashing: bcrypt(12)
- JWT access (30m) + refresh (7d). Remember-me uses httpOnly cookie
- Account lockout: 5 failed attempts -> 15m lock (Redis counters)
- Refresh rotation and blacklist
- Password reset tokens (32 bytes, hashed, 15m TTL)
- RBAC: `@Roles(...)` + policy checks for entity/SC ownership
- Audit logging: every write + login attempts + approvals + inventory moves
- Input validation, output filtering, upload checks
- HTTPS in prod, CORS restricted

## 5) Modules and Responsibilities

### 5.1 Authentication & Role Management (`auth`, `users`)
Endpoints:
- `POST /auth/login`, `/auth/refresh`, `/auth/logout`
- `POST /auth/request-password-reset`, `/auth/reset-password`
- `GET /auth/me`
- Admin: `POST /users`, `PATCH /users/:id`, `GET /users`
Steps:
1) Implement strategies, guards, sessions, lockout.
2) Refresh rotation, audit events, `@CurrentUser()` and SC scoping.

### 5.2 Advanced Vehicle Search (`search`)
Endpoints:
- `GET /search/vehicles` with `phone|registration|vin|q&partial`
- `GET /vehicles/:id/history`
- `POST /vehicles` (create on not-found)
Notes:
- Prioritise exact VIN/Reg/Phone, then partial via `pg_trgm` (limit 10)
- Cache last 10 searches per user; export history to PDF

### 5.3 Dashboard & KPI (`dashboard`)
- `GET /dashboard/:role`, `GET /metrics/realtime` (cached 60s)
- Redis counters maintained by domain events or minute rollups

### 5.4 Inventory (`inventory`, `parts`, `stock-transfer`, `warranty`)
Endpoints:
- Parts CRUD, inventory by SC, adjustments (approval if large)
- `POST /stock-transfers` create/approve/receive
- Issue/return to jobs; reports: levels, valuation, usage
Notes:
- Transactions record double-entry `InventoryTxn`; row locks for safety
- Daily 09:00 low-stock scan -> notifications

### 5.5 Sales & OTC (`sales`, `quotation`, `orders`)
Endpoints:
- Quotation CRUD + send PDF/email; status lifecycle
- OTC Orders with discounts (policy-enforced) and invoice conversion

### 5.6 Workshop (`workshop`, `job-cards`)
Endpoints:
- Create job cards, status transitions (state machine)
- Assign engineer/self-assign; parts request/reserve
- Time logs; attachments; additional-service approval
- Views: kanban/list/calendar via filters

### 5.7 Home Service (`home-service`)
- Requests, feasibility (radius, type, availability)
- Assign engineer/van; status updates; on-site invoicing
- Scheduling: calendars, buffers; offline-safe endpoints

### 5.8 Customer Requests & Approvals (`requests`, `approvals`)
- Create requests, estimates, submit for approval
- Approve/reject per policy; auto-create job card; SLA timers and escalation

### 5.9 Invoicing & Billing (`billing`, `payments`)
- Create invoices from job/order; per-SC numbering with prefix
- Payment record; status updates; reminders schedule (−1d, 0d, +3/+7/+15)
- Credit notes (approval > ₹1000); taxes (CGST/SGST/IGST); PDFs + email

### 5.10 Reports & Analytics (`reports`)
- Prebuilt report JSON + CSV/PDF export
- Custom builder (definitions persisted); scheduled emails via BullMQ
- Role-based access and masking

### 5.11 Notifications (`notifications`)
- Outbox pattern; queues: email, sms, in-app
- Templates with variables; preferences; quiet hours; emergency broadcast
- Cron: service reminders, birthdays, warranty expiry, payment overdue

### 5.12 Feedback & Complaint (`feedback`, `complaints`) – Future/Sep
- Feedback trigger on delivery with 0/2/7 day reminders
- Complaint workflow with SLA and escalation

## 6) Domain Events & CQRS-lite
Emit events: `JobCardAssigned`, `JobCompleted`, `InvoiceCreated`, `PaymentReceived`, `StockLow`, `RequestApproved`, etc.
Subscribers update dashboard counters, service history, notifications, and rollups.

## 7) Background Jobs (BullMQ)
Queues: `email`, `sms`, `pdf`, `reminders`, `inventory`, `reports`
Processors: delivery with retries/backoff; PDF gen; reminders; low-stock 09:00; report schedules.
Admin endpoints expose queue stats (guarded).

## 8) File Handling
- Uploads via `multer`; images/PDF up to 10MB
- Storage driver abstraction (local/Supabase Storage); metadata in DB; signed URLs for downloads

## 9) Representative API Contracts
Auth
- `POST /auth/login` { username, password, rememberMe } -> { accessToken, refreshToken }
- `POST /auth/refresh` { refreshToken } -> { accessToken }

Search
- `GET /search/vehicles?q=&vin=&registration=&phone=&partial=true&limit=10`
- `GET /vehicles/:id/history` -> timeline[]

Job Cards
- `POST /job-cards` { customerId|newCustomer, vehicleId|newVehicle, type, priority, estimate, description }
- `PATCH /job-cards/:id/status` { to }
- `POST /job-cards/:id/parts-request` { items: [{partId, qty}] }

Inventory
- `POST /stock-transfers` { fromScId, toScId, items, reason, urgency }
- `POST /inventory/adjust` { partId, delta, reason }

Billing
- `POST /invoices` { sourceType: 'job'|'order', sourceId }
- `POST /payments` { invoiceId, amount, method, reference }

Notifications
- `POST /notifications/test` { type, channel, templateId, vars }

Reports
- `GET /reports/sales/daily?scId=&date=`
- `POST /reports/schedule` { type, cron, recipients, format }

## 10) Performance Targets & Tactics
- API <500ms median: Redis cache, proper indexes, pagination, projections
- Search <2s worst-case: trigram indexes, limited fields, paginated
- Concurrency (100 users): tuned DB pool, Redis locks for inventory
- Avoid N+1 via Prisma `include/select` strategies

## 11) Testing Strategy
- Unit tests: services, state machines, GST calculators
- Integration: auth, job/inventory/invoice lifecycle (TestContainers)
- E2E smoke on CI: login → search → create job → invoice → payment
- Seed scripts for baseline roles/SCs/parts/templates

## 12) Migration & Seeding
- Prisma migrations versioned
- `prisma/seed.ts`: roles, default admin, demo SCs, parts, templates
 - First migration includes enabling extensions on Supabase:
```sql
-- prisma/migrations/000_init_extensions/migration.sql
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
```

## 13) Deployment
- Docker multi-stage builds; docker-compose for dev
- Health `/health` and readiness; Supabase-managed Postgres backups; storage object versioning via Supabase policies if needed
- Secrets via env; HTTPS termination at proxy

## 14) Step-by-Step Implementation Plan (8 weeks)
Phase 1 (Auth, Search, Dashboard, Inventory)
1) Bootstrap Nest + Prisma + config
2) Users/Auth/JWT/lockout/audit
3) Customer/Vehicle + Search + history export
4) Dashboard KPIs + Redis cache
5) Inventory core + low-stock cron

Phase 2 (Sales, Workshop, Home Service)
6) Job cards workflow + time logs + parts requests
7) Quotation + OTC Orders + PDF/email
8) Home Service requests + feasibility + assignment + statuses

Phase 3 (Billing, Reports, Notifications, Feedback/Complaints)
9) Invoice + taxes + payments + reminders
10) Reports (prebuilt) + CSV/PDF + schedules
11) Notifications engine + templates + preferences
12) Feedback minimal + Complaint workflow (paid scope)

Phase 4 (Hardening)
13) Dashboards polish, performance, audit reports
14) E2E tests, CI, docs, release

## 15) Logging, Auditing, Compliance
- State changes log who/action/entity/from→to/payload-hash/ip/ua/time
- Access logs with requestId; retention policies per module

## 16) Failure & Recovery
- Idempotency keys on payments, inventory io, transfer receipt
- Distributed locks on inventory adjustments
- Queue retries with dead-letter; graceful shutdown drains pools

## 17) Integrations & Extensibility
- External providers behind adapters (payments, GPS, SMS, email)
- Supabase adapters: Storage (server-side service-role key), Postgres via Prisma
- Optional: Supabase Auth JWT verification for customer-facing endpoints via JWKS
- Outbound webhooks (future) signed with HMAC

## 18) Open Items to Confirm
- GST rate tables and HSN/SAC list
- SMS provider choice and sender IDs
- Branding assets per SC for PDFs
- Serviceable radius rules per SC
- Legacy data migration (if any)
- SLA timings confirmations for approvals/complaints



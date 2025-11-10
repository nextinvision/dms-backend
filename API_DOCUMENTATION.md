# DMS Backend API Documentation - Super Admin Panel

## Base URL
```
http://localhost:4000
```

## Authentication

All endpoints (except login and refresh) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### 1. Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "admin@dms.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@dms.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN",
    "serviceCenters": []
  }
}
```

### 2. Get Current User
**GET** `/auth/me`

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@dms.com",
  "firstName": "Super",
  "lastName": "Admin",
  "role": "SUPER_ADMIN",
  "status": "ACTIVE",
  "serviceCenters": []
}
```

### 3. Refresh Token
**POST** `/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** This endpoint requires authentication. You must include the `accessToken` in the Authorization header.

---

## Dashboard Endpoints

**Note:** All dashboard endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Get Dashboard Data
**GET** `/dashboard`

**Response:**
```json
{
  "kpis": {
    "serviceCenters": {
      "total": 10,
      "active": 8
    },
    "users": {
      "total": 50,
      "active": 45
    },
    "customers": {
      "total": 1000
    },
    "vehicles": {
      "total": 1200
    },
    "operations": {
      "pendingApprovals": 5,
      "lowStockAlerts": 3,
      "pendingComplaints": 2,
      "todayJobs": 15,
      "completedJobsToday": 10
    },
    "revenue": {
      "today": 50000
    }
  },
  "alerts": {
    "lowStock": [...],
    "pendingApprovals": [...],
    "escalatedComplaints": [...],
    "overdueInvoices": [...]
  }
}
```

### 2. Get Realtime Metrics
**GET** `/dashboard/realtime`

**Response:**
```json
{
  "activeJobs": 12,
  "completedJobsToday": 5,
  "revenueToday": 45000,
  "pendingApprovals": 3,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Get Alerts
**GET** `/dashboard/alerts`

---

## Service Centers Endpoints

**Note:** All service center endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Create Service Center
**POST** `/service-centers`

**Request Body:**
```json
{
  "name": "Downtown Service Center",
  "code": "SC002",
  "address": "456 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "phone": "+91-9876543210",
  "email": "sc002@dms.com",
  "capacity": 30,
  "technicianCount": 8,
  "serviceRadius": 20.0,
  "homeServiceEnabled": true,
  "invoicePrefix": "SC002-INV-",
  "gstNumber": "27AAAAA0000A1Z6",
  "serviceTypes": ["Routine Maintenance", "Repair"]
}
```

### 2. Get All Service Centers
**GET** `/service-centers?status=ACTIVE&city=Mumbai&search=Downtown&page=1&limit=10`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (ACTIVE, INACTIVE, MAINTENANCE)
- `city` (optional): Filter by city
- `search` (optional): Search by name, code, or city
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Downtown Service Center",
      "code": "SC002",
      "status": "ACTIVE",
      "_count": {
        "assignments": 5,
        "jobCards": 20
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 3. Get Service Center by ID
**GET** `/service-centers/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

### 4. Get Service Center Stats
**GET** `/service-centers/:id/stats`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "staffCount": 5,
  "activeJobs": 3,
  "totalInvoices": 100,
  "totalRevenue": 500000
}
```

### 5. Update Service Center
**PATCH** `/service-centers/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** (Same as create, all fields optional)

### 6. Delete Service Center
**DELETE** `/service-centers/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

---

## Users Endpoints

### 1. Create User
**POST** `/users`

**Request Body:**
```json
{
  "email": "manager@dms.com",
  "phone": "+91-9876543210",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SC_MANAGER",
  "status": "ACTIVE",
  "serviceCenterIds": ["actual-service-center-id-from-database"]
}
```

**Note:** 
- `serviceCenterIds` is optional. If provided, all IDs must exist in the database.
- To get valid service center IDs, first call `GET /service-centers` to see available service centers.
- For roles like `SUPER_ADMIN` or `ADMIN`, you can omit `serviceCenterIds` or provide multiple/all service centers.
- For roles like `SC_MANAGER`, `SC_STAFF`, or `SERVICE_ENGINEER`, you typically assign one service center.
- For roles like `CALL_CENTER` or `SERVICE_ADVISOR`, you can assign multiple service centers.

**Available Roles:**
- `SUPER_ADMIN`
- `ADMIN`
- `CALL_CENTER`
- `SERVICE_ADVISOR`
- `SC_MANAGER`
- `SC_STAFF`
- `SERVICE_ENGINEER`

### 2. Get All Users
**GET** `/users?role=SC_MANAGER&status=ACTIVE&serviceCenterId=<service-center-id>&search=john&page=1&limit=10`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): Filter by status (ACTIVE, INACTIVE, SUSPENDED)
- `serviceCenterId` (optional): Filter by service center
- `search` (optional): Search by email, name, or phone
- `page` (optional): Page number
- `limit` (optional): Items per page

### 3. Get User by ID
**GET** `/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

### 4. Get User Activity Log
**GET** `/users/:id/activity?limit=50`

**Headers:**
```
Authorization: Bearer <access_token>
```

### 5. Update User
**PATCH** `/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** (Same as create, all fields optional, password optional)

**Note:** When updating `serviceCenterIds`, provide the complete list of service centers you want to assign. This will replace all existing assignments.

### 6. Delete User
**DELETE** `/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

---

## Approvals Endpoints

### 1. Get All Approvals
**GET** `/approvals?type=STOCK_TRANSFER&status=PENDING&page=1&limit=10`

**Query Parameters:**
- `type` (optional): Filter by type (SERVICE_REQUEST, WARRANTY_CLAIM, STOCK_TRANSFER, STOCK_ADJUSTMENT, DISCOUNT_REQUEST, REFUND_REQUEST)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (when approvals exist):**
```json
{
  "data": [
    {
      "id": "approval-uuid",
      "type": "STOCK_TRANSFER",
      "status": "PENDING",
      "entityType": "StockTransfer",
      "entityId": "transfer-uuid",
      "requestedBy": "user-uuid",
      "createdAt": "2024-01-15T10:30:00Z",
      "stockTransfer": {
        "id": "transfer-uuid",
        "transferNumber": "TRF-001",
        "status": "pending",
        "serviceCenter": {
          "id": "sc-uuid",
          "name": "Main Service Center",
          "code": "SC001"
        },
        "items": [
          {
            "id": "item-uuid",
            "quantity": 10,
            "part": {
              "id": "part-uuid",
              "name": "Engine Oil Filter",
              "sku": "PART001"
            }
          }
        ]
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Note:** 
- If you see an empty array, it means there are no approvals in the database yet.
- Approvals are typically created automatically when:
  - A stock transfer is requested from a service center
  - A high-value service request (>₹5,000) is created
  - A warranty claim is submitted
  - A large stock adjustment (>5 units) is made
  - A discount request above the allowed limit is made
- To test approvals, you would need to create these operations first (stock transfers, service requests, etc.)

### 2. Get Approval by ID
**GET** `/approvals/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

### 3. Approve
**POST** `/approvals/:id/approve`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "comments": "Approved as requested"
}
```

### 4. Reject
**POST** `/approvals/:id/reject`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "rejectionReason": "Insufficient stock available"
}
```

---

## Complaints Endpoints

### 1. Get All Complaints
**GET** `/complaints?status=OPEN&severity=HIGH&serviceCenterId=uuid&page=1&limit=10`

**Query Parameters:**
- `status` (optional): Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, ESCALATED)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `serviceCenterId` (optional): Filter by service center
- `page` (optional): Page number
- `limit` (optional): Items per page

### 2. Get Complaint by ID
**GET** `/complaints/:id`

### 3. Update Complaint Status
**PATCH** `/complaints/:id/status`

**Request Body:**
```json
{
  "status": "RESOLVED",
  "resolution": "Issue resolved by providing replacement"
}
```

### 4. Reassign Complaint
**POST** `/complaints/:id/reassign`

**Request Body:**
```json
{
  "assignedTo": "user-uuid"
}
```

---

## Inventory Management Endpoints

**Note:** All inventory endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### Parts Management

#### 1. Create Part
**POST** `/inventory/parts`

**Request Body:**
```json
{
  "sku": "PART004",
  "name": "Spark Plug",
  "description": "Iridium spark plug",
  "category": "Engine",
  "manufacturer": "NGK",
  "unitPrice": 800.0,
  "supplier": "ABC Suppliers",
  "reorderLevel": 20
}
```

#### 2. Get All Parts
**GET** `/inventory/parts?category=Engine&search=spark&page=1&limit=10`

**Query Parameters:**
- `category` (optional): Filter by category
- `search` (optional): Search by name, SKU, or description
- `page` (optional): Page number
- `limit` (optional): Items per page

#### 3. Get Part by ID
**GET** `/inventory/parts/:id`

#### 4. Update Part
**PATCH** `/inventory/parts/:id`

**Request Body:** (Same as create, all fields optional)

#### 5. Delete Part
**DELETE** `/inventory/parts/:id`

### Stock Management

#### 6. Get Central Stock
**GET** `/inventory/stock?partId=uuid&partName=filter&serviceCenterId=uuid&lowStock=true&page=1&limit=50`

**Query Parameters:**
- `partId` (optional): Filter by part ID
- `partName` (optional): Search by part name or SKU
- `serviceCenterId` (optional): Filter by service center
- `lowStock` (optional): Show only low stock items (true/false)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example:**
```bash
# Search inventory by part name
GET /inventory/stock?partName=engine&page=1&limit=20

# Search inventory in specific service center
GET /inventory/stock?partName=brake&serviceCenterId=sc-uuid
```

#### 7. Create Inventory Item
**POST** `/inventory/stock`

**Request Body:**
```json
{
  "serviceCenterId": "service-center-uuid",
  "partId": "part-uuid",
  "quantity": 50,
  "minLevel": 10,
  "maxLevel": 100
}
```

**Note:**
- `minLevel` is optional. If not provided, it will use the part's `reorderLevel` as default.
- `maxLevel` is optional.
- Creates inventory for a specific part at a specific service center.

#### 8. Update Inventory Item
**PATCH** `/inventory/stock/:id`

**Request Body:**
```json
{
  "quantity": 45,
  "minLevel": 15,
  "maxLevel": 150
}
```

**Note:** All fields are optional. Only provide the fields you want to update.

#### 9. Update Inventory by Service Center and Part
**PATCH** `/inventory/stock/service-center/:serviceCenterId/part/:partId`

**Request Body:** (Same as update inventory item)

**Note:** This is an alternative way to update inventory when you know the service center and part IDs but not the inventory ID.

#### 10. Get Low Stock Alerts
**GET** `/inventory/stock/low-stock-alerts`

**Response (when low stock items exist):**
```json
[
  {
    "id": "inventory-uuid",
    "quantity": 5,
    "minLevel": 10,
    "part": {
      "id": "part-uuid",
      "name": "Engine Oil Filter",
      "sku": "PART001"
    },
    "serviceCenter": {
      "id": "sc-uuid",
      "name": "Main Service Center",
      "code": "SC001"
    }
  }
]
```

**Response (when no low stock items):**
```json
[]
```

**Note:**
- If you see an empty array `[]`, it means there are no inventory items with quantity at or below their minimum reorder level.
- Low stock is determined by comparing `quantity <= minLevel` for each inventory item.
- This endpoint returns all inventory items across all service centers that are below their reorder level.
- Items are sorted by quantity (lowest first) to prioritize the most critical stock shortages.

### Stock Transfers

#### 11. Create Stock Transfer
**POST** `/inventory/transfers`

**Request Body:**
```json
{
  "toServiceCenterId": "service-center-uuid",
  "fromServiceCenterId": "optional-central-warehouse-id",
  "items": [
    {
      "partId": "part-uuid",
      "quantity": 50
    }
  ],
  "notes": "Urgent stock requirement"
}
```

**Note:** This creates a transfer request that requires approval via `/approvals` endpoint.

#### 12. Get All Stock Transfers
**GET** `/inventory/transfers?status=pending&toServiceCenterId=uuid&page=1&limit=10`

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, in_transit, received, rejected)
- `toServiceCenterId` (optional): Filter by destination service center
- `page` (optional): Page number
- `limit` (optional): Items per page

#### 13. Get Stock Transfer by ID
**GET** `/inventory/transfers/:id`

---

## Finance Endpoints

**Note:** All finance endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Get All Invoices
**GET** `/finance/invoices?serviceCenterId=uuid&customerId=uuid&status=PAID&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=10`

**Query Parameters:**
- `serviceCenterId` (optional): Filter by service center
- `customerId` (optional): Filter by customer
- `status` (optional): Filter by status (UNPAID, PARTIAL, PAID, OVERDUE, CANCELLED)
- `dateFrom` (optional): Start date (ISO format)
- `dateTo` (optional): End date (ISO format)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": "invoice-uuid",
      "invoiceNumber": "SC001-INV-0001",
      "totalAmount": 5000.00,
      "paidAmount": 5000.00,
      "status": "PAID",
      "serviceCenter": {
        "id": "sc-uuid",
        "name": "Main Service Center"
      },
      "customer": {
        "id": "customer-uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "payments": [...]
    }
  ],
  "meta": {...}
}
```

### 2. Get Invoice by ID
**GET** `/finance/invoices/:id`

### 3. Get Payment Overview
**GET** `/finance/payment-overview?serviceCenterId=uuid&dateFrom=2024-01-01&dateTo=2024-01-31`

**Response:**
```json
{
  "totalInvoices": 100,
  "totalAmount": 500000.00,
  "paidAmount": 450000.00,
  "outstandingAmount": 50000.00,
  "byStatus": {
    "UNPAID": 10,
    "PARTIAL": 5,
    "PAID": 80,
    "OVERDUE": 5
  }
}
```

### 4. Get Outstanding Analysis
**GET** `/finance/outstanding?serviceCenterId=uuid&overdueOnly=true`

**Response:**
```json
{
  "totalOutstanding": 50000.00,
  "count": 15,
  "invoices": [...]
}
```

### 5. Get Today's Revenue
**GET** `/finance/revenue/today?serviceCenterId=uuid`

**Response:**
```json
{
  "date": "2024-01-15T00:00:00Z",
  "totalRevenue": 45000.00,
  "transactionCount": 12,
  "payments": [...]
}
```

### 6. Create Credit Note
**POST** `/finance/credit-notes`

**Request Body:**
```json
{
  "invoiceId": "invoice-uuid",
  "amount": 1000.00,
  "reason": "Defective part replacement",
  "notes": "Customer returned defective part"
}
```

---

## Search Endpoints

**Note:** Search endpoints are accessible to SUPER_ADMIN, ADMIN, SC_MANAGER, SC_STAFF, SERVICE_ADVISOR, and CALL_CENTER roles.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Global Search
**GET** `/search/vehicles?q=<query>&limit=10`

**Query Parameters:**
- `q` (required): Search query (phone number, registration, VIN, or customer name)
- `limit` (optional): Maximum results (default: 10)

**Response:**
```json
{
  "vehicles": [
    {
      "id": "vehicle-uuid",
      "registration": "MH01AB1234",
      "vin": "VIN123456789",
      "make": "Honda",
      "model": "City",
      "customer": {
        "id": "customer-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+91-9876543210"
      },
      "serviceHistory": [...]
    }
  ],
  "customers": [...]
}
```

### 2. Get Vehicle Details
**GET** `/search/vehicles/:id`

**Response:**
```json
{
  "id": "vehicle-uuid",
  "registration": "MH01AB1234",
  "vin": "VIN123456789",
  "make": "Honda",
  "model": "City",
  "customer": {...},
  "serviceHistory": [...],
  "jobCards": [...]
}
```

### 3. Get Customer Details
**GET** `/search/customers/:id`

**Response:**
```json
{
  "id": "customer-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+91-9876543210",
  "vehicles": [...],
  "invoices": [...]
}
```

---

## Audit Logs Endpoints

**Note:** All audit log endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Get All Audit Logs
**GET** `/audit-logs?userId=uuid&action=CREATE&entityType=User&entityId=uuid&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=50`

**Query Parameters:**
- `userId` (optional): Filter by user
- `action` (optional): Filter by action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, etc.)
- `entityType` (optional): Filter by entity type (User, ServiceCenter, Invoice, etc.)
- `entityId` (optional): Filter by specific entity ID
- `dateFrom` (optional): Start date (ISO format)
- `dateTo` (optional): End date (ISO format)
- `page` (optional): Page number
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid",
      "action": "CREATE",
      "entityType": "User",
      "entityId": "user-uuid",
      "description": "Created user: manager@dms.com",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": "user-uuid",
        "email": "admin@dms.com",
        "firstName": "Super",
        "lastName": "Admin"
      }
    }
  ],
  "meta": {...}
}
```

### 2. Get Activity Summary
**GET** `/audit-logs/summary?dateFrom=2024-01-01&dateTo=2024-01-31`

**Response:**
```json
{
  "totalLogs": 1500,
  "uniqueUsers": 25,
  "byAction": {
    "CREATE": 500,
    "UPDATE": 600,
    "DELETE": 50,
    "LOGIN": 350
  },
  "byEntityType": {
    "User": 200,
    "ServiceCenter": 150,
    "Invoice": 300
  }
}
```

### 3. Get Audit Log by ID
**GET** `/audit-logs/:id`

---

## Settings Endpoints

**Note:** All settings endpoints require authentication and SUPER_ADMIN or ADMIN role.

**Headers:**
```
Authorization: Bearer <access_token>
```

### 1. Get All Settings
**GET** `/settings?category=email`

**Query Parameters:**
- `category` (optional): Filter by category (email, sms, business_rules, security, etc.)

**Response:**
```json
{
  "settings": [
    {
      "id": "setting-uuid",
      "key": "SMTP_HOST",
      "value": "smtp.gmail.com",
      "category": "email",
      "description": "SMTP server hostname"
    }
  ],
  "grouped": {
    "email": [...],
    "sms": [...],
    "business_rules": [...]
  }
}
```

### 2. Get Setting by Key
**GET** `/settings/:key`

### 3. Create Setting
**POST** `/settings`

**Request Body:**
```json
{
  "key": "MAX_DISCOUNT_PERCENTAGE",
  "value": "15",
  "category": "business_rules",
  "description": "Maximum discount percentage allowed"
}
```

### 4. Update Setting
**PATCH** `/settings/:key`

**Request Body:**
```json
{
  "value": "20"
}
```

### 5. Delete Setting
**DELETE** `/settings/:key`

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Testing the API

### Step-by-Step Guide

#### Step 1: Login and Get Access Token
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dms.com","password":"admin123"}'
```

**Response:** Copy the `accessToken` from the response.

#### Step 2: Get Service Centers (to get valid IDs)
```bash
curl -X GET http://localhost:4000/service-centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:** You'll see a list of service centers with their `id` fields. Copy the `id` of the service center you want to use.

#### Step 3: Create User with Valid Service Center ID
```bash
curl -X POST http://localhost:4000/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@dms.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SC_MANAGER",
    "serviceCenterIds": ["paste-the-actual-service-center-id-here"]
  }'
```

**Important:** Replace `"paste-the-actual-service-center-id-here"` with the actual `id` from Step 2.

#### Step 4: Get Dashboard
```bash
curl -X GET http://localhost:4000/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import the collection (if available)
2. Set the base URL to `http://localhost:4000`
3. Login first to get the access token
4. Set the token in the Authorization header for subsequent requests

---

## Notes

- All timestamps are in ISO 8601 format
- All monetary values are in decimal format (e.g., 50000.00 for ₹50,000)
- Pagination is 1-indexed
- Default page size is 10 items (50 for audit logs)
- All endpoints require SUPER_ADMIN or ADMIN role unless specified otherwise
- Search endpoints are accessible to more roles (SC_MANAGER, SC_STAFF, SERVICE_ADVISOR, CALL_CENTER)

## Complete Endpoint Summary

### Authentication (4 endpoints)
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

### Dashboard (3 endpoints)
- GET /dashboard
- GET /dashboard/realtime
- GET /dashboard/alerts

### Service Centers (6 endpoints)
- POST /service-centers
- GET /service-centers
- GET /service-centers/:id
- GET /service-centers/:id/stats
- PATCH /service-centers/:id
- DELETE /service-centers/:id

### Users (6 endpoints)
- POST /users
- GET /users
- GET /users/:id
- GET /users/:id/activity
- PATCH /users/:id
- DELETE /users/:id

### Inventory (13 endpoints)
- POST /inventory/parts
- GET /inventory/parts
- GET /inventory/parts/:id
- PATCH /inventory/parts/:id
- DELETE /inventory/parts/:id
- GET /inventory/stock
- POST /inventory/stock
- PATCH /inventory/stock/:id
- PATCH /inventory/stock/service-center/:serviceCenterId/part/:partId
- GET /inventory/stock/low-stock-alerts
- POST /inventory/transfers
- GET /inventory/transfers
- GET /inventory/transfers/:id

### Approvals (4 endpoints)
- GET /approvals
- GET /approvals/:id
- POST /approvals/:id/approve
- POST /approvals/:id/reject

### Finance (6 endpoints)
- GET /finance/invoices
- GET /finance/invoices/:id
- GET /finance/payment-overview
- GET /finance/outstanding
- GET /finance/revenue/today
- POST /finance/credit-notes

### Complaints (4 endpoints)
- GET /complaints
- GET /complaints/:id
- PATCH /complaints/:id/status
- POST /complaints/:id/reassign

### Search (3 endpoints)
- GET /search/vehicles?q=<query>
- GET /search/vehicles/:id
- GET /search/customers/:id

### Audit Logs (3 endpoints)
- GET /audit-logs
- GET /audit-logs/summary
- GET /audit-logs/:id

### Settings (5 endpoints)
- GET /settings
- GET /settings/:key
- POST /settings
- PATCH /settings/:key
- DELETE /settings/:key

**Total: 57 API Endpoints**


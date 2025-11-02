# Dealer Management System (DMS) - Implementation Requirements Document

**Prepared for:** Dealer Management System  
**Prepared by:** Nextin Vision  
**Date:** October 2025  
**Backend Stack:** Node.js + Express.js  
**Frontend Stack:** Next.js (Already Exists)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Schema Design](#3-database-schema-design)
4. [Module-wise Implementation Requirements](#4-module-wise-implementation-requirements)
5. [API Endpoint Specifications](#5-api-endpoint-specifications)
6. [Process Flows & Workflows](#6-process-flows--workflows)
7. [Integration Points](#7-integration-points)
8. [Phase-wise Development Plan](#8-phase-wise-development-plan)
9. [Technical Stack & Dependencies](#9-technical-stack--dependencies)

---

## 1. Executive Summary

### 1.1 Project Overview
The Dealer Management System (DMS) is a comprehensive solution to streamline dealership operations across multiple Service Centers (SCs), managing sales, inventory, workshop, invoicing, and customer support.

### 1.2 Core Objectives
- Centralized management for multiple Service Centers
- Role-based access control (Admin, Technician, Service Center)
- End-to-end workflow from customer inquiry to service completion
- Real-time inventory tracking and management
- Automated invoicing and billing
- Comprehensive reporting and analytics

### 1.3 Technical Approach
- **Backend:** Node.js with Express.js RESTful API
- **Frontend:** Next.js (Existing)
- **Database:** MongoDB/PostgreSQL (To be finalized)
- **Authentication:** JWT-based authentication
- **Real-time:** WebSocket for notifications
- **File Storage:** Cloud storage for documents/images

---

## 2. System Architecture

### 2.1 Architecture Pattern
```
┌─────────────────┐
│   Next.js App   │  (Frontend)
└────────┬────────┘
         │ HTTP/HTTPS (REST API)
         │ WebSocket (Notifications)
┌────────▼────────┐
│  Express.js API │  (Backend)
│   - Routes      │
│   - Controllers │
│   - Services    │
│   - Middleware  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬────────────┐
    │         │          │            │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐  ┌────▼────┐
│  DB   │ │ Cache│  │ File  │  │ External│
│       │ │ Redis│  │ Storage│  │ APIs    │
└───────┘ └──────┘  └───────┘  └─────────┘
```

### 2.2 Backend Folder Structure
```
dms-backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── environment.js
│   ├── models/           # Database models
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Inventory.js
│   │   ├── JobCard.js
│   │   ├── Invoice.js
│   │   └── ...
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.js
│   │   ├── inventory.controller.js
│   │   ├── workshop.controller.js
│   │   └── ...
│   ├── services/         # Business logic
│   │   ├── auth.service.js
│   │   ├── inventory.service.js
│   │   ├── notification.service.js
│   │   └── ...
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── inventory.routes.js
│   │   ├── workshop.routes.js
│   │   └── index.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── error.middleware.js
│   │   └── role.middleware.js
│   ├── utils/            # Helper functions
│   │   ├── logger.js
│   │   ├── email.js
│   │   ├── sms.js
│   │   └── pdfGenerator.js
│   ├── validators/       # Input validation schemas
│   │   └── *.validator.js
│   └── app.js            # Express app setup
├── tests/                # Test files
├── .env                  # Environment variables
├── .gitignore
├── package.json
└── server.js             # Entry point
```

---

## 3. Database Schema Design

### 3.1 Core Entities

#### 3.1.1 Users & Authentication
```javascript
User {
  _id: ObjectId
  email: String (unique, required)
  password: String (hashed, required)
  role: Enum ['admin', 'technician', 'service_center', 'advisor', 'engineer']
  serviceCenterId: ObjectId (ref: ServiceCenter) // null for admin
  firstName: String (required)
  lastName: String (required)
  phone: String (required)
  isActive: Boolean (default: true)
  lastLogin: Date
  resetPasswordToken: String
  resetPasswordExpires: Date
  createdAt: Date
  updatedAt: Date
}

ServiceCenter {
  _id: ObjectId
  name: String (required)
  code: String (unique, required)
  address: Object {
    street: String
    city: String
    state: String
    zipCode: String
    country: String
  }
  phone: String
  email: String
  managerId: ObjectId (ref: User)
  isActive: Boolean (default: true)
  createdAt: Date
  updatedAt: Date
}

Role {
  _id: ObjectId
  name: String (unique, required)
  permissions: [String] // ['read:inventory', 'write:inventory', ...]
  description: String
}
```

#### 3.1.2 Vehicle & Inventory
```javascript
Vehicle {
  _id: ObjectId
  vehicleNumber: String (unique, required)
  make: String (required)
  model: String (required)
  year: Number
  vin: String (unique)
  color: String
  engineNumber: String
  chassisNumber: String
  registrationDate: Date
  ownerName: String (required)
  ownerPhone: String (required)
  ownerEmail: String
  ownerAddress: Object
  serviceCenterId: ObjectId (ref: ServiceCenter)
  status: Enum ['active', 'in_service', 'completed', 'archived']
  graphicalData: Object { // For graphical representation
    components: [{
      name: String
      status: String
      lastServiceDate: Date
      nextServiceDate: Date
      issues: [String]
    }]
  }
  createdAt: Date
  updatedAt: Date
}

InventoryItem {
  _id: ObjectId
  itemCode: String (unique, required)
  name: String (required)
  category: Enum ['spare_part', 'consumable', 'tool', 'other']
  description: String
  unit: String (default: 'piece')
  currentStock: Number (default: 0)
  minStockLevel: Number (default: 0)
  maxStockLevel: Number
  unitPrice: Number
  location: Enum ['central_warehouse', 'service_center']
  serviceCenterId: ObjectId (ref: ServiceCenter) // null for central
  supplierId: ObjectId (ref: Supplier)
  reorderPoint: Number
  status: Enum ['available', 'low_stock', 'out_of_stock', 'discontinued']
  createdAt: Date
  updatedAt: Date
}

StockMovement {
  _id: ObjectId
  itemId: ObjectId (ref: InventoryItem)
  movementType: Enum ['in', 'out', 'transfer', 'adjustment']
  quantity: Number (required)
  fromLocation: ObjectId (ref: ServiceCenter) // null for central
  toLocation: ObjectId (ref: ServiceCenter) // null for central
  referenceType: Enum ['purchase', 'sale', 'job_card', 'transfer', 'adjustment']
  referenceId: ObjectId
  reason: String
  performedBy: ObjectId (ref: User)
  createdAt: Date
}

PurchaseOrder {
  _id: ObjectId
  poNumber: String (unique, required)
  supplierId: ObjectId (ref: Supplier)
  items: [{
    itemId: ObjectId (ref: InventoryItem)
    quantity: Number
    unitPrice: Number
    total: Number
  }]
  totalAmount: Number
  status: Enum ['draft', 'pending', 'approved', 'ordered', 'received', 'cancelled']
  requestedBy: ObjectId (ref: User)
  approvedBy: ObjectId (ref: User)
  orderedDate: Date
  expectedDeliveryDate: Date
  receivedDate: Date
  createdAt: Date
  updatedAt: Date
}

Supplier {
  _id: ObjectId
  name: String (required)
  contactPerson: String
  phone: String
  email: String
  address: Object
  isActive: Boolean (default: true)
  createdAt: Date
  updatedAt: Date
}
```

#### 3.1.3 Sales & Orders
```javascript
Lead {
  _id: ObjectId
  leadNumber: String (unique, required)
  customerName: String (required)
  customerPhone: String (required)
  customerEmail: String
  source: Enum ['call_center', 'walk_in', 'online', 'referral']
  type: Enum ['service', 'spare_part', 'new_vehicle']
  description: String
  assignedTo: ObjectId (ref: User) // Advisor
  serviceCenterId: ObjectId (ref: ServiceCenter)
  status: Enum ['new', 'contacted', 'qualified', 'converted', 'lost']
  followUpDate: Date
  createdAt: Date
  updatedAt: Date
}

Quotation {
  _id: ObjectId
  quotationNumber: String (unique, required)
  leadId: ObjectId (ref: Lead)
  customerId: ObjectId (ref: Customer)
  items: [{
    type: Enum ['service', 'spare_part', 'vehicle']
    itemId: ObjectId
    description: String
    quantity: Number
    unitPrice: Number
    total: Number
  }]
  subtotal: Number
  tax: Number
  discount: Number
  totalAmount: Number
  validUntil: Date
  status: Enum ['draft', 'sent', 'accepted', 'rejected', 'expired']
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date
}

OTCOrder {
  _id: ObjectId
  orderNumber: String (unique, required)
  customerId: ObjectId (ref: Customer)
  customerName: String (required)
  customerPhone: String (required)
  items: [{
    itemId: ObjectId (ref: InventoryItem)
    itemName: String
    quantity: Number
    unitPrice: Number
    total: Number
  }]
  subtotal: Number
  tax: Number
  discount: Number
  totalAmount: Number
  paymentStatus: Enum ['pending', 'partial', 'paid']
  orderStatus: Enum ['pending', 'processing', 'ready', 'delivered', 'cancelled']
  serviceCenterId: ObjectId (ref: ServiceCenter)
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date
}

Customer {
  _id: ObjectId
  customerCode: String (unique, required)
  firstName: String (required)
  lastName: String
  phone: String (required, unique)
  email: String
  address: Object
  dateOfBirth: Date
  vehicles: [ObjectId] // ref: Vehicle
  totalOrders: Number (default: 0)
  totalSpent: Number (default: 0)
  loyaltyPoints: Number (default: 0)
  createdAt: Date
  updatedAt: Date
}
```

#### 3.1.4 Workshop & Service Management
```javascript
ServiceRequest {
  _id: ObjectId
  requestNumber: String (unique, required)
  customerId: ObjectId (ref: Customer)
  vehicleId: ObjectId (ref: Vehicle)
  requestType: Enum ['service', 'spare_part', 'home_service']
  serviceType: Enum ['regular', 'repair', 'inspection', 'emergency']
  description: String
  priority: Enum ['low', 'medium', 'high', 'urgent']
  preferredDate: Date
  preferredTime: String
  serviceLocation: Enum ['service_station', 'home']
  address: Object // For home service
  status: Enum ['pending', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled']
  requestedBy: ObjectId (ref: User) // Customer or Advisor
  approvedBy: ObjectId (ref: User) // Admin or SC Manager
  serviceCenterId: ObjectId (ref: ServiceCenter)
  estimatedCost: Number
  createdAt: Date
  updatedAt: Date
}

JobCard {
  _id: ObjectId
  jobCardNumber: String (unique, required)
  serviceRequestId: ObjectId (ref: ServiceRequest)
  vehicleId: ObjectId (ref: Vehicle)
  customerId: ObjectId (ref: Customer)
  serviceCenterId: ObjectId (ref: ServiceCenter)
  
  // Pre-service inspection
  preInspection: {
    odometerReading: Number
    fuelLevel: Number
    exteriorCondition: String
    interiorCondition: String
    issuesReported: [String]
    images: [String] // URLs
    estimatedCost: Number
    estimatedTime: Number // in hours
    inspectedBy: ObjectId (ref: User)
    inspectedAt: Date
  }
  
  // Service execution
  services: [{
    serviceType: String
    description: String
    estimatedTime: Number
    actualTime: Number
    status: Enum ['pending', 'in_progress', 'completed', 'skipped']
    completedBy: ObjectId (ref: User)
    completedAt: Date
  }]
  
  // Parts used
  partsUsed: [{
    itemId: ObjectId (ref: InventoryItem)
    itemName: String
    quantity: Number
    unitPrice: Number
    total: Number
    isWarranty: Boolean
    warrantyNumber: String
  }]
  
  // Additional services
  additionalServices: [{
    description: String
    cost: Number
    approved: Boolean
    approvedBy: ObjectId (ref: User)
    approvedAt: Date
  }]
  
  // Assignment
  assignedEngineer: ObjectId (ref: User)
  assignedDate: Date
  startedAt: Date
  completedAt: Date
  
  // Status tracking
  status: Enum ['created', 'assigned', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled']
  currentStage: String
  
  // Home service specific
  isHomeService: Boolean (default: false)
  engineerNotes: String
  customerNotes: String
  
  createdAt: Date
  updatedAt: Date
}

HomeService {
  _id: ObjectId
  serviceRequestId: ObjectId (ref: ServiceRequest)
  jobCardId: ObjectId (ref: JobCard)
  engineerId: ObjectId (ref: User)
  customerAddress: Object
  scheduledDate: Date
  scheduledTime: String
  visitedAt: Date
  servicePerformed: Boolean
  onSiteInvoiceCreated: Boolean
  paymentCollected: Boolean
  paymentMethod: Enum ['cash', 'card', 'online', 'upi']
  completionNotes: String
  status: Enum ['scheduled', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled']
  createdAt: Date
  updatedAt: Date
}
```

#### 3.1.5 Invoicing & Billing
```javascript
Invoice {
  _id: ObjectId
  invoiceNumber: String (unique, required)
  jobCardId: ObjectId (ref: JobCard) // null for OTC orders
  otcOrderId: ObjectId (ref: OTCOrder) // null for services
  quotationId: ObjectId (ref: Quotation) // optional
  
  customerId: ObjectId (ref: Customer)
  customerDetails: Object {
    name: String
    phone: String
    email: String
    address: Object
    gstNumber: String
  }
  
  serviceCenterId: ObjectId (ref: ServiceCenter)
  
  // Line items
  items: [{
    type: Enum ['service', 'part', 'labour']
    description: String
    quantity: Number
    unitPrice: Number
    discount: Number
    taxRate: Number
    taxAmount: Number
    total: Number
  }]
  
  subtotal: Number
  discount: Number
  tax: Number
  totalAmount: Number
  paidAmount: Number (default: 0)
  balanceAmount: Number
  
  // Payment details
  paymentStatus: Enum ['pending', 'partial', 'paid', 'refunded']
  payments: [{
    amount: Number
    paymentMethod: Enum ['cash', 'card', 'online', 'upi', 'cheque']
    transactionId: String
    paidAt: Date
    paidBy: ObjectId (ref: User)
  }]
  
  // Dates
  invoiceDate: Date
  dueDate: Date
  paidDate: Date
  
  status: Enum ['draft', 'sent', 'paid', 'overdue', 'cancelled']
  createdBy: ObjectId (ref: User)
  createdAt: Date
  updatedAt: Date
}

Payment {
  _id: ObjectId
  paymentNumber: String (unique, required)
  invoiceId: ObjectId (ref: Invoice)
  amount: Number (required)
  paymentMethod: Enum ['cash', 'card', 'online', 'upi', 'cheque']
  transactionId: String
  referenceNumber: String
  notes: String
  receivedBy: ObjectId (ref: User)
  receivedAt: Date
  createdAt: Date
}
```

#### 3.1.6 Feedback & Complaints
```javascript
Feedback {
  _id: ObjectId
  jobCardId: ObjectId (ref: JobCard)
  invoiceId: ObjectId (ref: Invoice)
  customerId: ObjectId (ref: Customer)
  serviceCenterId: ObjectId (ref: ServiceCenter)
  rating: Number (1-5)
  comment: String
  feedbackType: Enum ['service', 'product', 'overall']
  status: Enum ['pending', 'acknowledged', 'resolved']
  createdAt: Date
  updatedAt: Date
}

Complaint {
  _id: ObjectId
  complaintNumber: String (unique, required)
  customerId: ObjectId (ref: Customer)
  jobCardId: ObjectId (ref: JobCard) // optional
  invoiceId: ObjectId (ref: Invoice) // optional
  serviceCenterId: ObjectId (ref: ServiceCenter)
  category: Enum ['service_quality', 'billing', 'parts', 'delay', 'behavior', 'other']
  description: String (required)
  priority: Enum ['low', 'medium', 'high', 'urgent']
  status: Enum ['new', 'assigned', 'investigating', 'resolved', 'closed', 'escalated']
  assignedTo: ObjectId (ref: User)
  resolution: String
  resolvedAt: Date
  resolvedBy: ObjectId (ref: User)
  customerSatisfaction: Number (1-5)
  createdAt: Date
  updatedAt: Date
}
```

#### 3.1.7 Notifications & Audit
```javascript
Notification {
  _id: ObjectId
  userId: ObjectId (ref: User)
  title: String (required)
  message: String (required)
  type: Enum ['info', 'warning', 'error', 'success', 'approval']
  category: Enum ['request', 'approval', 'invoice', 'inventory', 'job_card', 'system']
  relatedEntityType: String // 'JobCard', 'Invoice', etc.
  relatedEntityId: ObjectId
  isRead: Boolean (default: false)
  readAt: Date
  actionUrl: String
  createdAt: Date
}

AuditLog {
  _id: ObjectId
  userId: ObjectId (ref: User)
  action: String (required) // 'create', 'update', 'delete', 'login', etc.
  entityType: String // 'JobCard', 'Invoice', etc.
  entityId: ObjectId
  oldValues: Object
  newValues: Object
  ipAddress: String
  userAgent: String
  timestamp: Date
  serviceCenterId: ObjectId (ref: ServiceCenter)
}

Dashboard {
  _id: ObjectId
  userId: ObjectId (ref: User)
  serviceCenterId: ObjectId (ref: ServiceCenter) // null for admin
  role: String
  widgets: [{
    type: String
    position: Number
    config: Object
  }]
  kpis: [{
    name: String
    value: Number
    trend: String
    period: String
  }]
  updatedAt: Date
}
```

---

## 4. Module-wise Implementation Requirements

### 4.1 Authentication & Role Management

#### 4.1.1 Features
- User registration (Admin only for new users)
- Login with email/phone and password
- JWT-based authentication
- Password reset via email/SMS
- Role-based access control (RBAC)
- Session management
- Multi-factor authentication (optional)

#### 4.1.2 Process Flow
```
1. User Login
   POST /api/auth/login
   → Validate credentials
   → Generate JWT token
   → Return token + user info

2. Password Reset Request
   POST /api/auth/forgot-password
   → Generate reset token
   → Send email/SMS with reset link
   → Token valid for 1 hour

3. Password Reset
   POST /api/auth/reset-password
   → Validate token
   → Update password
   → Invalidate token

4. Role-based Access
   → Middleware checks JWT
   → Verify user role
   → Check permissions
   → Allow/Deny request
```

#### 4.1.3 API Endpoints
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

#### 4.1.4 Roles & Permissions Matrix
```
Admin:
- Full system access
- User management
- Service center management
- System configuration
- View all reports

Service Center Manager:
- Manage SC operations
- Approve service requests
- View SC reports
- Manage SC inventory
- Manage SC users

Technician/Engineer:
- View assigned job cards
- Update job card status
- Update vehicle graphical data
- Request parts
- Create invoices

Advisor:
- Create service requests
- Create leads
- Create quotations
- Schedule appointments
- Customer communication
```

### 4.2 Advanced Vehicle Search System

#### 4.2.1 Features
- Search by vehicle number, VIN, owner name, phone
- Advanced filters (make, model, year, status)
- Graphical vehicle representation
- Service history tracking
- Quick vehicle details access

#### 4.2.2 Process Flow
```
Search Request
→ Query database with filters
→ Apply role-based filtering (SC users see only their SC vehicles)
→ Return results with pagination
→ Include graphical data if requested
```

#### 4.2.3 API Endpoints
- `GET /api/vehicles` - Search vehicles (with filters)
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `GET /api/vehicles/:id/history` - Get service history
- `GET /api/vehicles/:id/graphical` - Get graphical representation
- `PUT /api/vehicles/:id/graphical` - Update graphical data
- `GET /api/vehicles/search/quick` - Quick search (vehicle number, VIN)

### 4.3 Dashboard & KPI Management

#### 4.3.1 Features
- Role-specific dashboards
- Real-time KPI widgets
- Charts and graphs
- Customizable dashboard layout
- Period-based filtering (daily, weekly, monthly, yearly)

#### 4.3.2 KPIs by Role

**Admin Dashboard:**
- Total Service Centers
- Total Active Vehicles
- Total Service Requests (Pending/Completed)
- Revenue (Today/Week/Month)
- Inventory Status (Low stock alerts)
- Customer Satisfaction Score

**Service Center Dashboard:**
- SC-specific service requests
- Job cards in progress
- Revenue (SC-specific)
- Inventory levels
- Pending approvals
- Engineer utilization

**Technician Dashboard:**
- Assigned job cards
- Completed services today
- Pending work
- Parts required
- Performance metrics

#### 4.3.3 API Endpoints
- `GET /api/dashboard` - Get dashboard data (role-based)
- `GET /api/dashboard/kpis` - Get KPI values
- `GET /api/dashboard/charts` - Get chart data
- `PUT /api/dashboard/layout` - Update dashboard layout
- `GET /api/dashboard/notifications` - Get recent notifications

### 4.4 Inventory Management System

#### 4.4.1 Features
- Central warehouse inventory
- Service Center-level inventory
- Stock movement tracking
- Low stock alerts
- Purchase order management
- Supplier management
- Stock transfers between locations
- Inventory reports

#### 4.4.2 Process Flow

**Stock Replenishment Flow:**
```
1. Low Stock Detected
   → System checks reorder point
   → Creates purchase request alert
   → Notifies inventory manager

2. Purchase Order Creation
   POST /api/inventory/purchase-orders
   → Select items and quantities
   → Choose supplier
   → Calculate totals
   → Create PO (draft status)

3. Purchase Order Approval
   PUT /api/inventory/purchase-orders/:id/approve
   → Admin/SC Manager approves
   → Status: approved
   → Send to supplier

4. Stock Receipt
   PUT /api/inventory/purchase-orders/:id/receive
   → Update received quantities
   → Update inventory stock
   → Create stock movement records
   → Update PO status: received
```

**Stock Transfer Flow:**
```
1. Transfer Request
   POST /api/inventory/transfers
   → From location (Central/SC)
   → To location (SC)
   → Items and quantities
   → Status: pending

2. Transfer Approval
   PUT /api/inventory/transfers/:id/approve
   → Approved by manager
   → Deduct from source
   → Add to destination
   → Update status: completed
```

#### 4.4.3 API Endpoints
- `GET /api/inventory/items` - List inventory items
- `POST /api/inventory/items` - Add new item
- `GET /api/inventory/items/:id` - Get item details
- `PUT /api/inventory/items/:id` - Update item
- `GET /api/inventory/items/:id/movements` - Get stock movements
- `POST /api/inventory/adjustments` - Stock adjustment
- `GET /api/inventory/alerts` - Low stock alerts
- `POST /api/inventory/purchase-orders` - Create PO
- `GET /api/inventory/purchase-orders` - List POs
- `PUT /api/inventory/purchase-orders/:id` - Update PO
- `PUT /api/inventory/purchase-orders/:id/approve` - Approve PO
- `PUT /api/inventory/purchase-orders/:id/receive` - Receive stock
- `POST /api/inventory/transfers` - Create transfer
- `GET /api/inventory/transfers` - List transfers
- `PUT /api/inventory/transfers/:id/approve` - Approve transfer
- `GET /api/inventory/suppliers` - List suppliers
- `POST /api/inventory/suppliers` - Add supplier
- `GET /api/inventory/reports` - Inventory reports

### 4.5 Sales & OTC Order Management

#### 4.5.1 Features
- Lead management
- Quotation generation
- OTC (Over-the-Counter) order processing
- Order tracking
- Invoice generation from orders

#### 4.5.2 Process Flow

**Lead to Sale Flow:**
```
1. Lead Creation
   POST /api/sales/leads
   → Customer information
   → Lead source
   → Assigned to advisor
   → Status: new

2. Lead Qualification
   PUT /api/sales/leads/:id
   → Update status
   → Add notes
   → Schedule follow-up

3. Quotation Creation
   POST /api/sales/quotations
   → Link to lead
   → Add items (services/parts)
   → Calculate pricing
   → Set validity period
   → Status: draft

4. Quotation Approval & Send
   PUT /api/sales/quotations/:id/approve
   PUT /api/sales/quotations/:id/send
   → Status: sent
   → Send to customer

5. Quotation Acceptance
   PUT /api/sales/quotations/:id/accept
   → Create service request or OTC order
   → Link quotation
   → Status: accepted
```

**OTC Order Flow:**
```
1. OTC Order Creation
   POST /api/sales/otc-orders
   → Customer details
   → Select items from inventory
   → Check stock availability
   → Calculate total
   → Status: pending

2. Order Processing
   PUT /api/sales/otc-orders/:id/process
   → Reserve items
   → Update inventory
   → Status: processing

3. Order Ready/Delivery
   PUT /api/sales/otc-orders/:id/ready
   PUT /api/sales/otc-orders/:id/deliver
   → Update status
   → Generate invoice
   → Process payment
```

#### 4.5.3 API Endpoints
- `GET /api/sales/leads` - List leads
- `POST /api/sales/leads` - Create lead
- `GET /api/sales/leads/:id` - Get lead details
- `PUT /api/sales/leads/:id` - Update lead
- `POST /api/sales/quotations` - Create quotation
- `GET /api/sales/quotations` - List quotations
- `GET /api/sales/quotations/:id` - Get quotation
- `PUT /api/sales/quotations/:id` - Update quotation
- `PUT /api/sales/quotations/:id/approve` - Approve quotation
- `PUT /api/sales/quotations/:id/send` - Send to customer
- `PUT /api/sales/quotations/:id/accept` - Accept quotation
- `POST /api/sales/otc-orders` - Create OTC order
- `GET /api/sales/otc-orders` - List OTC orders
- `GET /api/sales/otc-orders/:id` - Get OTC order
- `PUT /api/sales/otc-orders/:id` - Update OTC order
- `PUT /api/sales/otc-orders/:id/process` - Process order
- `PUT /api/sales/otc-orders/:id/deliver` - Mark delivered
- `GET /api/sales/customers` - List customers
- `POST /api/sales/customers` - Create customer

### 4.6 Workshop Management Module

#### 4.6.1 Features
- Job card creation and management
- Engineer assignment
- Service tracking
- Parts requirement and allocation
- Pre-service inspection
- Service execution tracking
- Vehicle graphical data updates

#### 4.6.2 Process Flow (Based on Flowchart)

**Service Station Flow:**
```
1. Service Request Creation
   POST /api/workshop/service-requests
   → Customer/Vehicle selection
   → Service type
   → Preferred date/time
   → Status: pending

2. Service Request Approval
   PUT /api/workshop/service-requests/:id/approve
   → Admin/SC Manager approves
   → Status: approved
   → Schedule date confirmed

3. Job Card Creation
   POST /api/workshop/job-cards
   → Link service request
   → Vehicle details
   → Pre-inspection data
   → Status: created

4. Pre-Service Inspection
   PUT /api/workshop/job-cards/:id/pre-inspection
   → Odometer reading
   → Fuel level
   → Condition assessment
   → Issues reported
   → Images upload
   → Estimated cost/time
   → Status: inspected

5. Engineer Assignment
   PUT /api/workshop/job-cards/:id/assign
   → Assign engineer
   → Status: assigned
   → Notification sent

6. Inventory Check
   GET /api/workshop/job-cards/:id/parts-required
   → Check parts availability
   → If not available:
     - Notify customer
     - Create purchase request
     - Wait for parts arrival
   → If available:
     - Reserve parts
     - Proceed to service

7. Service Execution
   PUT /api/workshop/job-cards/:id/start
   → Status: in_progress
   → Update service steps
   → Track time
   → Update parts used

8. Additional Services Check
   PUT /api/workshop/job-cards/:id/additional-services
   → If additional service needed:
     - Request customer approval
     - Update cost
     - Proceed after approval

9. Service Completion
   PUT /api/workshop/job-cards/:id/complete
   → Update all services
   → Update graphical vehicle data
   → Finalize parts used
   → Update status: completed
   → Generate invoice

10. Vehicle Delivery
    PUT /api/workshop/job-cards/:id/deliver
    → Customer handover
    → Collect payment
    → Status: delivered
    → Request feedback
```

**Home Service Flow:**
```
1. Home Service Request
   POST /api/workshop/service-requests
   → serviceLocation: 'home'
   → Customer address
   → Preferred date/time
   → Status: pending

2. Approval & Scheduling
   PUT /api/workshop/service-requests/:id/approve
   → Create home service record
   → Assign engineer
   → Schedule visit

3. Engineer Visit
   PUT /api/workshop/home-services/:id/visit
   → Mark engineer en route
   → Update arrival time
   → Status: arrived

4. On-Site Service
   PUT /api/workshop/home-services/:id/service
   → Perform inspection
   → Create job card on-site
   → Update service details
   → Update graphical data

5. On-Site Invoice
   POST /api/invoices (from job card)
   → Generate invoice
   → Calculate total

6. Payment Collection
   PUT /api/invoices/:id/pay
   → Record payment method
   → Mark paid
   → Update home service status

7. Service Completion
   PUT /api/workshop/home-services/:id/complete
   → Status: completed
   → Update job card
   → Request feedback
```

#### 4.6.3 API Endpoints
- `GET /api/workshop/service-requests` - List service requests
- `POST /api/workshop/service-requests` - Create service request
- `GET /api/workshop/service-requests/:id` - Get request details
- `PUT /api/workshop/service-requests/:id` - Update request
- `PUT /api/workshop/service-requests/:id/approve` - Approve request
- `PUT /api/workshop/service-requests/:id/schedule` - Schedule request
- `GET /api/workshop/job-cards` - List job cards
- `POST /api/workshop/job-cards` - Create job card
- `GET /api/workshop/job-cards/:id` - Get job card
- `PUT /api/workshop/job-cards/:id` - Update job card
- `PUT /api/workshop/job-cards/:id/pre-inspection` - Pre-inspection
- `PUT /api/workshop/job-cards/:id/assign` - Assign engineer
- `PUT /api/workshop/job-cards/:id/start` - Start service
- `PUT /api/workshop/job-cards/:id/parts-request` - Request parts
- `PUT /api/workshop/job-cards/:id/additional-services` - Add services
- `PUT /api/workshop/job-cards/:id/complete` - Complete service
- `PUT /api/workshop/job-cards/:id/deliver` - Deliver vehicle
- `GET /api/workshop/job-cards/:id/graphical-update` - Update graphical data
- `GET /api/workshop/home-services` - List home services
- `POST /api/workshop/home-services` - Create home service
- `PUT /api/workshop/home-services/:id/visit` - Engineer visit
- `PUT /api/workshop/home-services/:id/complete` - Complete home service
- `GET /api/workshop/engineers` - List engineers
- `GET /api/workshop/engineers/:id/workload` - Engineer workload

### 4.7 Home Service Management

#### 4.7.1 Features
- Home service request handling
- Engineer scheduling and dispatch
- On-site service tracking
- On-site invoice generation
- Payment collection tracking
- Location tracking (optional)

#### 4.7.2 API Endpoints
- `GET /api/home-services` - List home services
- `POST /api/home-services` - Create home service
- `GET /api/home-services/:id` - Get home service details
- `PUT /api/home-services/:id/schedule` - Schedule service
- `PUT /api/home-services/:id/assign-engineer` - Assign engineer
- `PUT /api/home-services/:id/start-route` - Engineer starts route
- `PUT /api/home-services/:id/arrive` - Mark arrival
- `PUT /api/home-services/:id/complete` - Complete service
- `PUT /api/home-services/:id/cancel` - Cancel service

### 4.8 Customer Service Request Management

#### 4.8.1 Features
- Service request creation (by customer/advisor)
- Request approval workflow
- Request scheduling
- Status tracking
- Notification to customers

#### 4.8.2 Process Flow
```
Customer/Advisor creates request
→ Pending approval
→ Admin/SC Manager approves
→ Scheduled
→ Converted to job card
→ Status updates throughout
```

#### 4.8.3 API Endpoints
- Same as Workshop Management (Service Requests)

### 4.9 Invoicing & Billing System

#### 4.9.1 Features
- Automatic invoice generation from job cards
- Manual invoice creation
- Multiple payment methods
- Partial payment support
- Payment tracking
- Invoice PDF generation
- Email/SMS invoice sending
- Payment reminders
- SC-level invoice tracking

#### 4.9.2 Process Flow

**Invoice Generation Flow:**
```
1. Auto-Generate from Job Card
   POST /api/invoices/from-job-card/:jobCardId
   → Extract services and parts
   → Calculate totals
   → Apply discounts
   → Calculate tax
   → Generate invoice number
   → Status: draft

2. Invoice Review & Finalize
   PUT /api/invoices/:id/finalize
   → Review items
   → Adjust if needed
   → Status: sent
   → Send to customer

3. Payment Processing
   POST /api/invoices/:id/payments
   → Record payment
   → Update paid amount
   → Update balance
   → If fully paid: status = paid
   → Update job card payment status

4. Payment Reminders
   → Scheduled job checks overdue invoices
   → Send reminders
   → Update status: overdue
```

#### 4.9.3 API Endpoints
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice manually
- `POST /api/invoices/from-job-card/:jobCardId` - Generate from job card
- `POST /api/invoices/from-otc-order/:orderId` - Generate from OTC order
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/pdf` - Download PDF
- `PUT /api/invoices/:id` - Update invoice
- `PUT /api/invoices/:id/finalize` - Finalize invoice
- `PUT /api/invoices/:id/send` - Send to customer
- `POST /api/invoices/:id/payments` - Record payment
- `GET /api/invoices/:id/payments` - Get payment history
- `PUT /api/invoices/:id/cancel` - Cancel invoice
- `GET /api/invoices/reports/summary` - Invoice summary report
- `GET /api/invoices/reports/outstanding` - Outstanding invoices

### 4.10 Reports & Analytics Engine

#### 4.10.1 Features
- Service reports
- Sales reports
- Inventory reports
- Financial reports
- Performance analytics
- Custom report builder
- Export to PDF/CSV/Excel
- Scheduled reports

#### 4.10.2 Report Types

**Service Reports:**
- Service completion report
- Engineer performance
- Service type analysis
- Customer satisfaction
- Service duration analysis

**Sales Reports:**
- Sales summary
- OTC order report
- Quotation conversion
- Lead source analysis
- Customer lifetime value

**Inventory Reports:**
- Stock status
- Stock movement
- Purchase order summary
- Low stock items
- Supplier performance

**Financial Reports:**
- Revenue by SC
- Revenue by service type
- Outstanding payments
- Payment method analysis
- Profit margin analysis

#### 4.10.3 API Endpoints
- `GET /api/reports/service` - Service reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/inventory` - Inventory reports
- `GET /api/reports/financial` - Financial reports
- `GET /api/reports/analytics` - Analytics data
- `POST /api/reports/custom` - Generate custom report
- `GET /api/reports/export/:reportId` - Export report

### 4.11 Notification Management System

#### 4.11.1 Features
- In-app notifications
- Email notifications
- SMS notifications
- Push notifications (optional)
- Notification preferences
- Notification history
- Real-time updates via WebSocket

#### 4.11.2 Notification Types
- Service request approval needed
- Service request approved/rejected
- Job card assigned
- Parts not available
- Parts arrived
- Invoice generated
- Payment received
- Payment reminder
- Feedback requested
- Complaint registered

#### 4.11.3 API Endpoints
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences
- `DELETE /api/notifications/:id` - Delete notification

### 4.12 Feedback & Complaint Management

#### 4.12.1 Features
- Post-service feedback collection
- Feedback rating system
- Complaint registration
- Complaint tracking
- Complaint resolution workflow
- Customer satisfaction tracking

#### 4.12.2 Process Flow

**Feedback Flow:**
```
After service completion
→ Send feedback request (SMS/Email)
→ Customer provides feedback
→ System records feedback
→ Update customer satisfaction metrics
→ If negative feedback → Create complaint
```

**Complaint Flow:**
```
Complaint Creation
→ Status: new
→ Assign to manager
→ Status: assigned
→ Investigation
→ Status: investigating
→ Resolution provided
→ Customer satisfaction check
→ Status: resolved/closed
```

#### 4.12.3 API Endpoints
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - List feedback
- `GET /api/feedback/:id` - Get feedback details
- `PUT /api/feedback/:id/acknowledge` - Acknowledge feedback
- `POST /api/complaints` - Create complaint
- `GET /api/complaints` - List complaints
- `GET /api/complaints/:id` - Get complaint details
- `PUT /api/complaints/:id` - Update complaint
- `PUT /api/complaints/:id/assign` - Assign complaint
- `PUT /api/complaints/:id/resolve` - Resolve complaint
- `GET /api/complaints/analytics` - Complaint analytics

### 4.13 Graphical Vehicle Work

#### 4.13.1 Features
- Visual representation of vehicle components
- Component status tracking
- Service history per component
- Component-wise issues tracking
- Visual indicators (colors/shapes)
- Component interaction mapping

#### 4.13.2 Data Structure
```javascript
VehicleGraphicalData {
  vehicleId: ObjectId
  components: [{
    id: String (unique)
    name: String
    category: String // 'engine', 'body', 'electrical', etc.
    position: Object { x, y } // For rendering
    status: Enum ['healthy', 'warning', 'critical', 'unknown']
    lastServiceDate: Date
    nextServiceDate: Date
    serviceInterval: Number // days
    issues: [{
      description: String
      severity: Enum ['low', 'medium', 'high', 'critical']
      reportedDate: Date
      resolvedDate: Date
      resolved: Boolean
    }]
    serviceHistory: [{
      date: Date
      type: String
      description: String
      cost: Number
      jobCardId: ObjectId
    }]
  }]
  lastUpdated: Date
}
```

#### 4.13.3 API Endpoints
- `GET /api/vehicles/:id/graphical` - Get graphical data
- `PUT /api/vehicles/:id/graphical` - Update graphical data
- `PUT /api/vehicles/:id/graphical/components/:componentId` - Update component
- `GET /api/vehicles/:id/graphical/components/:componentId/history` - Component history
- `POST /api/vehicles/:id/graphical/components/:componentId/issues` - Add issue

### 4.14 Admin Panel & Audit Logs

#### 4.14.1 Features
- User management (CRUD)
- Service center management
- Role and permission management
- System configuration
- Audit log viewing
- Activity tracking
- Data export
- System health monitoring

#### 4.14.2 API Endpoints
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/activate` - Activate/deactivate
- `GET /api/admin/service-centers` - List SCs
- `POST /api/admin/service-centers` - Create SC
- `PUT /api/admin/service-centers/:id` - Update SC
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/audit-logs/:id` - Get log details
- `GET /api/admin/system-health` - System health check
- `GET /api/admin/config` - Get system config
- `PUT /api/admin/config` - Update system config

---

## 5. API Endpoint Specifications

### 5.1 API Structure

**Base URL:** `https://api.dms.example.com/api/v1`

**Authentication:** Bearer Token (JWT)
```
Headers:
Authorization: Bearer <token>
Content-Type: application/json
```

### 5.2 Common Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

### 5.3 Pagination Format

**Request:**
```
GET /api/resource?page=1&limit=20&sort=createdAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 5.4 Filtering Format

```
GET /api/resource?filter[status]=active&filter[createdAt][gte]=2025-01-01
```

### 5.5 Complete API Endpoint List

See individual modules above for detailed endpoints. Summary:

- **Authentication:** 9 endpoints
- **Vehicles:** 8 endpoints
- **Dashboard:** 5 endpoints
- **Inventory:** 20+ endpoints
- **Sales:** 15+ endpoints
- **Workshop:** 20+ endpoints
- **Home Service:** 8 endpoints
- **Invoicing:** 12 endpoints
- **Reports:** 7 endpoints
- **Notifications:** 6 endpoints
- **Feedback/Complaints:** 11 endpoints
- **Graphical Vehicle:** 5 endpoints
- **Admin:** 12 endpoints

**Total: ~150+ API endpoints**

---

## 6. Process Flows & Workflows

### 6.1 Complete Service Flow (From Flowchart)

```
1. Customer Contact
   ↓
2. Call Center receives inquiry
   ↓
3. Advisor: Pre-estimation & Scheduling
   ↓
4. Service Request Created
   ↓
5. Request Approval (Admin/SC Manager)
   ↓
6. Date Confirmation
   ↓
7a. Service Station Path:
    → Pre-Service Inspection
    → Job Card Created
    → Engineer Assigned
    → Service Inspection
    → Inventory Check
    → Service Execution
    → Invoice Creation
    → Payment
    → Delivery
    ↓
7b. Home Service Path:
    → Engineer Assigned
    → Engineer Visits Location
    → Perform Service
    → Generate Job Card on-site
    → Create Invoice on-site
    → Collect Payment
    → Complete
    ↓
8. Post-Service Feedback
    ↓
9. If Negative Feedback → Complaint Management
    ↓
10. Service Completed
```

### 6.2 Inventory Management Flow

```
1. Stock Level Monitoring
   ↓
2. Low Stock Alert (if below reorder point)
   ↓
3. Purchase Request Created
   ↓
4. Purchase Order Created
   ↓
5. PO Approval
   ↓
6. Order Sent to Supplier
   ↓
7. Stock Received
   ↓
8. Inventory Updated
   ↓
9. Alert: Stock Available (if was waiting)
```

### 6.3 Sales & Order Flow

```
1. Lead Creation
   ↓
2. Lead Qualification
   ↓
3. Quotation Creation
   ↓
4. Quotation Approval
   ↓
5. Quotation Sent to Customer
   ↓
6a. Customer Accepts:
     → Create Service Request or OTC Order
     ↓
6b. Customer Rejects:
     → Lead marked as lost
     ↓
7. Order Processing
   ↓
8. Fulfillment
   ↓
9. Invoice & Payment
   ↓
10. Order Completed
```

### 6.4 Approval Workflows

```
1. Service Request Approval:
   Customer/Advisor creates request
   ↓
   Notification to Admin/SC Manager
   ↓
   Manager reviews request
   ↓
   Decision:
   - Approve → Request status: approved → Scheduling
   - Reject → Request status: rejected → Notify customer
   ↓
   Notification sent to requester
```

```
2. Purchase Order Approval:
   Purchase Request Created (from low stock or manual)
   ↓
   PO Draft Created
   ↓
   Notification to Admin/Manager
   ↓
   Review PO details
   ↓
   Decision:
   - Approve → Status: approved → Send to supplier
   - Reject → Status: rejected → Notify requester
   ↓
   If approved: Order placed with supplier
```

```
3. Additional Service Approval (During Job Card):
   Engineer identifies additional service needed
   ↓
   Update job card with additional service
   ↓
   Status: waiting_customer_approval
   ↓
   Notification to customer
   ↓
   Customer decision:
   - Approve → Update cost → Continue service
   - Reject → Continue with original service only
   ↓
   Update job card status
```

```
4. Complaint Resolution Approval:
   Complaint registered
   ↓
   Assigned to manager
   ↓
   Investigation conducted
   ↓
   Resolution proposed
   ↓
   Resolution approved by admin
   ↓
   Customer notified
   ↓
   Customer satisfaction check
   ↓
   Complaint closed
```

### 6.5 Payment & Billing Flow

```
1. Invoice Generation:
   Job Card/OTC Order completed
   ↓
   System auto-generates invoice
   ↓
   Invoice review by authorized user
   ↓
   Invoice finalized and sent
   ↓
   Customer receives invoice (email/SMS)
```

```
2. Payment Processing:
   Customer makes payment
   ↓
   Payment recorded in system
   ↓
   Payment method: Cash/Card/Online/UPI
   ↓
   Invoice balance updated
   ↓
   If fully paid:
   - Invoice status: paid
   - Job card payment status: paid
   - Customer notification sent
   ↓
   If partially paid:
   - Invoice status: partial
   - Payment reminder scheduled
```

```
3. Payment Reminder Flow:
   Scheduled job checks overdue invoices
   ↓
   If invoice due date passed and unpaid:
   - Generate reminder notification
   - Send email/SMS to customer
   - Update invoice status: overdue
   ↓
   Repeat reminders based on configuration
```

---

## 7. Integration Points

### 7.1 Frontend-Backend Integration

#### 7.1.1 API Integration
- **RESTful API**: All frontend requests to `/api/*` endpoints
- **Authentication**: JWT tokens stored in localStorage/httpOnly cookies
- **Request Interceptors**: Add auth token to all requests
- **Response Interceptors**: Handle 401 (logout) and error responses
- **Real-time**: WebSocket connection for live updates

#### 7.1.2 Data Flow
```
Next.js Frontend
    ↓ (HTTP Request)
Express.js Backend
    ↓ (Query/Update)
Database
    ↓ (Response)
Express.js Backend
    ↓ (JSON Response)
Next.js Frontend
    ↓ (State Update)
React Components
```

#### 7.1.3 State Management
- **Server State**: React Query / SWR for API data fetching
- **Client State**: React Context / Zustand for UI state
- **Form State**: React Hook Form for form management
- **Cache Strategy**: 
  - Cache API responses
  - Invalidate on mutations
  - Real-time updates via WebSocket

#### 7.1.4 Error Handling
- **Backend**: Consistent error response format
- **Frontend**: Global error handler middleware
- **User Feedback**: Toast notifications for success/error
- **Logging**: Sentry or similar for error tracking

### 7.2 External Service Integrations

#### 7.2.1 Email Service
- **Provider**: SendGrid / AWS SES / Nodemailer
- **Use Cases**:
  - Password reset emails
  - Invoice emails
  - Notification emails
  - Report emails
- **Configuration**: Environment variables for SMTP/API keys

#### 7.2.2 SMS Service
- **Provider**: Twilio / AWS SNS / MSG91
- **Use Cases**:
  - OTP for password reset
  - Service reminders
  - Invoice notifications
  - Appointment confirmations
- **Configuration**: API credentials in environment variables

#### 7.2.3 Payment Gateway (Future)
- **Provider**: Razorpay / Stripe / PayPal
- **Integration Points**:
  - Invoice payment
  - OTC order payment
  - Partial payment processing
- **Webhooks**: Payment status callbacks

#### 7.2.4 File Storage
- **Provider**: AWS S3 / Cloudinary / Azure Blob Storage
- **Use Cases**:
  - Vehicle images
  - Invoice PDFs
  - Report exports
  - Document attachments
- **Upload**: Multipart form data to backend
- **Storage**: Backend uploads to cloud storage
- **Access**: Signed URLs for file access

#### 7.2.5 Analytics & Monitoring
- **Application Monitoring**: New Relic / DataDog
- **Error Tracking**: Sentry
- **Logging**: Winston / Morgan for request logging
- **Performance**: APM tools for performance monitoring

### 7.3 Database Integration

#### 7.3.1 Database Choice
- **Primary Option**: MongoDB (NoSQL) - Flexible schema for dynamic data
- **Alternative**: PostgreSQL (SQL) - If relational data integrity is critical
- **Caching**: Redis for session storage and caching

#### 7.3.2 Connection Management
- **Connection Pooling**: Managed by ORM/ODM
- **Transactions**: For critical operations (payments, inventory)
- **Migrations**: Database schema versioning
- **Backups**: Automated daily backups

### 7.4 Real-time Communication

#### 7.4.1 WebSocket Integration
- **Technology**: Socket.io
- **Use Cases**:
  - Real-time notifications
  - Live dashboard updates
  - Job card status updates
  - Inventory alerts
- **Connection Management**:
  - Authenticate WebSocket connection
  - Room-based messaging (by service center, role)
  - Automatic reconnection on disconnect

#### 7.4.2 Notification Channels
- **In-app**: WebSocket push notifications
- **Email**: SMTP integration
- **SMS**: SMS gateway integration
- **Preferences**: User-configurable notification preferences

---

## 8. Phase-wise Development Plan

### 8.1 Phase 1 - Project Foundation & Design (Week 1-2)

#### 8.1.1 Deliverables
- ✅ Project setup and repository initialization
- ✅ Database schema design finalization
- ✅ API endpoint specification document
- ✅ Environment configuration
- ✅ Development environment setup
- ✅ CI/CD pipeline setup

#### 8.1.2 Tasks

**Week 1:**
- [ ] Initialize Node.js/Express project structure
- [ ] Set up database (MongoDB/PostgreSQL)
- [ ] Configure environment variables
- [ ] Set up ESLint, Prettier, and code formatting
- [ ] Create base Express app with middleware
- [ ] Set up error handling middleware
- [ ] Create database models (User, ServiceCenter, Role)
- [ ] Set up authentication middleware foundation
- [ ] Create logger utility
- [ ] API documentation setup (Swagger/Postman)

**Week 2:**
- [ ] Complete all database models
- [ ] Create database connection and configuration
- [ ] Set up Redis for caching/sessions (if needed)
- [ ] Create base controller, service, and route structure
- [ ] Set up validation middleware
- [ ] Create audit log middleware
- [ ] Set up file upload handling
- [ ] Create utility functions (email, SMS, PDF)
- [ ] Database seeding scripts for development
- [ ] Unit test setup (Jest/Mocha)

#### 8.1.3 Acceptance Criteria
- Project structure is complete and organized
- All database models are defined and tested
- Base Express app runs successfully
- Development environment is fully functional
- Code quality tools are configured
- Basic authentication middleware works

**Milestone:** Phase 1 Complete - ₹14,300 (25%)

---

### 8.2 Phase 2 - Core Module Development (Week 3-4)

#### 8.2.1 Deliverables
- ✅ Authentication & Role Management module
- ✅ Dashboard & KPI Management module
- ✅ Inventory Management module (basic)
- ✅ Vehicle Search System

#### 8.2.2 Tasks

**Week 3: Authentication & Dashboard**
- [ ] Implement user registration (Admin only)
- [ ] Implement login with JWT
- [ ] Implement password reset flow
- [ ] Implement role-based access control middleware
- [ ] Create user management endpoints
- [ ] Implement profile management
- [ ] Create dashboard data aggregation service
- [ ] Implement role-specific dashboard KPIs
- [ ] Create dashboard API endpoints
- [ ] Implement dashboard caching

**Week 4: Inventory & Vehicle Search**
- [ ] Implement inventory CRUD operations
- [ ] Create stock movement tracking
- [ ] Implement low stock alerts
- [ ] Create purchase order management (basic)
- [ ] Implement supplier management
- [ ] Create vehicle CRUD operations
- [ ] Implement advanced vehicle search with filters
- [ ] Create vehicle service history tracking
- [ ] Implement inventory reports (basic)
- [ ] Create stock adjustment functionality

#### 8.2.3 Acceptance Criteria
- Users can login and authenticate
- Password reset works via email/SMS
- Role-based access control is functional
- Dashboard displays role-specific KPIs
- Inventory items can be managed
- Stock movements are tracked
- Vehicles can be searched and managed
- Basic reports are available

**Milestone:** Phase 2 Complete - ₹14,300 (25%)

---

### 8.3 Phase 3 - Operations & Workflow (Week 5-6)

#### 8.3.1 Deliverables
- ✅ Sales & OTC Order Management module
- ✅ Workshop Management module
- ✅ Customer Service Request Management
- ✅ Home Service Management
- ✅ Integration of approval workflows

#### 8.3.2 Tasks

**Week 5: Sales & Service Requests**
- [ ] Implement lead management
- [ ] Create quotation generation
- [ ] Implement OTC order processing
- [ ] Create customer management
- [ ] Implement service request creation
- [ ] Create approval workflow for service requests
- [ ] Implement service request scheduling
- [ ] Create notification system for approvals
- [ ] Implement service request status tracking

**Week 6: Workshop & Home Service**
- [ ] Implement job card creation
- [ ] Create pre-service inspection functionality
- [ ] Implement engineer assignment
- [ ] Create inventory check integration
- [ ] Implement service execution tracking
- [ ] Create additional service approval flow
- [ ] Implement job card completion
- [ ] Create home service management
- [ ] Implement engineer dispatch tracking
- [ ] Create on-site invoice generation for home service

#### 8.3.3 Acceptance Criteria
- Leads can be created and managed
- Quotations can be generated and sent
- OTC orders can be processed end-to-end
- Service requests can be created and approved
- Job cards can be created and managed
- Engineers can be assigned to job cards
- Home services can be scheduled and tracked
- Approval workflows are functional
- Notifications are sent at appropriate stages

**Milestone:** Phase 3 Complete - ₹17,220 (30%)

---

### 8.4 Phase 4 - Testing, Reports & Deployment (Week 7-8)

#### 8.4.1 Deliverables
- ✅ Invoicing & Billing System
- ✅ Reports & Analytics Engine
- ✅ Notification Management System
- ✅ Feedback & Complaint Management
- ✅ Graphical Vehicle Work
- ✅ Admin Panel & Audit Logs
- ✅ Complete testing and bug fixes
- ✅ Production deployment

#### 8.4.2 Tasks

**Week 7: Invoicing, Reports & Notifications**
- [ ] Implement automatic invoice generation from job cards
- [ ] Create invoice management (CRUD)
- [ ] Implement payment recording and tracking
- [ ] Create invoice PDF generation
- [ ] Implement email/SMS invoice sending
- [ ] Create comprehensive reports (service, sales, inventory, financial)
- [ ] Implement report export (PDF/CSV)
- [ ] Create notification management system
- [ ] Implement real-time notifications via WebSocket
- [ ] Create notification preferences

**Week 8: Final Features, Testing & Deployment**
- [ ] Implement feedback collection system
- [ ] Create complaint management workflow
- [ ] Implement graphical vehicle data structure
- [ ] Create graphical component status tracking
- [ ] Implement admin panel endpoints
- [ ] Create audit log viewing and filtering
- [ ] Implement system configuration management
- [ ] Complete integration testing
- [ ] Perform security audit
- [ ] Bug fixes and optimization
- [ ] Performance testing and optimization
- [ ] API documentation completion
- [ ] Production environment setup
- [ ] Deployment and smoke testing
- [ ] User acceptance testing (UAT)
- [ ] Production deployment
- [ ] Documentation handover

#### 8.4.3 Acceptance Criteria
- Invoices can be generated and managed
- Payments can be recorded and tracked
- All report types are functional and exportable
- Notifications work across all channels
- Feedback and complaints can be managed
- Graphical vehicle data is functional
- Admin panel is fully operational
- Audit logs are comprehensive
- All modules are tested and bug-free
- System is deployed to production
- UAT is completed and signed off

**Milestone:** Phase 4 Complete - ₹11,480 (20%)

---

### 8.5 Post-Deployment (Maintenance Period - 2 Months)

#### 8.5.1 Maintenance Tasks
- Bug fixes and hotfixes
- Performance monitoring and optimization
- Security updates
- User support and training
- Documentation updates
- Minor feature enhancements based on feedback

#### 8.5.2 Support Scope
- Response time: 24-48 hours for critical issues
- Bug fixes within 1 week
- Feature requests can be addressed in next release
- Documentation updates as needed

---

## 9. Technical Stack & Dependencies

### 9.1 Backend Technology Stack

#### 9.1.1 Core Framework
```json
{
  "runtime": "Node.js (v18+ LTS)",
  "framework": "Express.js (v4.x)",
  "language": "JavaScript (ES6+) or TypeScript"
}
```

#### 9.1.2 Database & ORM
```json
{
  "database": "MongoDB (v6+) or PostgreSQL (v14+)",
  "orm": "Mongoose (MongoDB) or Sequelize/TypeORM (PostgreSQL)",
  "cache": "Redis (v7+)",
  "migration": "Mongoose Migrations or Knex.js"
}
```

#### 9.1.3 Authentication & Security
```json
{
  "authentication": "jsonwebtoken (JWT)",
  "password_hashing": "bcryptjs",
  "validation": "joi or express-validator",
  "rate_limiting": "express-rate-limit",
  "helmet": "helmet (security headers)",
  "cors": "cors"
}
```

#### 9.1.4 File Processing
```json
{
  "file_upload": "multer",
  "pdf_generation": "pdfkit or puppeteer",
  "excel": "exceljs",
  "image_processing": "sharp (if needed)"
}
```

#### 9.1.5 Communication
```json
{
  "email": "nodemailer or sendgrid",
  "sms": "twilio or aws-sdk",
  "websocket": "socket.io",
  "http_client": "axios"
}
```

#### 9.1.6 Utilities
```json
{
  "logging": "winston",
  "env_config": "dotenv",
  "date_handling": "moment.js or date-fns",
  "uuid": "uuid",
  "error_tracking": "sentry (optional)"
}
```

#### 9.1.7 Testing
```json
{
  "test_framework": "Jest or Mocha",
  "assertion": "Chai",
  "http_testing": "supertest",
  "coverage": "nyc or jest coverage"
}
```

### 9.2 Development Tools

#### 9.2.1 Code Quality
```json
{
  "linter": "ESLint",
  "formatter": "Prettier",
  "pre_commit": "Husky + lint-staged",
  "type_checking": "TypeScript (optional)"
}
```

#### 9.2.2 API Documentation
```json
{
  "swagger": "swagger-jsdoc + swagger-ui-express",
  "postman": "Postman collection"
}
```

#### 9.2.3 DevOps
```json
{
  "version_control": "Git",
  "ci_cd": "GitHub Actions / GitLab CI / Jenkins",
  "containerization": "Docker (optional)",
  "process_manager": "PM2"
}
```

### 9.3 Package.json Dependencies Example

```json
{
  "name": "dms-backend",
  "version": "1.0.0",
  "description": "Dealer Management System Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"**/*.{js,json,md}\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.4",
    "socket.io": "^4.5.4",
    "winston": "^3.10.0",
    "pdfkit": "^0.13.0",
    "exceljs": "^4.3.0",
    "axios": "^1.4.0",
    "moment": "^2.29.4",
    "uuid": "^9.0.0",
    "redis": "^4.6.7"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "eslint": "^8.43.0",
    "prettier": "^2.8.8",
    "husky": "^8.0.3"
  }
}
```

### 9.4 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/dms
# OR
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dms
POSTGRES_USER=dbuser
POSTGRES_PASSWORD=dbpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@dms.com

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# File Storage
STORAGE_TYPE=local
# OR
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=dms-storage

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 9.5 Architecture Decisions

#### 9.5.1 Why Express.js?
- Lightweight and flexible
- Large ecosystem and community
- Easy to learn and maintain
- Fast development
- Good performance

#### 9.5.2 Why MongoDB/PostgreSQL?
- **MongoDB**: Flexible schema for evolving requirements, good for document-based data
- **PostgreSQL**: ACID compliance for financial data, strong relational features
- Decision based on team expertise and specific requirements

#### 9.5.3 Why JWT?
- Stateless authentication
- Scalable for multiple service centers
- Mobile-friendly
- Industry standard

#### 9.5.4 Why Socket.io?
- Real-time bidirectional communication
- Automatic fallback to polling
- Room-based messaging for multi-tenancy
- Easy integration with Express

### 9.6 Performance Considerations

#### 9.6.1 Caching Strategy
- Redis for session storage
- Cache frequently accessed data (KPIs, reports)
- Cache invalidation on data updates
- Cache TTL based on data volatility

#### 9.6.2 Database Optimization
- Indexes on frequently queried fields
- Query optimization
- Connection pooling
- Pagination for large datasets

#### 9.6.3 API Optimization
- Response compression (gzip)
- Pagination for list endpoints
- Field selection for partial responses
- Batch operations where possible

#### 9.6.4 Background Jobs
- Use node-cron or Bull queue for scheduled tasks
- Payment reminders
- Report generation
- Email/SMS sending
- Stock level checks

---

## 10. API Response Standards

### 10.1 Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2025-10-10T10:00:00Z",
    "requestId": "req-12345"
  }
}
```

### 10.2 Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details
    },
    "field": "fieldName" // For validation errors
  },
  "meta": {
    "timestamp": "2025-10-10T10:00:00Z",
    "requestId": "req-12345"
  }
}
```

### 10.3 Pagination Response
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 10.4 Common Error Codes
- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Unauthorized access
- `VALIDATION_001` - Invalid input data
- `NOT_FOUND_001` - Resource not found
- `DUPLICATE_001` - Duplicate entry
- `BUSINESS_001` - Business logic violation
- `SERVER_001` - Internal server error

---

## 11. Security Considerations

### 11.1 Authentication Security
- Strong password requirements (min 8 chars, alphanumeric)
- Password hashing with bcrypt (10+ rounds)
- JWT token expiration (7 days access, 30 days refresh)
- Secure token storage recommendations
- Rate limiting on login endpoints

### 11.2 API Security
- HTTPS in production
- CORS configuration
- Helmet.js for security headers
- Input validation and sanitization
- SQL/NoSQL injection prevention
- XSS prevention

### 11.3 Data Security
- Sensitive data encryption
- Secure file uploads (file type validation, size limits)
- Secure file storage
- Database access control
- Regular security audits

### 11.4 Audit & Compliance
- Comprehensive audit logging
- User activity tracking
- Data access logs
- Change history tracking
- GDPR compliance considerations

---

## 12. Testing Strategy

### 12.1 Unit Testing
- Test individual functions and methods
- Mock external dependencies
- Target: 70%+ code coverage
- Tools: Jest/Mocha

### 12.2 Integration Testing
- Test API endpoints
- Test database interactions
- Test authentication flows
- Tools: Supertest

### 12.3 End-to-End Testing
- Test complete workflows
- Test user journeys
- Tools: Postman/Newman for API testing

### 12.4 Performance Testing
- Load testing with realistic data
- Stress testing
- Tools: Artillery / k6

### 12.5 Security Testing
- Penetration testing
- Vulnerability scanning
- Authentication testing

---

## 13. Deployment Checklist

### 13.1 Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Backup strategy in place

### 13.2 Deployment
- [ ] Production server setup
- [ ] Database setup and migrations
- [ ] Application deployment
- [ ] SSL certificate configured
- [ ] Domain and DNS configured
- [ ] Monitoring tools configured
- [ ] Backup system verified

### 13.3 Post-Deployment
- [ ] Smoke testing
- [ ] Health check endpoints verified
- [ ] Monitoring dashboards active
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Support channels established

---

## 14. Documentation Requirements

### 14.1 API Documentation
- Swagger/OpenAPI specification
- Postman collection
- Endpoint descriptions
- Request/response examples
- Error code reference

### 14.2 Code Documentation
- Inline code comments
- JSDoc for functions
- README files for each module
- Architecture decision records

### 14.3 User Documentation
- Admin user guide
- Service center user guide
- Technician user guide
- API integration guide

---

## 15. Conclusion

This document serves as a comprehensive guide for implementing the Dealer Management System backend. All 14 core modules have been detailed with:

- Database schema designs
- Process flows and workflows
- API endpoint specifications
- Integration points
- Phase-wise development plan
- Technical stack and dependencies

The implementation should follow this document systematically, ensuring all requirements from the quotation are met. Regular reviews and updates to this document may be necessary as development progresses and requirements evolve.

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Status:** Complete
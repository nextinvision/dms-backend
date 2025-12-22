# Backend API Test Design

This document outlines the test cases designed to verify the functionality of the DMS Backend API. These tests cover the critical business workflows, security controls (RBAC), and data integrity.

## 1. Authentication Module (`/auth`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | **User Login - Success** | Registered User | POST `/auth/login` with valid params | 201 Created, returns JWT token |
| **AUTH-02** | **User Login - Failure** | None | POST `/auth/login` with wrong password | 401 Unauthorized |
| **AUTH-03** | **Get Profile** | Valid JWT | GET `/auth/profile` | 200 OK, returns user details |
| **AUTH-04** | **Access Protected Route** | No Token | GET `/auth/profile` | 401 Unauthorized |

## 2. Service Centers (`/service-centers`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SC-01** | **List Service Centers** | Admin Token | GET `/service-centers` | 200 OK, lists all centers |
| **SC-02** | **Get Specific SC** | User Token | GET `/service-centers/:id` | 200 OK, returns SC details |

## 3. Customer Management (`/customers`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **CUST-01** | **Create Customer** | Auth Token | POST `/customers` with valid DTO | 201 Created, returns Customer ID |
| **CUST-02** | **Validation Error** | Auth Token | POST `/customers` with invalid phone | 400 Bad Request |
| **CUST-03** | **Search Customer** | Auth Token | GET `/customers?search=999` | 200 OK, returns matches |

## 4. Vehicle Management (`/vehicles`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **VEH-01** | **Register Vehicle** | Existing Customer | POST `/vehicles` with valid DTO | 201 Created, returns Vehicle ID |
| **VEH-02** | **Duplicate Check** | Existing Reg/VIN | POST `/vehicles` with existing Reg | 400 Bad Request (Unique Violated) |

## 5. Job Card Workflow (`/job-cards`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **JC-01** | **Create Job Card** | Cust + Veh + SC | POST `/job-cards` | 201 Created, Status: `CREATED` |
| **JC-02** | **Vehicle Status Lock** | JC Created | Check Vehicle `currentStatus` | Status is `ACTIVE_JOB_CARD` |
| **JC-03** | **Assign Engineer** | JC Created | POST `/job-cards/:id/assign-engineer` | 200 OK, Status: `ASSIGNED` |
| **JC-04** | **Update Status** | JC Assigned | PATCH `/job-cards/:id/status` | 200 OK, Status Updates |

## 6. Inventory & Parts (`/inventory`, `/parts-request`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **INV-01** | **Check Stock** | Auth Token | GET `/inventory?partNumber=X` | 200 OK, returns Qty |
| **REQ-01** | **Request Part** | Active JC | POST `/parts-requests` | 201 Created, Status: `PENDING` |

## 7. Analytics (`/analytics`)
| ID | Test Case | Pre-condition | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **ANA-01** | **Dashboard Stats** | Admin Token | GET `/analytics/dashboard` | 200 OK, returns aggregated counts |
| **ANA-02** | **Revenue Stats** | Admin Token | GET `/analytics/revenue` | 200 OK, returns monthly data |

---

## Validated Scenarios (Current Session)
The following scenarios have been **automatically verified** using the `test-api.js` script:
1. Admin Login ✅
2. Fetching Service Centers (Multi-tenant check) ✅
3. Creating a new Customer (Phone validation check) ✅
4. Creating a Vehicle (Registration unique check) ✅
5. End-to-End Job Card Creation (Transaction check) ✅
6. Analytics Data Aggregation ✅

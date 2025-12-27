#!/usr/bin/env node

/**
 * DMS Backend API Comprehensive Test Script
 * Tests all endpoints on the deployed backend
 * 
 * Usage: node test-all-endpoints.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'https://dms-backend-um2e.onrender.com';
const API_PREFIX = '/api';

// Test credentials
const TEST_CREDENTIALS = {
    email: 'admin@dms.com',
    password: 'admin123'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Test results storage
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

// Global auth token
let authToken = null;
let testServiceCenterId = null;
let testUserId = null;
let testCustomerId = null;
let testVehicleId = null;

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            method,
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            const body = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = lib.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Log with color
 */
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log test result
 */
function logTest(name, passed, details = '') {
    results.total++;
    if (passed) {
        results.passed++;
        log(`✓ ${name}`, colors.green);
    } else {
        results.failed++;
        log(`✗ ${name}`, colors.red);
    }
    if (details) {
        log(`  ${details}`, colors.cyan);
    }
    results.tests.push({ name, passed, details });
}

/**
 * Test endpoint
 */
async function testEndpoint(name, method, path, expectedStatus = 200, data = null, useAuth = true) {
    try {
        const headers = {};
        if (useAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await makeRequest(method, `${API_PREFIX}${path}`, data, headers);

        const passed = response.statusCode === expectedStatus;
        const details = `${method} ${path} → ${response.statusCode} (expected ${expectedStatus})`;

        logTest(name, passed, details);

        return response;
    } catch (error) {
        logTest(name, false, `Error: ${error.message}`);
        return null;
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main test suite
 */
async function runTests() {
    log('\n' + '='.repeat(80), colors.bright);
    log('DMS Backend API Comprehensive Test Suite', colors.bright + colors.cyan);
    log('='.repeat(80) + '\n', colors.bright);
    log(`Base URL: ${BASE_URL}${API_PREFIX}`, colors.yellow);
    log(`Started at: ${new Date().toISOString()}\n`, colors.yellow);

    // ============================================================================
    // 1. HEALTH CHECK
    // ============================================================================
    log('\n📡 Health Check', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    await testEndpoint('Health Check', 'GET', '/health', 200, null, false);
    await sleep(500);

    // ============================================================================
    // 2. AUTHENTICATION
    // ============================================================================
    log('\n🔐 Authentication Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    // Login
    const loginResponse = await testEndpoint(
        'Login with credentials',
        'POST',
        '/auth/login',
        200,
        TEST_CREDENTIALS,
        false
    );

    if (loginResponse && loginResponse.data.accessToken) {
        authToken = loginResponse.data.accessToken;
        log(`  Token acquired: ${authToken.substring(0, 20)}...`, colors.green);
    } else {
        log('  ⚠️  Authentication failed - some tests will be skipped', colors.yellow);
    }

    await sleep(500);

    // Get current user
    if (authToken) {
        await testEndpoint('Get current user', 'GET', '/auth/me', 200);
        await sleep(500);
    }

    // ============================================================================
    // 3. SERVICE CENTERS
    // ============================================================================
    log('\n🏢 Service Centers Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all service centers
        const scResponse = await testEndpoint(
            'Get all service centers',
            'GET',
            '/service-centers?page=1&limit=10',
            200
        );

        if (scResponse && scResponse.data.data && scResponse.data.data.length > 0) {
            testServiceCenterId = scResponse.data.data[0].id;
            log(`  Using service center ID: ${testServiceCenterId}`, colors.cyan);
        }

        await sleep(500);

        // Get service center by ID
        if (testServiceCenterId) {
            await testEndpoint(
                'Get service center by ID',
                'GET',
                `/service-centers/${testServiceCenterId}`,
                200
            );
            await sleep(500);

            // Get service center stats
            await testEndpoint(
                'Get service center stats',
                'GET',
                `/service-centers/${testServiceCenterId}/stats`,
                200
            );
            await sleep(500);
        }

        // Create service center
        const newSC = {
            name: `Test SC ${Date.now()}`,
            code: `TST${Date.now().toString().slice(-6)}`,
            address: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            pinCode: '123456',
            phone: '+91-9999999999',
            email: `test${Date.now()}@test.com`,
            capacity: 20,
            technicianCount: 5,
            serviceTypes: ['Routine Maintenance', 'Repair']
        };

        await testEndpoint(
            'Create new service center',
            'POST',
            '/service-centers',
            201,
            newSC
        );
        await sleep(500);
    }

    // ============================================================================
    // 4. USERS
    // ============================================================================
    log('\n👥 Users Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all users
        const usersResponse = await testEndpoint(
            'Get all users',
            'GET',
            '/users?page=1&limit=10',
            200
        );

        if (usersResponse && usersResponse.data.data && usersResponse.data.data.length > 0) {
            testUserId = usersResponse.data.data[0].id;
            log(`  Using user ID: ${testUserId}`, colors.cyan);
        }

        await sleep(500);

        // Get user by ID
        if (testUserId) {
            await testEndpoint(
                'Get user by ID',
                'GET',
                `/users/${testUserId}`,
                200
            );
            await sleep(500);
        }

        // Filter users by role
        await testEndpoint(
            'Filter users by role',
            'GET',
            '/users?role=admin&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 5. CUSTOMERS
    // ============================================================================
    log('\n👤 Customers Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all customers
        const customersResponse = await testEndpoint(
            'Get all customers',
            'GET',
            '/customers?page=1&limit=10',
            200
        );

        if (customersResponse && customersResponse.data.data && customersResponse.data.data.length > 0) {
            testCustomerId = customersResponse.data.data[0].id;
            log(`  Using customer ID: ${testCustomerId}`, colors.cyan);
        }

        await sleep(500);

        // Get customer by ID
        if (testCustomerId) {
            await testEndpoint(
                'Get customer by ID',
                'GET',
                `/customers/${testCustomerId}`,
                200
            );
            await sleep(500);
        }

        // Search customers
        await testEndpoint(
            'Search customers',
            'GET',
            '/customers?search=test&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 6. VEHICLES
    // ============================================================================
    log('\n🚗 Vehicles Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all vehicles
        const vehiclesResponse = await testEndpoint(
            'Get all vehicles',
            'GET',
            '/vehicles?page=1&limit=10',
            200
        );

        if (vehiclesResponse && vehiclesResponse.data.data && vehiclesResponse.data.data.length > 0) {
            testVehicleId = vehiclesResponse.data.data[0].id;
            log(`  Using vehicle ID: ${testVehicleId}`, colors.cyan);
        }

        await sleep(500);

        // Get vehicle by ID
        if (testVehicleId) {
            await testEndpoint(
                'Get vehicle by ID',
                'GET',
                `/vehicles/${testVehicleId}`,
                200
            );
            await sleep(500);
        }

        // Search vehicles by registration
        await testEndpoint(
            'Search vehicles',
            'GET',
            '/vehicles?search=test&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 7. APPOINTMENTS
    // ============================================================================
    log('\n📅 Appointments Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all appointments
        await testEndpoint(
            'Get all appointments',
            'GET',
            '/appointments?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter appointments by status
        await testEndpoint(
            'Filter appointments by status',
            'GET',
            '/appointments?status=PENDING&page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter by service center
        if (testServiceCenterId) {
            await testEndpoint(
                'Filter appointments by service center',
                'GET',
                `/appointments?serviceCenterId=${testServiceCenterId}&page=1&limit=10`,
                200
            );
            await sleep(500);
        }
    }

    // ============================================================================
    // 8. JOB CARDS
    // ============================================================================
    log('\n📋 Job Cards Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all job cards
        await testEndpoint(
            'Get all job cards',
            'GET',
            '/job-cards?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter job cards by status
        await testEndpoint(
            'Filter job cards by status',
            'GET',
            '/job-cards?status=CREATED&page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter by service center
        if (testServiceCenterId) {
            await testEndpoint(
                'Filter job cards by service center',
                'GET',
                `/job-cards?serviceCenterId=${testServiceCenterId}&page=1&limit=10`,
                200
            );
            await sleep(500);
        }
    }

    // ============================================================================
    // 9. QUOTATIONS
    // ============================================================================
    log('\n💰 Quotations Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all quotations
        await testEndpoint(
            'Get all quotations',
            'GET',
            '/quotations?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter quotations by status
        await testEndpoint(
            'Filter quotations by status',
            'GET',
            '/quotations?status=DRAFT&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 10. INVOICES
    // ============================================================================
    log('\n🧾 Invoices Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all invoices
        await testEndpoint(
            'Get all invoices',
            'GET',
            '/invoices?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter invoices by status
        await testEndpoint(
            'Filter invoices by status',
            'GET',
            '/invoices?status=UNPAID&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 11. INVENTORY
    // ============================================================================
    log('\n📦 Inventory Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get central inventory
        await testEndpoint(
            'Get central inventory',
            'GET',
            '/central-inventory?page=1&limit=10',
            200
        );
        await sleep(500);

        // Get service center inventory
        if (testServiceCenterId) {
            await testEndpoint(
                'Get service center inventory',
                'GET',
                `/inventory?serviceCenterId=${testServiceCenterId}&page=1&limit=10`,
                200
            );
            await sleep(500);
        }

        // Search inventory
        await testEndpoint(
            'Search inventory',
            'GET',
            '/inventory?search=test&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 12. PARTS ISSUES
    // ============================================================================
    log('\n🔧 Parts Issues Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all parts issues
        await testEndpoint(
            'Get all parts issues',
            'GET',
            '/parts-issues?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter by status
        await testEndpoint(
            'Filter parts issues by status',
            'GET',
            '/parts-issues?status=PENDING_APPROVAL&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 13. PURCHASE ORDERS
    // ============================================================================
    log('\n📝 Purchase Orders Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all purchase orders
        await testEndpoint(
            'Get all purchase orders',
            'GET',
            '/purchase-orders?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter by status
        await testEndpoint(
            'Filter purchase orders by status',
            'GET',
            '/purchase-orders?status=DRAFT&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 14. LEADS
    // ============================================================================
    log('\n🎯 Leads Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get all leads
        await testEndpoint(
            'Get all leads',
            'GET',
            '/leads?page=1&limit=10',
            200
        );
        await sleep(500);

        // Filter by status
        await testEndpoint(
            'Filter leads by status',
            'GET',
            '/leads?status=NEW&page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 15. ANALYTICS
    // ============================================================================
    log('\n📊 Analytics Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get analytics overview
        await testEndpoint(
            'Get analytics overview',
            'GET',
            '/analytics/overview',
            200
        );
        await sleep(500);

        // Get revenue analytics
        await testEndpoint(
            'Get revenue analytics',
            'GET',
            '/analytics/revenue?period=month',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // 16. FILES
    // ============================================================================
    log('\n📁 Files Tests', colors.bright + colors.magenta);
    log('-'.repeat(80), colors.magenta);

    if (authToken) {
        // Get files
        await testEndpoint(
            'Get files',
            'GET',
            '/files?page=1&limit=10',
            200
        );
        await sleep(500);
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    log('\n' + '='.repeat(80), colors.bright);
    log('Test Results Summary', colors.bright + colors.cyan);
    log('='.repeat(80), colors.bright);

    log(`\nTotal Tests: ${results.total}`, colors.bright);
    log(`Passed: ${results.passed}`, colors.green);
    log(`Failed: ${results.failed}`, colors.red);
    log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`,
        results.failed === 0 ? colors.green : colors.yellow);

    log(`\nCompleted at: ${new Date().toISOString()}`, colors.yellow);
    log('\n' + '='.repeat(80) + '\n', colors.bright);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
    log(`\n❌ Fatal Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});

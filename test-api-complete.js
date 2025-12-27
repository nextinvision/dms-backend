/**
 * DMS Backend API Comprehensive Test Suite
 * Tests all endpoints on the deployed backend at https://dms-backend-um2e.onrender.com
 * 
 * Response Structure:
 * {
 *   data: { ... },
 *   success: true,
 *   meta: { timestamp, requestId },
 *   pagination: { ... } // for list endpoints
 * }
 */

const BASE_URL = 'https://dms-backend-um2e.onrender.com/api';

// Test credentials
const credentials = {
    email: 'admin@dms.com',
    password: 'admin123'
};

// Test state
let authToken = null;
let testIds = {
    serviceCenter: null,
    user: null,
    customer: null,
    vehicle: null,
    appointment: null,
    jobCard: null,
    quotation: null,
    invoice: null,
    lead: null,
    centralInventory: null,
    partsIssue: null,
    purchaseOrder: null
};

// Test results
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Colors
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

/**
 * Make HTTP request
 */
async function request(method, path, body = null, useAuth = true) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (useAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${BASE_URL}${path}`, options);
        const data = await response.json().catch(() => ({}));

        return {
            status: response.status,
            ok: response.ok,
            data: data.data || data,
            pagination: data.pagination,
            success: data.success,
            meta: data.meta
        };
    } catch (error) {
        return { status: 0, ok: false, error: error.message };
    }
}

/**
 * Test endpoint
 */
async function test(name, method, path, expectedStatus = 200, body = null, useAuth = true) {
    results.total++;
    const result = await request(method, path, body, useAuth);
    const passed = result.status === expectedStatus;

    if (passed) {
        results.passed++;
        console.log(`${c.green}✓${c.reset} ${name}`);
    } else {
        results.failed++;
        console.log(`${c.red}✗${c.reset} ${name} (${result.status} vs ${expectedStatus})`);
    }

    results.tests.push({ name, passed, status: result.status, expected: expectedStatus });
    return result;
}

/**
 * Section header
 */
function section(title, icon = '📦') {
    console.log(`\n${c.bright}${c.magenta}${icon} ${title}${c.reset}`);
    console.log(c.magenta + '-'.repeat(80) + c.reset);
}

/**
 * Info message
 */
function info(message) {
    console.log(`${c.cyan}  ℹ ${message}${c.reset}`);
}

/**
 * Main test suite
 */
async function runTests() {
    console.log('\n' + c.bright + '='.repeat(80) + c.reset);
    console.log(c.bright + c.cyan + 'DMS Backend API Comprehensive Test Suite' + c.reset);
    console.log(c.bright + '='.repeat(80) + c.reset);
    console.log(`${c.yellow}Base URL: ${BASE_URL}${c.reset}`);
    console.log(`${c.yellow}Started: ${new Date().toISOString()}${c.reset}\n`);

    // ============================================================================
    // 1. AUTHENTICATION
    // ============================================================================
    section('Authentication', '🔐');

    const loginResult = await test('Login', 'POST', '/auth/login', 201, credentials, false);

    if (loginResult.ok && loginResult.data.access_token) {
        authToken = loginResult.data.access_token;
        info(`Token acquired: ${authToken.substring(0, 40)}...`);

        await test('Get current user', 'GET', '/auth/me', 200);
    } else {
        console.log(`\n${c.red}❌ Authentication failed - cannot continue${c.reset}`);
        printSummary();
        return;
    }

    // ============================================================================
    // 2. SERVICE CENTERS
    // ============================================================================
    section('Service Centers', '🏢');

    const scList = await test('List service centers', 'GET', '/service-centers?page=1&limit=5', 200);
    if (scList.ok && scList.data.data && scList.data.data.length > 0) {
        testIds.serviceCenter = scList.data.data[0].id;
        info(`Using service center: ${testIds.serviceCenter}`);

        await test('Get service center by ID', 'GET', `/service-centers/${testIds.serviceCenter}`, 200);
    }

    await test('Search service centers', 'GET', '/service-centers?search=test&page=1&limit=5', 200);
    await test('Filter by status', 'GET', '/service-centers?status=Active&page=1&limit=5', 200);

    // ============================================================================
    // 3. USERS
    // ============================================================================
    section('Users', '👥');

    const usersList = await test('List users', 'GET', '/users?page=1&limit=5', 200);
    if (usersList.ok && usersList.data.data && usersList.data.data.length > 0) {
        testIds.user = usersList.data.data[0].id;
        info(`Using user: ${testIds.user}`);

        await test('Get user by ID', 'GET', `/users/${testIds.user}`, 200);
    }

    await test('Filter users by role', 'GET', '/users?role=admin&page=1&limit=5', 200);
    await test('Search users', 'GET', '/users?search=admin&page=1&limit=5', 200);

    // ============================================================================
    // 4. CUSTOMERS
    // ============================================================================
    section('Customers', '👤');

    const customersList = await test('List customers', 'GET', '/customers?page=1&limit=5', 200);
    if (customersList.ok && customersList.data.data && customersList.data.data.length > 0) {
        testIds.customer = customersList.data.data[0].id;
        info(`Using customer: ${testIds.customer}`);

        await test('Get customer by ID', 'GET', `/customers/${testIds.customer}`, 200);
    }

    await test('Search customers', 'GET', '/customers/search?query=test', 200);
    await test('Filter customers', 'GET', '/customers?search=test&page=1&limit=5', 200);

    // ============================================================================
    // 5. VEHICLES
    // ============================================================================
    section('Vehicles', '🚗');

    const vehiclesList = await test('List vehicles', 'GET', '/vehicles?page=1&limit=5', 200);
    if (vehiclesList.ok && vehiclesList.data.data && vehiclesList.data.data.length > 0) {
        testIds.vehicle = vehiclesList.data.data[0].id;
        info(`Using vehicle: ${testIds.vehicle}`);

        await test('Get vehicle by ID', 'GET', `/vehicles/${testIds.vehicle}`, 200);
        await test('Get vehicle service history', 'GET', `/vehicles/${testIds.vehicle}/service-history`, 200);
    }

    await test('Search vehicles', 'GET', '/vehicles?search=test&page=1&limit=5', 200);

    // ============================================================================
    // 6. APPOINTMENTS
    // ============================================================================
    section('Appointments', '📅');

    const appointmentsList = await test('List appointments', 'GET', '/appointments?page=1&limit=5', 200);
    if (appointmentsList.ok && appointmentsList.data.data && appointmentsList.data.data.length > 0) {
        testIds.appointment = appointmentsList.data.data[0].id;
        info(`Using appointment: ${testIds.appointment}`);

        await test('Get appointment by ID', 'GET', `/appointments/${testIds.appointment}`, 200);
    }

    await test('Filter by status', 'GET', '/appointments?status=PENDING&page=1&limit=5', 200);
    await test('Filter by date', 'GET', '/appointments?dateFrom=2024-01-01&dateTo=2024-12-31&page=1&limit=5', 200);

    if (testIds.serviceCenter) {
        await test('Filter by service center', 'GET', `/appointments?serviceCenterId=${testIds.serviceCenter}&page=1&limit=5`, 200);
    }

    // ============================================================================
    // 7. JOB CARDS
    // ============================================================================
    section('Job Cards', '📋');

    const jobCardsList = await test('List job cards', 'GET', '/job-cards?page=1&limit=5', 200);
    if (jobCardsList.ok && jobCardsList.data.data && jobCardsList.data.data.length > 0) {
        testIds.jobCard = jobCardsList.data.data[0].id;
        info(`Using job card: ${testIds.jobCard}`);

        await test('Get job card by ID', 'GET', `/job-cards/${testIds.jobCard}`, 200);
    }

    await test('Filter by status', 'GET', '/job-cards?status=CREATED&page=1&limit=5', 200);
    await test('Filter temporary job cards', 'GET', '/job-cards?isTemporary=true&page=1&limit=5', 200);

    if (testIds.serviceCenter) {
        await test('Filter by service center', 'GET', `/job-cards?serviceCenterId=${testIds.serviceCenter}&page=1&limit=5`, 200);
    }

    // ============================================================================
    // 8. QUOTATIONS
    // ============================================================================
    section('Quotations', '💰');

    const quotationsList = await test('List quotations', 'GET', '/quotations?page=1&limit=5', 200);
    if (quotationsList.ok && quotationsList.data.data && quotationsList.data.data.length > 0) {
        testIds.quotation = quotationsList.data.data[0].id;
        info(`Using quotation: ${testIds.quotation}`);

        await test('Get quotation by ID', 'GET', `/quotations/${testIds.quotation}`, 200);
    }

    await test('Filter by status', 'GET', '/quotations?status=DRAFT&page=1&limit=5', 200);

    if (testIds.serviceCenter) {
        await test('Filter by service center', 'GET', `/quotations?serviceCenterId=${testIds.serviceCenter}&page=1&limit=5`, 200);
    }

    // ============================================================================
    // 9. INVOICES
    // ============================================================================
    section('Invoices', '🧾');

    const invoicesList = await test('List invoices', 'GET', '/invoices?page=1&limit=5', 200);
    if (invoicesList.ok && invoicesList.data.data && invoicesList.data.data.length > 0) {
        testIds.invoice = invoicesList.data.data[0].id;
        info(`Using invoice: ${testIds.invoice}`);

        await test('Get invoice by ID', 'GET', `/invoices/${testIds.invoice}`, 200);
    }

    await test('Filter by status', 'GET', '/invoices?status=UNPAID&page=1&limit=5', 200);

    if (testIds.serviceCenter) {
        await test('Filter by service center', 'GET', `/invoices?serviceCenterId=${testIds.serviceCenter}&page=1&limit=5`, 200);
    }

    // ============================================================================
    // 10. INVENTORY (Central)
    // ============================================================================
    section('Central Inventory', '📦');

    const centralInvList = await test('List central inventory', 'GET', '/central-inventory?page=1&limit=5', 200);
    if (centralInvList.ok && centralInvList.data.data && centralInvList.data.data.length > 0) {
        testIds.centralInventory = centralInvList.data.data[0].id;
        info(`Using central inventory: ${testIds.centralInventory}`);

        await test('Get central inventory by ID', 'GET', `/central-inventory/${testIds.centralInventory}`, 200);
    }

    await test('Search central inventory', 'GET', '/central-inventory?search=test&page=1&limit=5', 200);

    // ============================================================================
    // 11. INVENTORY (Service Center)
    // ============================================================================
    section('Service Center Inventory', '🔧');

    await test('List SC inventory', 'GET', '/inventory?page=1&limit=5', 200);
    await test('Get low stock items', 'GET', '/inventory/low-stock', 200);

    if (testIds.serviceCenter) {
        await test('Filter by service center', 'GET', `/inventory?serviceCenterId=${testIds.serviceCenter}&page=1&limit=5`, 200);
    }

    // ============================================================================
    // 12. PARTS ISSUES
    // ============================================================================
    section('Parts Issues', '🔩');

    const partsIssuesList = await test('List parts issues', 'GET', '/parts-issues?page=1&limit=5', 200);
    if (partsIssuesList.ok && partsIssuesList.data.data && partsIssuesList.data.data.length > 0) {
        testIds.partsIssue = partsIssuesList.data.data[0].id;
        info(`Using parts issue: ${testIds.partsIssue}`);

        await test('Get parts issue by ID', 'GET', `/parts-issues/${testIds.partsIssue}`, 200);
    }

    await test('Filter by status', 'GET', '/parts-issues?status=PENDING_APPROVAL&page=1&limit=5', 200);

    // ============================================================================
    // 13. PURCHASE ORDERS
    // ============================================================================
    section('Purchase Orders', '📝');

    const poList = await test('List purchase orders', 'GET', '/purchase-orders?page=1&limit=5', 200);
    if (poList.ok && poList.data.data && poList.data.data.length > 0) {
        testIds.purchaseOrder = poList.data.data[0].id;
        info(`Using purchase order: ${testIds.purchaseOrder}`);

        await test('Get purchase order by ID', 'GET', `/purchase-orders/${testIds.purchaseOrder}`, 200);
    }

    await test('Filter by status', 'GET', '/purchase-orders?status=DRAFT&page=1&limit=5', 200);

    // ============================================================================
    // 14. LEADS
    // ============================================================================
    section('Leads', '🎯');

    const leadsList = await test('List leads', 'GET', '/leads?page=1&limit=5', 200);
    if (leadsList.ok && leadsList.data.data && leadsList.data.data.length > 0) {
        testIds.lead = leadsList.data.data[0].id;
        info(`Using lead: ${testIds.lead}`);

        await test('Get lead by ID', 'GET', `/leads/${testIds.lead}`, 200);
    }

    await test('Filter by status', 'GET', '/leads?status=NEW&page=1&limit=5', 200);
    await test('Search leads', 'GET', '/leads?search=test&page=1&limit=5', 200);

    // ============================================================================
    // 15. ANALYTICS
    // ============================================================================
    section('Analytics', '📊');

    await test('Get dashboard analytics', 'GET', '/analytics/dashboard', 200);
    await test('Get revenue analytics', 'GET', '/analytics/revenue', 200);

    // ============================================================================
    // 16. FILES
    // ============================================================================
    section('Files', '📁');

    await test('List files', 'GET', '/files?page=1&limit=5', 200);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    printSummary();
}

/**
 * Print test summary
 */
function printSummary() {
    console.log('\n' + c.bright + '='.repeat(80) + c.reset);
    console.log(c.bright + c.cyan + 'Test Results Summary' + c.reset);
    console.log(c.bright + '='.repeat(80) + c.reset);

    const successRate = ((results.passed / results.total) * 100).toFixed(2);

    console.log(`\n${c.bright}Total Tests: ${results.total}${c.reset}`);
    console.log(`${c.green}Passed: ${results.passed}${c.reset}`);
    console.log(`${c.red}Failed: ${results.failed}${c.reset}`);
    console.log(`${c.yellow}Success Rate: ${successRate}%${c.reset}`);

    if (results.failed > 0) {
        console.log(`\n${c.red}${c.bright}Failed Tests:${c.reset}`);
        results.tests
            .filter(t => !t.passed)
            .forEach(t => {
                console.log(`  ${c.red}✗${c.reset} ${t.name} (${t.status} vs ${t.expected})`);
            });
    }

    console.log(`\n${c.yellow}Completed: ${new Date().toISOString()}${c.reset}`);
    console.log(c.bright + '='.repeat(80) + c.reset + '\n');

    // Exit code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error(`\n${c.red}${c.bright}❌ Fatal Error:${c.reset}`, error.message);
    console.error(error);
    process.exit(1);
});

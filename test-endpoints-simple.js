/**
 * Quick Backend API Test Script
 * Tests critical endpoints on deployed backend
 */

const BASE_URL = 'https://dms-backend-um2e.onrender.com/api';

// Test credentials
const credentials = {
    email: 'admin@dms.com',
    password: 'admin123'
};

let authToken = null;
let testResults = [];

// Helper to make requests
async function testEndpoint(name, method, path, body = null, useAuth = true) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (useAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${path}`, options);
        const data = await response.json().catch(() => ({}));

        const result = {
            name,
            method,
            path,
            status: response.status,
            ok: response.ok,
            data: data
        };

        testResults.push(result);

        const icon = response.ok ? '✓' : '✗';
        const color = response.ok ? '\x1b[32m' : '\x1b[31m';
        console.log(`${color}${icon}\x1b[0m ${name} - ${method} ${path} → ${response.status}`);

        return result;
    } catch (error) {
        const result = {
            name,
            method,
            path,
            status: 0,
            ok: false,
            error: error.message
        };
        testResults.push(result);
        console.log(`\x1b[31m✗\x1b[0m ${name} - Error: ${error.message}`);
        return result;
    }
}

// Main test function
async function runTests() {
    console.log('\n' + '='.repeat(80));
    console.log('DMS Backend API Test Suite');
    console.log('='.repeat(80));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    // 1. Health Check
    console.log('\n📡 Health Check');
    console.log('-'.repeat(80));
    await testEndpoint('Health Check', 'GET', '/health', null, false);

    // 2. Authentication
    console.log('\n🔐 Authentication');
    console.log('-'.repeat(80));
    const loginResult = await testEndpoint('Login', 'POST', '/auth/login', credentials, false);

    if (loginResult.ok && loginResult.data.access_token) {
        authToken = loginResult.data.access_token;
        console.log(`  ✓ Token acquired: ${authToken.substring(0, 30)}...`);
    } else {
        console.log('  ✗ Authentication failed - skipping authenticated tests');
        console.log('  Response:', JSON.stringify(loginResult.data, null, 2));
        printSummary();
        return;
    }

    await testEndpoint('Get Current User', 'GET', '/auth/me');

    // 3. Service Centers
    console.log('\n🏢 Service Centers');
    console.log('-'.repeat(80));
    const scResult = await testEndpoint('List Service Centers', 'GET', '/service-centers?page=1&limit=5');

    let serviceCenterId = null;
    if (scResult.ok && scResult.data.data && scResult.data.data.length > 0) {
        serviceCenterId = scResult.data.data[0].id;
        console.log(`  ✓ Found service center: ${serviceCenterId}`);
        await testEndpoint('Get Service Center Details', 'GET', `/service-centers/${serviceCenterId}`);
        await testEndpoint('Get Service Center Stats', 'GET', `/service-centers/${serviceCenterId}/stats`);
    }

    // 4. Users
    console.log('\n👥 Users');
    console.log('-'.repeat(80));
    const usersResult = await testEndpoint('List Users', 'GET', '/users?page=1&limit=5');

    if (usersResult.ok && usersResult.data.data && usersResult.data.data.length > 0) {
        const userId = usersResult.data.data[0].id;
        await testEndpoint('Get User Details', 'GET', `/users/${userId}`);
    }

    // 5. Customers
    console.log('\n👤 Customers');
    console.log('-'.repeat(80));
    const customersResult = await testEndpoint('List Customers', 'GET', '/customers?page=1&limit=5');

    if (customersResult.ok && customersResult.data.data && customersResult.data.data.length > 0) {
        const customerId = customersResult.data.data[0].id;
        await testEndpoint('Get Customer Details', 'GET', `/customers/${customerId}`);
    }

    // 6. Vehicles
    console.log('\n🚗 Vehicles');
    console.log('-'.repeat(80));
    const vehiclesResult = await testEndpoint('List Vehicles', 'GET', '/vehicles?page=1&limit=5');

    if (vehiclesResult.ok && vehiclesResult.data.data && vehiclesResult.data.data.length > 0) {
        const vehicleId = vehiclesResult.data.data[0].id;
        await testEndpoint('Get Vehicle Details', 'GET', `/vehicles/${vehicleId}`);
    }

    // 7. Appointments
    console.log('\n📅 Appointments');
    console.log('-'.repeat(80));
    await testEndpoint('List Appointments', 'GET', '/appointments?page=1&limit=5');
    await testEndpoint('Filter Appointments (PENDING)', 'GET', '/appointments?status=PENDING&page=1&limit=5');

    // 8. Job Cards
    console.log('\n📋 Job Cards');
    console.log('-'.repeat(80));
    await testEndpoint('List Job Cards', 'GET', '/job-cards?page=1&limit=5');
    await testEndpoint('Filter Job Cards (CREATED)', 'GET', '/job-cards?status=CREATED&page=1&limit=5');

    // 9. Quotations
    console.log('\n💰 Quotations');
    console.log('-'.repeat(80));
    await testEndpoint('List Quotations', 'GET', '/quotations?page=1&limit=5');

    // 10. Invoices
    console.log('\n🧾 Invoices');
    console.log('-'.repeat(80));
    await testEndpoint('List Invoices', 'GET', '/invoices?page=1&limit=5');

    // 11. Inventory
    console.log('\n📦 Inventory');
    console.log('-'.repeat(80));
    await testEndpoint('List Central Inventory', 'GET', '/central-inventory?page=1&limit=5');
    if (serviceCenterId) {
        await testEndpoint('List SC Inventory', 'GET', `/inventory?serviceCenterId=${serviceCenterId}&page=1&limit=5`);
    }

    // 12. Parts Issues
    console.log('\n🔧 Parts Issues');
    console.log('-'.repeat(80));
    await testEndpoint('List Parts Issues', 'GET', '/parts-issues?page=1&limit=5');

    // 13. Purchase Orders
    console.log('\n📝 Purchase Orders');
    console.log('-'.repeat(80));
    await testEndpoint('List Purchase Orders', 'GET', '/purchase-orders?page=1&limit=5');

    // 14. Leads
    console.log('\n🎯 Leads');
    console.log('-'.repeat(80));
    await testEndpoint('List Leads', 'GET', '/leads?page=1&limit=5');

    // 15. Analytics
    console.log('\n📊 Analytics');
    console.log('-'.repeat(80));
    await testEndpoint('Analytics Overview', 'GET', '/analytics/overview');

    // Print summary
    printSummary();
}

function printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('Test Results Summary');
    console.log('='.repeat(80));

    const total = testResults.length;
    const passed = testResults.filter(r => r.ok).length;
    const failed = total - passed;
    const successRate = ((passed / total) * 100).toFixed(2);

    console.log(`\nTotal Tests: ${total}`);
    console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
    console.log(`Success Rate: ${successRate}%`);

    if (failed > 0) {
        console.log('\n\x1b[31mFailed Tests:\x1b[0m');
        testResults.filter(r => !r.ok).forEach(r => {
            console.log(`  - ${r.name} (${r.method} ${r.path}) → ${r.status || 'Error'}`);
            if (r.error) console.log(`    Error: ${r.error}`);
        });
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
}

// Run tests
runTests().catch(error => {
    console.error('\n\x1b[31m❌ Fatal Error:\x1b[0m', error.message);
    console.error(error);
    process.exit(1);
});

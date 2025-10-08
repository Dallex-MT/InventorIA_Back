const http = require('http');
const { parse } = require('url');

// Cookie storage
let cookies = '';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: options.hostname,
      port: options.port,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies }),
        ...(data && { 'Content-Length': Buffer.byteLength(data) })
      }
    };

    const req = http.request(reqOptions, (res) => {
      // Store cookies from response
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'][0].split(';')[0];
        console.log('🍪 Cookie stored:', cookies);
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testCookieAuth() {
  try {
    console.log('🧪 Testing Cookie-based Authentication\n');

    // Test 1: Register
    console.log('1️⃣ Testing Registration...');
    const registerData = JSON.stringify({
      nombre_usuario: 'cookietest',
      correo: 'cookietest@example.com',
      password: 'Password123!',
      rol_id: 1
    });
    
    const registerRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST'
    }, registerData);
    
    console.log('Registration Status:', registerRes.status);
    console.log('Registration Response:', JSON.parse(registerRes.body));
    console.log('');

    // Test 2: Login
    console.log('2️⃣ Testing Login...');
    const loginData = JSON.stringify({
      correo: 'cookietest@example.com',
      password: 'Password123!'
    });
    
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST'
    }, loginData);
    
    console.log('Login Status:', loginRes.status);
    console.log('Login Response:', JSON.parse(loginRes.body));
    console.log('');

    // Test 3: Get current user (requires auth)
    console.log('3️⃣ Testing Get Current User...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/me',
      method: 'GET'
    });
    
    console.log('Get User Status:', meRes.status);
    console.log('Get User Response:', JSON.parse(meRes.body));
    console.log('');

    // Test 4: Update profile (requires auth)
    console.log('4️⃣ Testing Profile Update...');
    const updateData = JSON.stringify({
      nombre_usuario: 'updatedcookietest'
    });
    
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/profile',
      method: 'PUT'
    }, updateData);
    
    console.log('Update Status:', updateRes.status);
    console.log('Update Response:', JSON.parse(updateRes.body));
    console.log('');

    // Test 5: Logout
    console.log('5️⃣ Testing Logout...');
    const logoutRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/logout',
      method: 'POST'
    }, '{}');
    
    console.log('Logout Status:', logoutRes.status);
    console.log('Logout Response:', JSON.parse(logoutRes.body));
    console.log('');

    // Test 6: Try to access protected endpoint after logout
    console.log('6️⃣ Testing Access After Logout...');
    const afterLogoutRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/me',
      method: 'GET'
    });
    
    console.log('After Logout Status:', afterLogoutRes.status);
    console.log('After Logout Response:', JSON.parse(afterLogoutRes.body));

    console.log('\n✅ Cookie-based authentication test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCookieAuth();
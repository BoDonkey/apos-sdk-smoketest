// Authentication API Test Suite for ApostropheCMS SDK
// This test suite covers authentication endpoints with simple, verbose tests
// Tests use API key for validation but also test username/password login flows
require('dotenv').config();
const { AuthenticationApi, Configuration } = require('apostrophecms-client');

// Configure the API client
const configuration = new Configuration({
  basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1',
  apiKey: process.env.APOSTROPHE_API_KEY
});

// Validate that we have the required environment variables
if (!process.env.APOSTROPHE_API_KEY) {
  console.error('❌ Error: APOSTROPHE_API_KEY is required in .env file');
  console.log('Please create a .env file with:');
  console.log('APOSTROPHE_API_KEY=your-api-key-here');
  console.log('APOSTROPHE_BASE_URL=http://localhost:3000/api/v1  # Optional, defaults to localhost');
  console.log('');
  console.log('For login tests, also add:');
  console.log('APOSTROPHE_USERNAME=your-test-username');
  console.log('APOSTROPHE_PASSWORD=your-test-password');
  process.exit(1);
}

const authApi = new AuthenticationApi(configuration);

// Helper function to log test results
function logTest(testName, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

// Helper function to wait between tests
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAuthenticationTests() {
  console.log('🚀 Starting ApostropheCMS Authentication API Tests');
  console.log('===============================================\n');

  let bearerToken = null; // Will store bearer token from login test

  try {
    // Test 1: Get authentication context (POST method - recommended)
    console.log('📄 Test 1: Get Authentication Context (authContextPost)');
    try {
      const { status, data } = await authApi.authContextPost();

      if (status === 200 && data) {
        logTest('Get authentication context', true, 'Retrieved login context information');
        console.log('   Available context fields:');
        if (data.site) console.log(`   - Site: ${data.site.title || 'Available'}`);
        if (data.passwordReset !== undefined) console.log(`   - Password reset enabled: ${data.passwordReset}`);
        if (data.localLogin !== undefined) console.log(`   - Local login enabled: ${data.localLogin}`);
        if (data.totp !== undefined) console.log(`   - TOTP available: ${data.totp}`);

        // Log any other interesting context data
        const otherKeys = Object.keys(data).filter(key =>
          !['site', 'passwordReset', 'localLogin', 'totp'].includes(key)
        );
        if (otherKeys.length > 0) {
          console.log(`   - Other context: ${otherKeys.join(', ')}`);
        }
      } else {
        logTest('Get authentication context', false, 'Unexpected response structure');
      }
    } catch (error) {
      logTest('Get authentication context', false, error.message);
    }

    await wait(500);

    // Test 2: Test the deprecated GET context endpoint for comparison
    console.log('\n📄 Test 2: Get Authentication Context (authContext - deprecated GET)');
    try {
      const { status, data } = await authApi.authContext();

      if (status === 200 && data) {
        logTest('Get authentication context (GET)', true, '⚠️ Deprecated endpoint still working');
        console.log('   ℹ️ This GET endpoint is deprecated due to caching issues');
      } else {
        logTest('Get authentication context (GET)', false, 'Deprecated endpoint failed');
      }
    } catch (error) {
      logTest('Get authentication context (GET)', false, `Deprecated endpoint error: ${error.message}`);
    }

    await wait(500);

    // Test 3: Check current authentication status using API key (POST method)
    console.log('\n📄 Test 3: Who Am I - Check Current User (authWhoAmIPost)');
    try {
      const { status, data } = await authApi.authWhoAmIPost();

      if (status === 200 && data) {
        logTest('Check current user (API key)', true, `Authenticated as user with API key`);
        console.log(`   User ID: ${data._id || 'Not provided'}`);
        console.log(`   Username: ${data.username || 'Not provided'}`);
        console.log(`   Title: ${data.title || 'Not provided'}`);
        console.log(`   Email: ${data.email || 'Not provided'}`);

        // Log available user fields
        const userFields = Object.keys(data).filter(key =>
          !['_id', 'username', 'title', 'email'].includes(key)
        );
        if (userFields.length > 0) {
          console.log(`   Other user fields: ${userFields.join(', ')}`);
        }
      } else {
        logTest('Check current user (API key)', false, 'Could not retrieve user information');
      }
    } catch (error) {
      logTest('Check current user (API key)', false, error.message);
    }

    await wait(500);

    // Test 4: Test the deprecated GET whoami endpoint for comparison  
    console.log('\n📄 Test 4: Who Am I - Check Current User (authWhoAmI - deprecated GET)');
    try {
      const { status, data } = await authApi.authWhoAmI();

      if (status === 200 && data) {
        logTest('Check current user (GET)', true, '⚠️ Deprecated GET endpoint still working');
        console.log('   ℹ️ This GET endpoint is deprecated due to caching issues');
      } else {
        logTest('Check current user (GET)', false, 'Deprecated endpoint failed');
      }
    } catch (error) {
      logTest('Check current user (GET)', false, `Deprecated endpoint error: ${error.message}`);
    }

    await wait(500);

    // Test 5: Test username/password login (if credentials provided)
    console.log('\n📄 Test 5: Username/Password Login (authLogin)');
    if (process.env.APOSTROPHE_USERNAME && process.env.APOSTROPHE_PASSWORD) {
      try {
        const loginData = {
          username: process.env.APOSTROPHE_USERNAME,
          password: process.env.APOSTROPHE_PASSWORD,
          session: false // Request bearer token instead of session cookie
        };

        // Create a new API instance without API key for login test
        const loginConfiguration = new Configuration({
          basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1'
        });
        const loginAuthApi = new AuthenticationApi(loginConfiguration);

        const { status, data } = await loginAuthApi.authLogin(loginData);

        if (status === 200 && data) {
          logTest('Username/password login', true, 'Login successful');

          if (data.token) {
            bearerToken = data.token;
            console.log(`   Bearer token received: ${data.token.substring(0, 20)}...`);
          }

          if (data.user) {
            console.log(`   Logged in as: ${data.user.username || data.user.title || 'User'}`);
          }

          // Log other response fields
          const otherFields = Object.keys(data).filter(key =>
            !['token', 'user'].includes(key)
          );
          if (otherFields.length > 0) {
            console.log(`   Other response fields: ${otherFields.join(', ')}`);
          }
        } else {
          logTest('Username/password login', false, 'Login failed or unexpected response');
        }
      } catch (error) {
        logTest('Username/password login', false, error.message);
        console.log('   💡 Ensure username/password are correct and user has API access');
      }
    } else {
      logTest('Username/password login', false, 'No credentials provided in environment variables');
      console.log('   💡 Add APOSTROPHE_USERNAME and APOSTROPHE_PASSWORD to .env to test login');
    }

    await wait(500);

    // Test 6: Test session-based login (if credentials provided)
    console.log('\n📄 Test 6: Session-Based Login (authLogin with session=true)');
    if (process.env.APOSTROPHE_USERNAME && process.env.APOSTROPHE_PASSWORD) {
      try {
        const sessionLoginData = {
          username: process.env.APOSTROPHE_USERNAME,
          password: process.env.APOSTROPHE_PASSWORD,
          session: true // Request session cookie instead of bearer token
        };

        // Create a new API instance without API key for session login test
        const sessionConfiguration = new Configuration({
          basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1'
        });
        const sessionAuthApi = new AuthenticationApi(sessionConfiguration);

        const { status, data } = await sessionAuthApi.authLogin(sessionLoginData);

        if (status === 200 && data) {
          logTest('Session-based login', true, 'Session login successful');

          if (data.user) {
            console.log(`   Logged in as: ${data.user.username || data.user.title || 'User'}`);
          }

          // Note about session cookies
          console.log('   ℹ️ Session cookie should be set in response headers');
          console.log('   ℹ️ Subsequent requests should include credentials: "include"');

          // Check if token is NOT provided (since we requested session)
          if (!data.token) {
            console.log('   ✅ Correctly no bearer token provided for session-based auth');
          } else {
            console.log('   ⚠️ Bearer token provided even though session=true was requested');
          }
        } else {
          logTest('Session-based login', false, 'Session login failed');
        }
      } catch (error) {
        logTest('Session-based login', false, error.message);
      }
    } else {
      logTest('Session-based login', false, 'No credentials provided in environment variables');
      console.log('   💡 Add APOSTROPHE_USERNAME and APOSTROPHE_PASSWORD to .env to test session login');
    }

    await wait(500);

    // Test 7: Test bearer token authentication (if we got a token)
    console.log('\n📄 Test 7: Bearer Token Authentication Test');
    if (bearerToken) {
      try {
        // Create API instance with bearer token
        const bearerConfiguration = new Configuration({
          basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1',
          accessToken: bearerToken
        });
        const bearerAuthApi = new AuthenticationApi(bearerConfiguration);

        const { status, data } = await bearerAuthApi.authWhoAmIPost();

        if (status === 200 && data) {
          logTest('Bearer token authentication', true, 'Bearer token works for authentication');
          console.log(`   Authenticated as: ${data.username || data.title || 'User'}`);
        } else {
          logTest('Bearer token authentication', false, 'Bearer token authentication failed');
        }
      } catch (error) {
        logTest('Bearer token authentication', false, error.message);
      }
    } else {
      logTest('Bearer token authentication', false, 'No bearer token available to test');
      console.log('   💡 Bearer token test requires successful username/password login');
    }

    await wait(500);

    // Test 8: Test logout with API key (should work)
    console.log('\n📄 Test 8: Logout with API Key (authLogout)');
    try {
      const { status, data } = await authApi.authLogout();

      if (status === 200) {
        logTest('Logout with API key', true, 'Logout endpoint responded successfully');
        console.log('   ℹ️ API key authentication persists after logout call');

        if (data && data.message) {
          console.log(`   Server message: ${data.message}`);
        }
      } else {
        logTest('Logout with API key', false, 'Logout failed');
      }
    } catch (error) {
      logTest('Logout with API key', false, error.message);
    }

    await wait(500);

    // Test 9: Test logout with bearer token (if available)
    console.log('\n📄 Test 9: Logout with Bearer Token');
    if (bearerToken) {
      try {
        // Create API instance with bearer token for logout test
        const bearerLogoutConfiguration = new Configuration({
          basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1',
          accessToken: bearerToken
        });
        const bearerLogoutAuthApi = new AuthenticationApi(bearerLogoutConfiguration);

        const { status, data } = await bearerLogoutAuthApi.authLogout();

        if (status === 200) {
          logTest('Logout with bearer token', true, 'Bearer token logout successful');

          // Test if token is now invalid
          await wait(500);
          console.log('   🔄 Testing if bearer token is now invalid...');

          try {
            await bearerLogoutAuthApi.authWhoAmIPost();
            console.log('   ⚠️ Bearer token still works after logout (unexpected)');
          } catch (postLogoutError) {
            if (postLogoutError.response && postLogoutError.response.status === 401) {
              console.log('   ✅ Bearer token correctly invalidated after logout');
            } else {
              console.log(`   ❓ Unexpected error testing post-logout token: ${postLogoutError.message}`);
            }
          }
        } else {
          logTest('Logout with bearer token', false, 'Bearer token logout failed');
        }
      } catch (error) {
        logTest('Logout with bearer token', false, error.message);
      }
    } else {
      logTest('Logout with bearer token', false, 'No bearer token available for logout test');
    }

    await wait(500);

    // Test 10: Verify API key still works after logout tests
    console.log('\n📄 Test 10: Verify API Key Still Valid After Logout Tests');
    try {
      const { status, data } = await authApi.authWhoAmIPost();

      if (status === 200 && data) {
        logTest('API key validity after logout', true, 'API key authentication still working');
        console.log('   ✅ API key authentication is independent of session/token logout');
      } else {
        logTest('API key validity after logout', false, 'API key authentication failed');
      }
    } catch (error) {
      logTest('API key validity after logout', false, error.message);
    }

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
  }

  console.log('\n===============================================');
  console.log('🎯 Authentication API Tests Complete');
}

// Additional tests for password reset functionality (if enabled)
async function runPasswordResetTests() {
  console.log('\n🔐 Password Reset Tests');
  console.log('======================\n');

  // Test 1: Request password reset (always succeeds for security reasons)
  console.log('📄 Test 1: Request Password Reset (authResetRequest)');

  // Only test with a test email if provided, otherwise skip
  if (process.env.APOSTROPHE_TEST_EMAIL) {
    try {
      const resetRequestData = {
        email: process.env.APOSTROPHE_TEST_EMAIL
      };

      const { status, data } = await authApi.authResetRequest(resetRequestData);

      if (status === 200) {
        logTest('Password reset request', true, 'Reset request processed (always succeeds for security)');
        console.log('   ℹ️ Password reset always returns success, even for invalid emails');
        console.log('   ℹ️ Check server terminal for actual email send status');

        if (data && data.message) {
          console.log(`   Server message: ${data.message}`);
        }
      } else {
        logTest('Password reset request', false, 'Reset request failed');
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        logTest('Password reset request', false, '403 Forbidden - Password reset likely disabled');
        console.log('   ℹ️ Password reset functionality is not enabled in ApostropheCMS config');
        console.log('   💡 Check if passwordReset option is enabled in @apostrophecms/login module');
      } else {
        logTest('Password reset request', false, error.message);
      }
    }
  } else {
    logTest('Password reset request', false, 'No test email provided');
    console.log('   💡 Add APOSTROPHE_TEST_EMAIL to .env to test password reset request');
    console.log('   💡 Use a test email address that you control');
  }

  await wait(500);

  // Test 2: Note about completing password reset
  console.log('\n📄 Test 2: Complete Password Reset (authReset)');
  logTest('Password reset completion', false, 'Cannot test without valid reset token');
  console.log('   ℹ️ Testing password reset completion requires:');
  console.log('   ℹ️ 1. Password reset to be enabled in ApostropheCMS config');
  console.log('   ℹ️ 2. A valid reset token from a reset email');
  console.log('   ℹ️ 3. Manual intervention to extract token from email');
  console.log('   💡 This endpoint can be tested manually with a real reset flow');

  console.log('\n======================');
  console.log('🔐 Password Reset Tests Complete');
}

// Main execution function
async function main() {
  try {
    await runAuthenticationTests();

    // Only run password reset tests if explicitly requested or test email provided
    if (process.env.APOSTROPHE_TEST_EMAIL || process.env.RUN_PASSWORD_RESET_TESTS) {
      await runPasswordResetTests();
    } else {
      console.log('\n💡 Password reset tests skipped');
      console.log('Add APOSTROPHE_TEST_EMAIL to .env or set RUN_PASSWORD_RESET_TESTS=true to run them');
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in test runners or run directly
if (require.main === module) {
  main();
}

module.exports = {
  runAuthenticationTests,
  runPasswordResetTests,
  main
};
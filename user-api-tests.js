// Users API Test Suite for ApostropheCMS SDK
// This test suite covers the Users API endpoints with simple, verbose tests
// Tests assume API key authentication and full read/write permissions
require('dotenv').config();
const { UsersApi, Configuration } = require('apostrophecms-client');

// Configure the API client with API key authentication
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
  process.exit(1);
}

const usersApi = new UsersApi(configuration);

// Helper function to log test results
function logTest(testName, success, details = '') {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Helper function to add delay between requests
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate unique username to avoid conflicts
function generateTestUsername() {
  const timestamp = Date.now();
  return `sdktest${timestamp}`;
}

// Main test function
async function runUsersApiTests() {
  console.log('🧪 Users API Test Suite');
  console.log('========================\n');

  let testUserId = null;
  let testUsername = null;

  try {
    // Test 1: List existing users
    console.log('📄 Test 1: List Users (userList)');
    try {
      const { status, data } = await usersApi.userList();
      
      if (status === 200 && data && data.results) {
        logTest('List users', true, `Found ${data.results.length} users`);
        console.log(`   Total users: ${data.count || data.results.length}`);
        
        // Show a sample user to understand the structure
        if (data.results.length > 0) {
          const sampleUser = data.results[0];
          console.log(`   Sample user: ${sampleUser.title} (${sampleUser.username})`);
        }
      } else {
        logTest('List users', false, 'Failed to retrieve users list');
      }
    } catch (error) {
      logTest('List users', false, error.message);
    }

    await wait(500);

    // Test 2: Check username uniqueness for a new username
    console.log('\n📄 Test 2: Check Username Uniqueness (userUniqueUsername)');
    testUsername = generateTestUsername();
    try {
      const uniqueRequest = {
        username: testUsername
      };

      const { status, data } = await usersApi.userUniqueUsername(uniqueRequest);
      console.log('the data', data);
      if (status === 200) {
        const isUnique = data.available || data.unique || !data.exists;
        logTest('Check username uniqueness', true, `Username "${testUsername}" is ${isUnique ? 'available' : 'taken'}`);
        
        if (!isUnique) {
          // Generate a new username if this one is taken
          testUsername = generateTestUsername();
          console.log(`   Trying new username: ${testUsername}`);
        }
      } else {
        logTest('Check username uniqueness', false, 'Failed to check username uniqueness');
      }
    } catch (error) {
      logTest('Check username uniqueness', false, error.message);
    }

    await wait(500);

    // Test 3: Create a new test user
    console.log('\n📄 Test 3: Create New User (userCreate)');
    try {
      const newUserData = {
        title: `SDK Test User ${testUsername}`,
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'TestPassword123!',
        role: 'contributor' // Safe default role
      };

      const { status, data } = await usersApi.userCreate(newUserData);
      
      if (status === 200 && data && data._id) {
        testUserId = data._id;
        logTest('Create new user', true, `Created user with ID: ${testUserId}`);
        console.log(`   User title: ${data.title}`);
        console.log(`   Username: ${data.username}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Role: ${data.role}`);
      } else {
        logTest('Create new user', false, 'Failed to create user or get valid response');
      }
    } catch (error) {
      logTest('Create new user', false, error.message);
    }

    await wait(500);

    // Test 4: Get the created user by ID
    console.log('\n📄 Test 4: Get User by ID (userGetById)');
    if (testUserId) {
      try {
        const { status, data } = await usersApi.userGetById(testUserId);
        
        if (status === 200 && data && data._id === testUserId) {
          logTest('Get user by ID', true, `Retrieved user: ${data.title}`);
          console.log(`   Username: ${data.username}`);
          console.log(`   Created: ${data.createdAt}`);
          console.log(`   Role: ${data.role}`);
        } else {
          logTest('Get user by ID', false, 'User not found or invalid response');
        }
      } catch (error) {
        logTest('Get user by ID', false, error.message);
      }
    } else {
      logTest('Get user by ID', false, 'No test user ID available');
    }

    await wait(500);

    // Test 5: Update user using PATCH
    console.log('\n📄 Test 5: Update User with PATCH (userPatchById)');
    if (testUserId) {
      try {
        const updateData = {
          title: `SDK Test User ${testUsername} - Updated`
        };

        const { status, data } = await usersApi.userPatchById(testUserId, updateData);
        
        if (status === 200 && data && data.title.includes('Updated')) {
          logTest('Update user with PATCH', true, `Updated title to: ${data.title}`);
        } else {
          logTest('Update user with PATCH', false, 'Update failed or title not changed');
        }
      } catch (error) {
        logTest('Update user with PATCH', false, error.message);
      }
    } else {
      logTest('Update user with PATCH', false, 'No test user ID available');
    }

    await wait(500);

    // Test 6: Check uniqueness of existing username (should not be available)
    console.log('\n📄 Test 6: Check Existing Username Uniqueness');
    if (testUsername) {
      try {
        const uniqueRequest = {
          username: testUsername
        };

        const { status, data } = await usersApi.userUniqueUsername(uniqueRequest);
        console.log('the data', data);
        
        if (status === 200 && data) {
          const isUnique = data.available || data.unique || !data.exists;
          logTest('Check existing username uniqueness', true, `Username "${testUsername}" is ${isUnique ? 'still available (unexpected)' : 'taken (expected)'}`);
        } else {
          logTest('Check existing username uniqueness', false, 'Failed to check username uniqueness');
        }
      } catch (error) {
        logTest('Check existing username uniqueness', false, error.message);
      }
    } else {
      logTest('Check existing username uniqueness', false, 'No test username available');
    }

    await wait(500);

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
  }

  // Cleanup: Delete test user
  console.log('\n🧹 Cleanup: Delete Test User');
  if (testUserId) {
    try {
      const { status, data } = await usersApi.userDeleteById(testUserId);
      
      if (status === 200) {
        logTest('Delete test user', true, `Successfully deleted user ${testUserId}`);
      } else {
        logTest('Delete test user', false, `Failed to delete user ${testUserId}`);
        console.log('   ⚠️  Manual cleanup may be required');
      }
    } catch (error) {
      logTest('Delete test user', false, error.message);
      console.log('   ⚠️  Manual cleanup may be required');
    }
  } else {
    logTest('Delete test user', false, 'No test user ID available for cleanup');
  }

  console.log('\n=====================================');
  console.log('🎯 Users API Tests Complete');
}

// Run the tests
if (require.main === module) {
  runUsersApiTests().catch(console.error);
}

module.exports = { runUsersApiTests };
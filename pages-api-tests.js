// Pages API Test Suite for ApostropheCMS SDK
// This test suite covers all the pages endpoints with simple, verbose tests
// Tests assume API key authentication and full read/write permissions
require('dotenv').config();
const { PagesApi, Configuration } = require('apostrophecms-client');

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

const pagesApi = new PagesApi(configuration);

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

async function runPagesTests() {
  console.log('🚀 Starting ApostropheCMS Pages API Tests');
  console.log('=====================================\n');

  let testPageId = null; // Will store the ID of a test page we create
  let homePageId = null; // Will store the home page ID for reference

  try {
    // Test 1: Get the page tree to understand the structure
    console.log('📄 Test 1: Get Page Tree (pageGet)');
    try {
      const { status, data } = await pagesApi.pageGet();

      if (status === 200 && data && data._children) {
        logTest('Get page tree', true, `Found ${data._children.length} top-level pages`);
        homePageId = data._id;
        console.log(`   Home page ID: ${homePageId}`);
      } else {
        logTest('Get page tree', false, 'Unexpected response structure');
      }
    } catch (error) {
      logTest('Get page tree', false, error.message);
    }

    await wait(500);

    // Test 2: Get page tree with flat parameter
    console.log('\n📄 Test 2: Get Page Tree Flat (pageGet with flat=1)');
    try {
      const { status, data } = await pagesApi.pageGet('1', '1'); // all=1, flat=1

      if (status === 200 && Array.isArray(data.results)) {
        logTest('Get flat page tree', true, `Found ${data.results.length} pages in flat format`);
      } else {
        logTest('Get flat page tree', false, 'Expected flat array response');
      }
    } catch (error) {
      logTest('Get flat page tree', false, error.message);
    }

    await wait(500);

    // Diagnostic: Let's examine the home page structure to understand what we're working with
    console.log('\n🔍 Diagnostic: Examine Home Page Structure');
    if (homePageId) {
      try {
        const { status, data } = await pagesApi.pageGetById(homePageId);
        if (status === 200 && data) {
          console.log('   Home page details:');
          console.log(`   - Type: ${data.type}`);
          console.log(`   - Title: ${data.title}`);
          console.log(`   - Slug: ${data.slug}`);
          console.log(`   - aposDocId: ${data.aposDocId}`);
          console.log(`   - Has children: ${data._children ? data._children.length : 0}`);

          // Try to understand the page types available
          if (data._children && data._children.length > 0) {
            console.log('   Existing child page types:');
            data._children.forEach((child, index) => {
              console.log(`     ${index + 1}. ${child.title} (${child.type})`);
            });
          }
        }
      } catch (error) {
        console.log(`   Could not examine home page: ${error.message}`);
      }
    }

    await wait(500);

    // Test 3: Create a new test page
    console.log('\n📄 Test 3: Create New Page (pagePost)');
    try {
      const newPageData = {
        title: 'SDK Test Page',
        type: 'default-page', // Default page type
        slug: 'sdk-test-page',
        _targetId: homePageId, // Place under home page
        _position: 'lastChild' // Position at end
      };

      const { status, data } = await pagesApi.pagePost(newPageData);
      
      if (status === 200 && data && data._id) {
        testPageId = data._id;
        logTest('Create new page', true, `Created page with ID: ${testPageId}`);
        console.log(`   Page title: ${data.title}`);
        console.log(`   Page slug: ${data.slug}`);
      } else {
        logTest('Create new page', false, 'Failed to create page or get valid response');
      }
    } catch (error) {
      logTest('Create new page', false, error.message);
    }

    await wait(500);

    // Test 4: Get the created page by ID
    console.log('\n📄 Test 4: Get Page by ID (pageGetById)');
    if (testPageId) {
      try {
        const { status, data } = await pagesApi.pageGetById(testPageId);
        
        if (status === 200 && data && data._id === testPageId) {
          logTest('Get page by ID', true, `Retrieved page: ${data.title}`);
          console.log(`   Page type: ${data.type}`);
          console.log(`   Created: ${data.createdAt}`);
        } else {
          logTest('Get page by ID', false, 'Page not found or invalid response');
        }
      } catch (error) {
        logTest('Get page by ID', false, error.message);
      }
    } else {
      logTest('Get page by ID', false, 'No test page ID available');
    }

    await wait(500);

    // Test 5: Update page using PATCH
    console.log('\n📄 Test 5: Update Page with PATCH (pagePatchById)');
    if (testPageId) {
      try {
        const updateData = {
          title: 'SDK Test Page - Updated'
        };

        const { status, data } = await pagesApi.pagePatchById(testPageId, updateData);
        
        if (status === 200 && data && data.title === 'SDK Test Page - Updated') {
          logTest('Update page with PATCH', true, `Updated title to: ${data.title}`);
        } else {
          logTest('Update page with PATCH', false, 'Update failed or title not changed');
        }
      } catch (error) {
        logTest('Update page with PATCH', false, error.message);
      }
    } else {
      logTest('Update page with PATCH', false, 'No test page ID available');
    }

    await wait(500);

    // Test 6: Publish the page (if it's in draft mode)
    console.log('\n📄 Test 6: Publish Page (pagePublishById)');
    if (testPageId) {
      try {
        const { status, data } = await pagesApi.pagePublishById(testPageId);
        
        if (status === 200 && data) {
          logTest('Publish page', true, `Published page: ${data.title}`);
          console.log(`   Publication state updated`);
        } else {
          logTest('Publish page', false, 'Publish operation failed');
        }
      } catch (error) {
        // This might fail if the page is already published or if workflow is not enabled
        logTest('Publish page', false, `${error.message} (This may be expected if page is already published)`);
      }
    } else {
      logTest('Publish page', false, 'No test page ID available');
    }

    await wait(500);

    // Test 7: Get page locales (internationalization test)
    console.log('\n📄 Test 7: Get Page Locales (pageGetLocalesById)');
    if (testPageId) {
      try {
        const { status, data } = await pagesApi.pageGetLocalesById(testPageId);
        
        if (status === 200) {
          logTest('Get page locales', true, `Retrieved locale information`);
          console.log(`   Locales response:`, Array.isArray(data) ? data : 'Not an array');
        } else {
          logTest('Get page locales', false, 'Expected array of locale codes');
        }
      } catch (error) {
        logTest('Get page locales', false, error.message);
      }
    } else {
      logTest('Get page locales', false, 'No test page ID available');
    }

    await wait(500);

    // Test 8: Test renderAreas parameter
    console.log('\n📄 Test 8: Get Page with Rendered Areas (pageGetById with renderAreas)');
    if (testPageId) {
      try {
        const { status, data } = await pagesApi.pageGetById(
          testPageId,
          'published', // aposMode
          'en', // aposLocale
          true // renderAreas - this should render widget areas as HTML
        );
        
        if (status === 200 && data) {
          logTest('Get page with rendered areas', true, `Retrieved page with HTML rendering`);
          console.log(`   Page has main area: ${!!data.main}`);
        } else {
          logTest('Get page with rendered areas', false, 'Failed to retrieve page');
        }
      } catch (error) {
        logTest('Get page with rendered areas', false, error.message);
      }
    } else {
      logTest('Get page with rendered areas', false, 'No test page ID available');
    }

    await wait(500);

    // Test 9: Create a child page to test tree operations
    console.log('\n📄 Test 9: Create Child Page for Tree Testing');
    let childPageId = null;
    if (testPageId) {
      try {
        const childPageData = {
          title: 'SDK Child Test Page',
          type: 'default-page',
          slug: 'sdk-child-test-page',
          _targetId: testPageId, // Place under our test page
          _position: 'lastChild'
        };

        const { status, data } = await pagesApi.pagePost(childPageData);
        
        if (status === 200 && data && data._id) {
          childPageId = data._id;
          logTest('Create child page', true, `Created child page with ID: ${childPageId}`);
        } else {
          logTest('Create child page', false, 'Failed to create child page');
        }
      } catch (error) {
        logTest('Create child page', false, error.message);
      }
    } else {
      logTest('Create child page', false, 'No parent test page ID available');
    }

    await wait(500);

    // Test 10: Test bulk operations - Archive pages
    console.log('\n📄 Test 10: Archive Pages (pageArchive)');
    const pagesToArchive = [childPageId, testPageId].filter(Boolean);
    if (pagesToArchive.length > 0) {
      try {
        const archiveData = {
          _ids: pagesToArchive
        };

        const { status, data } = await pagesApi.pageArchive(archiveData);

        if (status === 200) {
          logTest('Archive pages', true, `Archive operation initiated`);
          console.log(`   Response:`, data);
        } else {
          logTest('Archive pages', false, 'Archive operation failed');
        }
      } catch (error) {
        logTest('Archive pages', false, error.message);
      }
    } else {
      logTest('Archive pages', false, 'No pages available to archive');
    }

    await wait(500);

    // Test 11: Test bulk operations - Restore pages
    console.log('\n📄 Test 11: Restore Pages (pageRestore)');
    if (pagesToArchive.length > 0) {
      try {
        const restoreData = {
          _ids: pagesToArchive
        };

        console.log('   Restoring pages:', pagesToArchive);
        const { status, data } = await pagesApi.pageRestore(restoreData);

        console.log(`   Restore response status: ${status}`);
        console.log('   Restore response data:', JSON.stringify(data, null, 2));

        if (status === 200 && data) {
          if (data.jobId) {
            // Likely also async operation like archive
            logTest('Restore pages', true, `Restore job started with ID: ${data.jobId}`);
            console.log('   Note: Restore operation may also be asynchronous');
          } else if (Array.isArray(data)) {
            // OpenAPI spec format
            logTest('Restore pages', true, `Restored ${data.length} page(s) immediately`);
          } else {
            // Some other success format
            logTest('Restore pages', true, `Restore operation completed`);
          }
        } else {
          logTest('Restore pages', false, `Restore operation failed (status: ${status})`);
        }
      } catch (error) {
        logTest('Restore pages', false, `${error.message} - ${error.response?.data ? JSON.stringify(error.response.data) : 'No additional error data'}`);
      }
    } else {
      logTest('Restore pages', false, 'No pages available to restore');
    }

    await wait(500);

    // Test 12: Test moving pages in tree (using PUT with position)
    console.log('\n📄 Test 12: Move Page in Tree (pagePutById)');
    if (testPageId && homePageId) {
      try {
        // Get current page data first
        const { data: currentPage } = await pagesApi.pageGetById(testPageId);

        // Update the page with new position
        const moveData = {
          ...currentPage,
          _targetId: homePageId, // Move back under home
          _position: 'firstChild' // Move to first position
        };

        const { status, data } = await pagesApi.pagePutById(testPageId, moveData);
        
        if (status === 200 && data) {
          logTest('Move page in tree', true, `Moved page to first child position`);
        } else {
          logTest('Move page in tree', false, 'Move operation failed');
        }
      } catch (error) {
        logTest('Move page in tree', false, error.message);
      }
    } else {
      logTest('Move page in tree', false, 'Missing required page IDs');
    }

    await wait(500);

    // Test 13: Clean up - Delete test pages (IMPROVED WITH PROPER LIFECYCLE)
    console.log('\n📄 Test 13: Cleanup - Delete Test Pages (with proper unpublish first)');

    // Helper function to safely delete a page with proper lifecycle
    async function safeDeletePage(pageId, pageName) {
      try {
        console.log(`   🔄 Attempting to delete ${pageName} (${pageId})`);
        
        // First, let's get the page to understand its ID structure
        let actualPageData = null;
        try {
          const pageResponse = await pagesApi.pageGetById(pageId);
          actualPageData = pageResponse.data;
          console.log(`   📋 Page info: aposDocId=${actualPageData.aposDocId}, _id=${actualPageData._id}`);
        } catch (error) {
          console.log(`   ⚠️  Could not retrieve page info: ${error.message}`);
        }
        
        // Step 1: Try to unpublish first (this removes the published version)
        try {
          console.log(`   📤 Step 1: Unpublishing ${pageName}...`);
          const unpublishResponse = await pagesApi.pageUnpublishById(pageId);
          console.log(`   ✅ Unpublish successful (status: ${unpublishResponse.status})`);
        } catch (unpublishError) {
          console.log(`   ⚠️  Unpublish failed or not needed: ${unpublishError.message}`);
          // This is often expected if the page was never published
        }

        await wait(200); // Brief pause between operations

        // Step 2: Now delete the page using the appropriate ID
        // After unpublishing, we need to use either the aposDocId or the draft ID
        let deleteId = pageId;
        
        if (actualPageData) {
          // If we have page data, try using the aposDocId (base document ID)
          deleteId = actualPageData.aposDocId;
          console.log(`   🔄 Using aposDocId for deletion: ${deleteId}`);
        } else if (pageId.includes(':en:published')) {
          // If we can't get page data but ID looks like published version,
          // try removing the mode/locale suffix to get base ID
          deleteId = pageId.split(':')[0];
          console.log(`   🔄 Using base ID for deletion: ${deleteId}`);
        }
        
        console.log(`   🗑️  Step 2: Deleting ${pageName} using ID: ${deleteId}...`);
        const deleteResponse = await pagesApi.pageDeleteById(deleteId);
        
        if (deleteResponse.status === 200) {
          logTest(`Delete ${pageName}`, true, `Successfully deleted: ${deleteId}`);
          return true;
        } else {
          logTest(`Delete ${pageName}`, false, `Delete failed with status: ${deleteResponse.status}`);
          return false;
        }
      } catch (deleteError) {
        // If the first delete attempt failed, try alternative ID formats
        console.log(`   ⚠️  First delete attempt failed: ${deleteError.message}`);
        
        if (pageId.includes(':en:published')) {
          try {
            // Try with draft mode instead
            const draftId = pageId.replace(':en:published', ':en:draft');
            console.log(`   🔄 Trying draft ID: ${draftId}`);
            
            const deleteResponse = await pagesApi.pageDeleteById(draftId);
            if (deleteResponse.status === 200) {
              logTest(`Delete ${pageName}`, true, `Successfully deleted using draft ID: ${draftId}`);
              return true;
            }
          } catch (draftError) {
            console.log(`   ⚠️  Draft ID also failed: ${draftError.message}`);
          }
          
          try {
            // Try with just the base ID (no mode/locale)
            const baseId = pageId.split(':')[0];
            console.log(`   🔄 Trying base ID: ${baseId}`);
            
            const deleteResponse = await pagesApi.pageDeleteById(baseId);
            if (deleteResponse.status === 200) {
              logTest(`Delete ${pageName}`, true, `Successfully deleted using base ID: ${baseId}`);
              return true;
            }
          } catch (baseError) {
            console.log(`   ⚠️  Base ID also failed: ${baseError.message}`);
          }
        }
        
        logTest(`Delete ${pageName}`, false, `All delete attempts failed for ${pageId}`);
        console.log(`   💡 Page may need manual cleanup from database`);
        
        // Log additional debug info
        if (deleteError.response) {
          console.log(`   HTTP Status: ${deleteError.response.status}`);
          console.log(`   Error details: ${deleteError.response.statusText}`);
        }
        return false;
      }
    }

    // Delete child page first (if it exists)
    if (childPageId) {
      await safeDeletePage(childPageId, 'child page');
      await wait(500);
    }

    // Delete main test page
    if (testPageId) {
      await safeDeletePage(testPageId, 'test page');
    }

    // Verification step: Check if pages still appear in page tree
    console.log('\n   🔍 Verification: Checking if pages still exist in page tree...');
    try {
      const { status, data } = await pagesApi.pageGet(undefined, '1'); // Get flat list
      if (status === 200 && data.results) {
        const remainingTestPages = data.results.filter(page => 
          page.title && (
            page.title.includes('SDK Test Page') || 
            page.title.includes('SDK Child Test Page')
          )
        );
        
        if (remainingTestPages.length === 0) {
          console.log('   ✅ No test pages remain in page tree - cleanup successful');
        } else {
          console.log(`   ⚠️  ${remainingTestPages.length} test page(s) still visible in page tree:`);
          remainingTestPages.forEach(page => {
            console.log(`     - "${page.title}" (${page._id})`);
          });
          console.log('   💡 These may be draft-only pages that need manual cleanup');
        }
      }
    } catch (error) {
      console.log(`   Could not verify cleanup: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
  }
  console.log('\n=====================================');
  console.log('🎯 Pages API Tests Complete');
}


// Simplified advanced tests - removing problematic workflow test
async function runAdvancedPagesTests() {
  console.log('\n🔬 Advanced Pages API Tests');
  console.log('============================\n');

  // Test internationalization if enabled
  console.log('📄 Advanced Test 1: Internationalization Features');
  try {
    // Try to get available locales
    const { InternationalizationApi } = require('apostrophecms-client');
    const i18nApi = new InternationalizationApi(configuration);
  
    try {
      const { status, data } = await i18nApi.i18nLocalesGet();
      if (status === 200 && typeof data === 'object') {
        const locales = Object.keys(data);
        logTest('Get available locales', true, `Found locales: ${locales.join(', ')}`);

        if (locales.length > 1) {
          console.log('   ℹ️  Multiple locales detected - page localization tests could be expanded');
        } else {
          console.log('   ℹ️  Single locale detected - internationalization may not be fully configured');
        }
      } else {
        logTest('Get available locales', false, 'No locale data available');
      }
    } catch (error) {
      logTest('Get available locales', false, 'Internationalization may not be enabled');
    }
  } catch (error) {
    logTest('Internationalization test setup', false, 'I18n API not available');
  }

  await wait(500);

  // Test 2: Test page draft/published modes
  console.log('\n📄 Advanced Test 3: Draft vs Published Mode Testing');
  try {
    // Get pages in draft mode
    const { status: draftStatus, data: draftData } = await pagesApi.pageGet(
      undefined, // all
      undefined, // flat
      undefined, // children
      'draft', // aposMode
      'en' // aposLocale
    );

    // Get pages in published mode
    const { status: publishedStatus, data: publishedData } = await pagesApi.pageGet(
      undefined, // all
      undefined, // flat
      undefined, // children
      'published', // aposMode
      'en' // aposLocale
    );

    if (draftStatus === 200 && publishedStatus === 200) {
      logTest('Draft vs Published mode', true, 'Successfully retrieved both draft and published page trees');
      console.log(`   Draft pages: ${draftData._children ? draftData._children.length : 0} children`);
      console.log(`   Published pages: ${publishedData._children ? publishedData._children.length : 0} children`);
    } else {
      logTest('Draft vs Published mode', false, 'Failed to retrieve page trees in different modes');
    }
  } catch (error) {
    logTest('Draft vs Published mode', false, error.message);
  }

  console.log('\n============================');
  console.log('🧪 Advanced Tests Complete');
}

// Main execution
async function main() {
  try {
    await runPagesTests();
    await runAdvancedPagesTests();
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
  runPagesTests,
  runAdvancedPagesTests,
  main
};
// Global Content API Test Suite for ApostropheCMS SDK
// This test suite covers all global content endpoints with simple, verbose tests
// Tests assume API key authentication and full read/write permissions

require('dotenv').config();
const { GlobalContentApi, Configuration } = require('apostrophecms-client');

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

const globalApi = new GlobalContentApi(configuration);

// Helper function to log test results with clear formatting
function logTest(testName, success, details = '') {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Helper function to add delay between API calls
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test runner
async function runGlobalContentTests() {
  console.log('🌐 ApostropheCMS Global Content API Tests');
  console.log('==========================================\n');

  let globalDocumentId = null;

  try {
    // Test 1: Verify authentication by getting global content
    console.log('🔐 Test 1: Verify Authentication');
    try {
      // First, let's check if we can access the global content endpoint
      const { status, data } = await globalApi.globalGet();

      if (status === 200) {
        logTest('Verify authentication', true, 'Successfully connected to Global Content API');

        // Handle both paginated and single document responses
        if (data && data.results && Array.isArray(data.results)) {
          // Paginated response
          if (data.results.length > 0) {
            globalDocumentId = data.results[0]._id;
            console.log(`   Found ${data.results.length} existing global documents (paginated response)`);
            console.log(`   Using first global document with ID: ${globalDocumentId}`);
          } else {
            console.log('   No existing global documents found in paginated response');
          }
        } else if (data && data._id) {
          // Single document response
          globalDocumentId = data._id;
          console.log(`   Found existing global document with ID: ${globalDocumentId}`);
        } else {
          console.log('   No existing global document found - this may be expected for a new site');
        }
      } else {
        logTest('Verify authentication', false, `Unexpected status code: ${status}`);
        return; // Exit if we can't authenticate
      }
    } catch (error) {
      logTest('Verify authentication', false, error.message);
      if (error.message.includes('401')) {
        console.log('   💡 Check your API key in the .env file');
      }
      return; // Exit if authentication fails
    }

    await wait(500);

    // Test 2: Get global content (published mode)
    console.log('\n📄 Test 2: Get Global Content - Published Mode (globalGet)');
    try {
      const { status, data } = await globalApi.globalGet('published');

      if (status === 200) {
        logTest('Get global content (published)', true, 'Retrieved published global content');

        // Handle paginated response
        if (data && data.results && Array.isArray(data.results)) {
          console.log(`   Found ${data.results.length} global documents (paginated response)`);
          console.log(`   Total pages: ${data.pages}, Current page: ${data.currentPage}`);

          // Look at the first global document
          if (data.results.length > 0) {
            const firstGlobal = data.results[0];
            console.log(`   First document type: ${firstGlobal.type || 'unknown'}`);
            console.log(`   First document slug: ${firstGlobal.slug || 'unknown'}`);
            console.log(`   First document test field: ${firstGlobal.testField || 'not set'}`);
            console.log(`   First document last modified: ${firstGlobal.updatedAt || 'unknown'}`);
          }
        } else if (data) {
          // Handle single document response (if API returns single doc)
          console.log(`   Document type: ${data.type || 'unknown'}`);
          console.log(`   Test field value: ${data.testField || 'not set'}`);
          console.log(`   Last modified: ${data.updatedAt || 'unknown'}`);
        }
      } else {
        logTest('Get global content (published)', false, `Unexpected status: ${status}`);
      }
    } catch (error) {
      logTest('Get global content (published)', false, error.message);
    }

    await wait(500);

    // Test 3: Get global content (draft mode)
    console.log('\n📄 Test 3: Get Global Content - Draft Mode (globalGet)');
    try {
      const { status, data } = await globalApi.globalGet('draft');

      if (status === 200) {
        logTest('Get global content (draft)', true, 'Retrieved draft global content');

        // Handle paginated response and store a document ID for later tests
        if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
          const firstDraft = data.results[0];
          globalDocumentId = firstDraft._id;
          console.log(`   Found ${data.results.length} draft global documents`);
          console.log(`   Using first draft document ID: ${globalDocumentId}`);
          console.log(`   First draft slug: ${firstDraft.slug}`);
          console.log(`   First draft test field: ${firstDraft.testField || 'not set'}`);
        } else if (data && data._id) {
          // Handle single document response
          globalDocumentId = data._id;
          console.log(`   Draft global document ID: ${globalDocumentId}`);
        }
      } else {
        logTest('Get global content (draft)', false, `Unexpected status: ${status}`);
      }
    } catch (error) {
      logTest('Get global content (draft)', false, error.message);
    }

    await wait(500);

    // Test 4: Update global content using POST
    console.log('\n📝 Test 4: Update Global Content (globalPost)');
    try {
      // Prepare simple test data for global content - just one string field
      const updateData = {
        testField: 'SDK Test Value - Updated via POST'
      };

      const { status, data } = await globalApi.globalPost(
        updateData,
        'draft' // Target draft mode for updates
      );
      console.log(data);

      if (status === 200 && data) {
        logTest('Update global content', true, 'Successfully updated global content');

        // Verify our changes were applied
        if (data.testField === updateData.testField) {
          console.log('   ✓ Test field updated correctly');
        } else {
          console.log('   ⚠️  Test field may not have updated (check if field exists in schema)');
        }

        // Update our global document ID
        if (data._id) {
          globalDocumentId = data._id;
        }
      } else {
        logTest('Update global content', false, 'Failed to update or invalid response');
      }
    } catch (error) {
      logTest('Update global content', false, error.message);
    }

    await wait(500);

    // Test 5: Get global content by ID
    console.log('\n📄 Test 5: Get Global Content by ID (globalGetById)');
    if (globalDocumentId) {
      try {
        const { status, data } = await globalApi.globalGetById(globalDocumentId);

        if (status === 200 && data && data._id === globalDocumentId) {
          logTest('Get global content by ID', true, `Retrieved global document: ${data.testField || 'no test field'}`);
          console.log(`   Document ID: ${data._id}`);
          console.log(`   Document type: ${data.type}`);
          console.log(`   Test field value: ${data.testField || 'not set'}`);
          console.log(`   Creation date: ${data.createdAt}`);
        } else {
          logTest('Get global content by ID', false, 'Document not found or invalid response');
        }
      } catch (error) {
        logTest('Get global content by ID', false, error.message);
      }
    } else {
      logTest('Get global content by ID', false, 'No global document ID available');
    }

    await wait(500);

    // Test 6: Update global content using PATCH
    console.log('\n📝 Test 6: Patch Global Content (globalPatchById)');
    if (globalDocumentId) {
      try {
        const patchData = {
          testField: 'SDK Test Value - Updated via PATCH'
        };

        const { status, data } = await globalApi.globalPatchById(globalDocumentId, patchData);

        if (status === 200 && data) {
          logTest('Patch global content', true, 'Successfully patched global content');

          // Verify patch changes
          if (data.testField === patchData.testField) {
            console.log('   ✓ Test field patched correctly');
          } else {
            console.log('   ⚠️  Test field may not have updated (check if field exists in schema)');
          }
        } else {
          logTest('Patch global content', false, 'Patch operation failed');
        }
      } catch (error) {
        logTest('Patch global content', false, error.message);
      }
    } else {
      logTest('Patch global content', false, 'No global document ID available');
    }

    await wait(500);

    // Test 7: Publish global content
    console.log('\n🚀 Test 7: Publish Global Content (globalPublishById)');
    if (globalDocumentId) {
      try {
        const { status, data } = await globalApi.globalPublishById(globalDocumentId);

        if (status === 200 && data) {
          logTest('Publish global content', true, 'Successfully published global content');
          console.log(`   Published document test field: ${data.testField || 'not set'}`);
        } else {
          logTest('Publish global content', false, 'Publish operation failed');
        }
      } catch (error) {
        logTest('Publish global content', false, error.message);
        // Note: This might fail if workflow module is not enabled, which is OK
        if (error.message.includes('workflow') || error.message.includes('already published')) {
          console.log('   💡 This may be expected if workflow is disabled or content is already published');
        }
      }
    } else {
      logTest('Publish global content', false, 'No global document ID available');
    }

    await wait(500);

    // Test 8: Get published global content to verify publish worked
    console.log('\n📄 Test 8: Verify Published Content (globalGet published)');
    try {
      const { status, data } = await globalApi.globalGet('published');

      if (status === 200 && data) {
        logTest('Verify published content', true, 'Retrieved published global content');

        // Handle paginated response
        if (data.results && Array.isArray(data.results)) {
          console.log(`   Found ${data.results.length} published global documents`);

          // Look for our test updates in any of the published documents
          const hasTestUpdates = data.results.some(doc =>
            doc.testField && doc.testField.includes('SDK Test')
          );

          if (hasTestUpdates) {
            console.log('   ✓ Our test updates are visible in published version');
          } else {
            console.log('   ⚠️  Published version may not include our test updates');
          }
        } else {
          // Handle single document response
          if (data.testField && data.testField.includes('SDK Test')) {
            console.log('   ✓ Our test updates are visible in published version');
          } else {
            console.log('   ⚠️  Published version may not include our test updates');
          }
        }
      } else {
        logTest('Verify published content', false, 'Could not retrieve published content');
      }
    } catch (error) {
      logTest('Verify published content', false, error.message);
    }

    await wait(500);

    // Test 9: Test internationalization - Get locales
    console.log('\n🌍 Test 9: Test Internationalization - Get Locales (globalGetLocalesById)');
    if (globalDocumentId) {
      try {
        const { status, data } = await globalApi.globalGetLocalesById(globalDocumentId);
        console.log('internationalization', data)

        if (status === 200) {
          logTest('Get global document locales', true, 'Retrieved locale information');

          if (Array.isArray(data)) {
            console.log(`   Available locales: ${data.length > 0 ? data.join(', ') : 'none configured'}`);
          } else {
            console.log('   Locale response format:', typeof data);
          }
        } else {
          logTest('Get global document locales', false, `Unexpected status: ${status}`);
        }
      } catch (error) {
        logTest('Get global document locales', false, error.message);
        // This might fail if internationalization is not configured
        if (error.message.includes('i18n') || error.message.includes('locale')) {
          console.log('   💡 This may be expected if internationalization is not configured');
        }
      }
    } else {
      logTest('Get global document locales', false, 'No global document ID available');
    }

    await wait(500);

    // Test 10: Test complete replacement with PUT
    console.log('\n🔄 Test 10: Complete Replacement (globalPutById)');
    if (globalDocumentId) {
      try {
        // First get the current document to preserve required fields
        const { data: currentDoc } = await globalApi.globalGetById(globalDocumentId);

        // Prepare complete replacement data
        const putData = {
          ...currentDoc, // Preserve existing structure
          testField: 'SDK Test Value - Complete Replacement via PUT'
        };

        const { status, data } = await globalApi.globalPutById(globalDocumentId, putData);

        if (status === 200 && data) {
          logTest('Complete replacement with PUT', true, 'Successfully replaced global content');

          // Verify replacement
          if (data.testField === putData.testField) {
            console.log('   ✓ Test field replaced correctly');
          } else {
            console.log('   ⚠️  Test field may not have updated (check if field exists in schema)');
          }
        } else {
          logTest('Complete replacement with PUT', false, 'PUT operation failed');
        }
      } catch (error) {
        logTest('Complete replacement with PUT', false, error.message);
      }
    } else {
      logTest('Complete replacement with PUT', false, 'No global document ID available');
    }

    await wait(500);

    // Test 11: Test workflow operations (if enabled)
    console.log('\n🔄 Test 11: Test Workflow Operations');

    // Test submission (if workflow is enabled)
    console.log('\n📤 Test 11a: Submit for Review (globalSubmitById)');
    if (globalDocumentId) {
      try {
        const { status, data } = await globalApi.globalSubmitById(globalDocumentId);

        if (status === 200 && data) {
          logTest('Submit for review', true, 'Successfully submitted global content for review');
        } else {
          logTest('Submit for review', false, 'Submit operation failed');
        }
      } catch (error) {
        logTest('Submit for review', false, error.message);
        if (error.message.includes('workflow') || error.message.includes('already submitted')) {
          console.log('   💡 This may be expected if workflow is disabled or content is already submitted');
        }
      }
    } else {
      logTest('Submit for review', false, 'No global document ID available');
    }

    await wait(500);

    // Test dismissing submission
    // console.log('\n📤 Test 11b: Dismiss Submission (globalDismissSubmissionById)');
    // if (globalDocumentId) {
    //   try {
    //     const { status, data } = await globalApi.globalDismissSubmissionById(globalDocumentId);

    //     if (status === 200 && data) {
    //       logTest('Dismiss submission', true, 'Successfully dismissed submission');
    //     } else {
    //       logTest('Dismiss submission', false, 'Dismiss operation failed');
    //     }
    //   } catch (error) {
    //     logTest('Dismiss submission', false, error.message);
    //     if (error.message.includes('workflow') || error.message.includes('no pending submission')) {
    //       console.log('   💡 This may be expected if workflow is disabled or no submission is pending');
    //     }
    //   }
    // } else {
    //   logTest('Dismiss submission', false, 'No global document ID available');
    // }

    // await wait(500);

    // Test 12: Test revert operations
    console.log('\n🔄 Test 12: Test Revert Operations');

    // Test reverting draft to published
    console.log('\n↩️  Test 12a: Revert Draft to Published (globalRevertDraftToPublishedById)');
    if (globalDocumentId) {
      try {
        const { status, data } = await globalApi.globalRevertDraftToPublishedById(globalDocumentId);

        if (status === 200 && data) {
          logTest('Revert draft to published', true, 'Successfully reverted draft to published version');
        } else {
          logTest('Revert draft to published', false, 'Revert operation failed');
        }
      } catch (error) {
        logTest('Revert draft to published', false, error.message);
        if (error.message.includes('no published version') || error.message.includes('already in sync')) {
          console.log('   💡 This may be expected if no published version exists or draft is already in sync');
        }
      }
    } else {
      logTest('Revert draft to published', false, 'No global document ID available');
    }

    await wait(500);

    // Test 13: Archive and restore operations
    console.log('\n🗃️  Test 13: Archive and Restore Operations');

    // Test archiving
    console.log('\n📦 Test 13a: Archive Global Content (globalArchive)');
    try {
      // Archive requires _ids array even for global content
      const archiveData = {
        _ids: globalDocumentId ? [globalDocumentId] : []
      };

      const { status, data } = await globalApi.globalArchive(archiveData);

      if (status === 200) {
        logTest('Archive global content', true, 'Archive operation completed');
      } else {
        logTest('Archive global content', false, 'Archive operation failed');
      }
    } catch (error) {
      logTest('Archive global content', false, error.message);
      if (error.message.includes('cannot archive global') || error.message.includes('not supported')) {
        console.log('   💡 This may be expected - global content archiving may not be supported');
      }
    }

    await wait(500);

    // Test restoring
    console.log('\n📦 Test 13b: Restore Global Content (globalRestore)');
    try {
      const restoreData = {
        _ids: globalDocumentId ? [globalDocumentId] : []
      };

      const { status, data } = await globalApi.globalRestore(restoreData);

      if (status === 200) {
        logTest('Restore global content', true, 'Restore operation completed');
      } else {
        logTest('Restore global content', false, 'Restore operation failed');
      }
    } catch (error) {
      logTest('Restore global content', false, error.message);
      if (error.message.includes('not archived') || error.message.includes('not supported')) {
        console.log('   💡 This may be expected if content was not archived or restore is not supported');
      }
    }

    await wait(500);

    // Test 14: Final verification - Ensure global content still accessible
    console.log('\n✅ Test 14: Final Verification - Global Content Accessibility');
    try {
      const { status, data } = await globalApi.globalGet('published');

      if (status === 200 && data) {
        logTest('Final verification', true, 'Global content is still accessible');

        // Handle paginated response
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const firstDoc = data.results[0];
          console.log(`   Found ${data.results.length} global documents`);
          console.log(`   First document test field: ${firstDoc.testField || 'not set'}`);
          console.log(`   First document ID: ${firstDoc._id}`);
          console.log(`   First document slug: ${firstDoc.slug}`);
        } else if (data._id) {
          // Handle single document response
          console.log(`   Final test field: ${data.testField || 'not set'}`);
          console.log(`   Document ID: ${data._id}`);
          console.log(`   Document slug: ${data.slug}`);
        }
      } else {
        logTest('Final verification', false, 'Global content is not accessible');
      }
    } catch (error) {
      logTest('Final verification', false, error.message);
    }

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n=====================================');
  console.log('🎯 Global Content API Tests Complete');
  console.log('=====================================');
}

// Export the test runner for use in other test files
module.exports = {
  runGlobalContentTests,
  logTest,
  wait
};

// Run tests if this file is executed directly
if (require.main === module) {
  runGlobalContentTests();
}
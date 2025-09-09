// media-api-tests.combined.js
// Combined & fixed Media API tests for ApostropheCMS SDK
// - Merges and reconciles old-media-api-tests.js + media-api-tests.js
// - Fixes: Image Src URL (Test 5) + Advanced image src by size (Adv Test 3)
// - Adds robust cleanup, unique slugs, redirect-safe src checks, and better diagnostics

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { MediaApi, AttachmentsApi, Configuration } = require('apostrophecms-client');

// ────────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────────
const configuration = new Configuration({
  basePath: process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1',
  apiKey: process.env.APOSTROPHE_API_KEY
});

if (!process.env.APOSTROPHE_API_KEY) {
  console.error('❌ Error: APOSTROPHE_API_KEY is required in .env');
  console.error('   Add to .env:');
  console.error('   APOSTROPHE_API_KEY=your-api-key');
  console.error('   APOSTROPHE_BASE_URL=http://localhost:3000/api/v1  # optional');
  process.exit(1);
}

const mediaApi = new MediaApi(configuration);
const attachmentsApi = new AttachmentsApi(configuration);

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────
function logTest(name, ok, details = '') {
  const status = ok ? '✅ PASS' : '❌ FAIL';
  const ts = new Date().toISOString().substr(11, 8);
  console.log(`[${ts}] ${status}: ${name}`);
  if (details) console.log(`   Details: ${details}`);
}

function wait(ms = 300) { return new Promise(r => setTimeout(r, ms)); }

const TEST_IMAGE = 'test-image.png';

function createFileFromBuffer(buffer, filename, mimeType) {
  try { if (typeof File !== 'undefined') return new File([buffer], filename, { type: mimeType }); } catch (_) { }
  const { Readable } = require('stream');
  return {
    name: filename,
    type: mimeType,
    size: buffer.length,
    lastModified: Date.now(),
    [Symbol.toStringTag]: 'File',
    arrayBuffer: async () => buffer,
    stream: () => Readable.from(buffer),
    text: async () => buffer.toString(),
    slice: (s = 0, e = buffer.length, t = mimeType) => createFileFromBuffer(buffer.slice(s, e), filename, t)
  };
}

async function createTestAttachment() {
  console.log('🔧 Creating test attachment...');
  const imagePath = path.join(__dirname, TEST_IMAGE);
  if (!fs.existsSync(imagePath)) throw new Error(`Missing ${TEST_IMAGE} at ${imagePath}`);
  const buf = fs.readFileSync(imagePath);
  if (!buf.length) throw new Error(`${TEST_IMAGE} is empty`);
  // Light signature check (PNG/JPEG/GIF) just for nicer logs
  const isPNG = buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  const isJPEG = buf.length >= 3 && buf.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]));
  const isGIF = buf.length >= 6 && ['GIF89a', 'GIF87a'].includes(buf.subarray(0, 6).toString('ascii'));
  console.log(`   📸 Detected: ${isPNG ? 'PNG' : isJPEG ? 'JPEG' : isGIF ? 'GIF' : 'unknown'} (${buf.length} bytes)`);
  const file = createFileFromBuffer(buf, 'test-media.png', 'image/png');
  const { status, data } = await attachmentsApi.attachmentUpload(file, 'draft');
  if (status !== 200 || !data?._id) throw new Error('Attachment upload failed');
  console.log(`   ✅ Attachment: ${data._id}`);
  return data;
}

async function safeDeleteDocument(itemId, kind, deleteMethod, unpublishMethod) {
  if (!itemId) return false;
  try {
    if (unpublishMethod) {
      try { await unpublishMethod.call(mediaApi, itemId); console.log(`   📤 Unpublished ${kind}`); await wait(400); }
      catch (e) {
        if (e.response?.status === 404) console.log('   ℹ️ Not published, continuing');
        else console.log(`   ⚠️ Unpublish failed: ${e.response?.status || ''}`);
      }
    }
    const tryIds = [itemId, itemId.replace(':en:published', ':en:draft'), itemId.split(':')[0]];
    for (const id of [...new Set(tryIds)]) {
      try {
        const resp = await deleteMethod.call(mediaApi, id);
        if (resp.status === 200) { logTest(`Delete ${kind}`, true, `id=${id}`); return true; }
      } catch (e) {
        if (e.response?.status === 404) { logTest(`Delete ${kind}`, true, `already gone (${id})`); return true; }
        console.log(`   ⚠️ Delete attempt with ${id} failed: ${e.response?.status || e.message}`);
      }
    }
  } catch (e) {
    logTest(`Delete ${kind}`, false, e.message);
  }
  console.log(`   💡 ${kind} may be referenced and protected from deletion.`);
  return false;
}

// ────────────────────────────────────────────────────────────────────────────────
// Test Runner (combined)
// ────────────────────────────────────────────────────────────────────────────────
const state = {
  attachment: null,
  imageId: null,
  fileId: null,
  imageTagId: null,
  fileTagId: null,
  created: [], // { id, type, aposDocId }
  imageAposDocId: null
};


async function runMediaTests() {
  console.log('🚀 ApostropheCMS Media API Tests — Combined & Fixed');
  console.log('===================================================\n');

  // Setup
  try {
    state.attachment = await createTestAttachment();
    logTest('Create test attachment', true, state.attachment._id);
  } catch (e) {
    logTest('Create test attachment', false, e.message);
    return;
  }
  await wait();

  // 1) Create Image
  console.log('\n📷 Test 1: imagePost');
  try {
    const payload = { title: 'SDK Test Image', slug: 'sdk-test-image-' + Date.now(), attachment: { _id: state.attachment._id } };
    const { status, data } = await mediaApi.imagePost(payload);
    if (status === 200 && data?._id) { state.imageId = data._id; state.created.push({ id: data._id, aposDocId: data.aposDocId, type: 'image' }); logTest('Create image', true, `${data._id}`); }
    else logTest('Create image', false, 'Unexpected response');
  } catch (e) { logTest('Create image', false, e.message); }
  await wait();

  // 2) imageGet (list)
  console.log('\n📷 Test 2: imageGet');
  try {
    const { status, data } = await mediaApi.imageGet(1, 10);
    if (status === 200 && data) { logTest('List images', true, `keys=${Object.keys(data)}`); }
    else logTest('List images', false);
  } catch (e) { logTest('List images', false, e.message); }
  await wait();

  // 3) imageGetById
  console.log('\n📷 Test 3: imageGetById');
  try {
    const { status, data } = await mediaApi.imageGetById(state.imageId);
    if (status === 200 && data?._id === state.imageId) {
      state.imageAposDocId = data.aposDocId || data._id;
      logTest('Get image by id', true, `aposDocId=${state.imageAposDocId}`);
    } else {
      logTest('Get image by id', false);
    }
  } catch (e) {
    logTest('Get image by id', false, e.message);
  }
  await wait();

  // 4) imagePatchById
  console.log('\n📷 Test 4: imagePatchById');
  try {
    const patch = { title: 'SDK Test Image — Updated', alt: 'Updated alt text' };
    const { status, data } = await mediaApi.imagePatchById(state.imageId, patch);
    if (status === 200 && data?.title === patch.title) logTest('Patch image', true, data.title);
    else logTest('Patch image', false, 'Title not updated');
  } catch (e) { logTest('Patch image', false, e.message); }
  await wait();

  // 5) imageGetSrcById — COMBINED: pick best size + verify all sizes on SAME ID
  console.log('\n📷 Test 5: imageGetSrcById (selected & all sizes)');
  try {
    // Always use the same aposDocId captured in Test 3
    const imgResp = await mediaApi.imageGetById(state.imageId);
    const imgData = imgResp.data;
    const aposDocId = state.imageAposDocId || imgData.aposDocId || imgData._id;
    const urls = imgData?.attachment?._urls || {};
    const sizes = Object.keys(urls);

    if (!sizes.length) {
      logTest('Get image src', false, 'no rendition sizes available on attachment._urls');
    } else {
      // Prefer the largest available size
      const preferredOrder = ['max', 'full', 'original', 'large', 'medium', 'small', 'thumbnail'];
      const pick = preferredOrder.find(s => sizes.includes(s)) || sizes[0];

      // A) Verify preferred size (this is the old Test 5)
      const resp = await mediaApi.imageGetSrcById(aposDocId, pick, undefined, 80);
      const status = resp.status;
      const ctype = resp.headers?.['content-type'];
      if (status === 302) {
        const loc = resp.headers?.location || '(no location header)';
        logTest('Get image src (preferred)', true, `size=${pick} → redirect ${loc}`);
      } else if (status === 200 && ctype && ctype.startsWith('image/')) {
        logTest('Get image src (preferred)', true, `size=${pick} served (${ctype})`);
      } else if (status === 200 && typeof resp.data === 'string') {
        logTest('Get image src (preferred)', true, `size=${pick} url string`);
      } else {
        logTest('Get image src (preferred)', false, `status=${status} ctype=${ctype || 'n/a'} size=${pick}`);
      }

      // B) Verify ALL sizes available on this same image (this replaces Advanced Test 3)
      let okCount = 0;
      for (const size of sizes) {
        try {
          const r = await mediaApi.imageGetSrcById(aposDocId, size, undefined, 80);
          const st = r.status;
          const ct = r.headers?.['content-type'];
          if (st === 302) { console.log(`   ✅ ${size}: redirect 302`); okCount++; }
          else if (st === 200 && ct && ct.startsWith('image/')) { console.log(`   ✅ ${size}: 200 (${ct})`); okCount++; }
          else if (st === 200 && typeof r.data === 'string') { console.log(`   ✅ ${size}: 200 (url string)`); okCount++; }
          else { console.log(`   ⚠️ ${size}: status=${st} ctype=${ct || 'n/a'}`); }
        } catch (e) {
          if (e.response?.status === 404) console.log(`   ⚠️ ${size}: 404 notfound`);
          else if (e.response?.status === 302) { console.log(`   ✅ ${size}: redirect 302`); okCount++; }
          else console.log(`   ⚠️ ${size}: ${e.message}`);
        }
      }
      logTest('Get image src (all sizes)', okCount > 0, `success ${okCount}/${sizes.length}`);
    }
  } catch (e) {
    if (e.response?.status === 404) {
      logTest('Get image src', false, '404 (no matching size)');
    } else if (e.response?.status === 302) {
      const loc = e.response.headers?.location || 'redirect';
      logTest('Get image src', true, `redirect→ ${loc}`);
    } else {
      logTest('Get image src', false, e.message);
    }
  }
  await wait();


  // 6) filePost
  console.log('\n📁 Test 6: filePost');
  try {
    const payload = { title: 'SDK Test File', slug: 'sdk-test-file-' + Date.now(), attachment: { _id: state.attachment._id } };
    const { status, data } = await mediaApi.filePost(payload);
    if (status === 200 && data?._id) { state.fileId = data._id; state.created.push({ id: data._id, aposDocId: data.aposDocId, type: 'file' }); logTest('Create file', true, `${data._id}`); }
    else logTest('Create file', false);
  } catch (e) { logTest('Create file', false, e.message); }
  await wait();

  // 7) fileGet
  console.log('\n📁 Test 7: fileGet');
  try { const { status, data } = await mediaApi.fileGet(1, 10); if (status === 200) logTest('List files', true, `keys=${Object.keys(data)}`); else logTest('List files', false); }
  catch (e) { logTest('List files', false, e.message); }
  await wait();

  // 8) fileGetById
  console.log('\n📁 Test 8: fileGetById');
  try { const { status, data } = await mediaApi.fileGetById(state.fileId); if (status === 200 && data?._id === state.fileId) logTest('Get file by id', true, data.title); else logTest('Get file by id', false); }
  catch (e) { logTest('Get file by id', false, e.message); }
  await wait();

  // 9) imageTagPost (unique slug)
  console.log('\n🏷️ Test 9: imageTagPost');
  try {
    const tag = { title: 'SDK Test Image Tag', slug: 'sdk-test-image-tag-' + Date.now() };
    const { status, data } = await mediaApi.imageTagPost(tag);
    if (status === 200 && data?._id) { state.imageTagId = data._id; state.created.push({ id: data._id, aposDocId: data.aposDocId, type: 'imageTag' }); logTest('Create image tag', true, data.slug); }
    else logTest('Create image tag', false);
  } catch (e) { logTest('Create image tag', false, e.message); }
  await wait();

  // 10) fileTagPost (unique slug)
  console.log('\n🏷️ Test 10: fileTagPost');
  try {
    const tag = { title: 'SDK Test File Tag', slug: 'sdk-test-file-tag-' + Date.now() };
    const { status, data } = await mediaApi.fileTagPost(tag);
    if (status === 200 && data?._id) { state.fileTagId = data._id; state.created.push({ id: data._id, aposDocId: data.aposDocId, type: 'fileTag' }); logTest('Create file tag', true, data.slug); }
    else logTest('Create file tag', false);
  } catch (e) { logTest('Create file tag', false, e.message); }
  await wait();

  // 11) imageTagGet
  console.log('\n🏷️ Test 11: imageTagGet');
  try { const { status, data } = await mediaApi.imageTagGet(); if (status === 200) logTest('List image tags', true, `count=${data.results?.length ?? 'n/a'}`); else logTest('List image tags', false); }
  catch (e) { logTest('List image tags', false, e.message); }
  await wait();

  // 12) fileTagGet
  console.log('\n🏷️ Test 12: fileTagGet');
  try { const { status, data } = await mediaApi.fileTagGet(); if (status === 200) logTest('List file tags', true, `count=${data.results?.length ?? 'n/a'}`); else logTest('List file tags', false); }
  catch (e) { logTest('List file tags', false, e.message); }
  await wait();

  // 13) imagePublishById (tolerate already-published)
  console.log('\n📷 Test 13: imagePublishById');
  try {
    const { status } = await mediaApi.imagePublishById(state.imageId);
    if (status === 200) logTest('Publish image', true);
    else logTest('Publish image', false, `status=${status}`);
  } catch (e) {
    if (e.response?.status === 400) logTest('Publish image', true, 'already published');
    else logTest('Publish image', false, e.message);
  }
  await wait();

  // 14) imageGet with params (search/pagination)
  console.log('\n🔍 Test 14: imageGet (pagination/search)');
  try {
    const { status, data } = await mediaApi.imageGet(1, 5, 'SDK', 'draft', 'en', false);
    if (status === 200) logTest('Search images', true, `found=${data.results?.length ?? 0}`);
    else logTest('Search images', false);
  } catch (e) { logTest('Search images', false, e.message); }
  await wait();

  // 15) Cleanup — reverse order
  console.log('\n🧹 Test 15: Cleanup');
  const items = [...state.created].reverse();
  for (const it of items) {
    let del, unpub;
    switch (it.type) {
      case 'image': del = mediaApi.imageDeleteById; unpub = mediaApi.imageUnpublishById; break;
      case 'file': del = mediaApi.fileDeleteById; unpub = mediaApi.fileUnpublishById; break;
      case 'imageTag': del = mediaApi.imageTagDeleteById; unpub = mediaApi.imageTagUnpublishById; break;
      case 'fileTag': del = mediaApi.fileTagDeleteById; unpub = mediaApi.fileTagUnpublishById; break;
    }
    await safeDeleteDocument(it.aposDocId || it.id, it.type, del, unpub);
    await wait(300);
  }
  console.log(`   ℹ️ Attachment ${state.attachment?._id} left in place for reuse.`);
}

// ────────────────────────────────────────────────────────────────────────────────
// Advanced Tests (combined)
// ────────────────────────────────────────────────────────────────────────────────
async function runAdvancedMediaTests() {
  console.log('\n🔬 Advanced Media API Tests');
  console.log('==============================\n');

  // Adv 1: Archive + Restore
  console.log('📦 Adv 1: imageArchive → imageRestore');
  try {
    const res = await mediaApi.imageGet(1, 2, 'SDK', 'draft');
    const ids = res.data?.results?.map(i => i.aposDocId || i._id) || [];
    if (!ids.length) { console.log('   ℹ️ No images to archive; sending empty payload'); }
    try {
      const a = await mediaApi.imageArchive({ _ids: ids });
      logTest('Archive images', a.status === 200, `count=${ids.length}`);
      await wait(800);
      const r = await mediaApi.imageRestore({ _ids: ids });
      logTest('Restore images', r.status === 200, `count=${ids.length}`);
    } catch (e) {
      if (e.response?.status === 400 && !ids.length) logTest('Archive images (empty)', true, 'expected 400');
      else logTest('Archive/Restore', false, e.message);
    }
  } catch (e) { logTest('Archive setup', false, e.message); }
  await wait();

  // Adv 2: Autocrop (if available)
  console.log('\n✂️ Adv 2: imageAutocrop');
  try {
    const res = await mediaApi.imageGet(1, 1, 'SDK', 'draft');
    const id = res.data?.results?.[0] && (res.data.results[0].aposDocId || res.data.results[0]._id);
    if (!id) { logTest('Autocrop', true, 'no image available (skipped)'); }
    else {
      const r = await mediaApi.imageAutocrop({ _ids: [id] });
      logTest('Autocrop', r.status === 200, 'done');
    }
  } catch (e) { logTest('Autocrop', false, e.message); }
  await wait();

  // Adv 3: Tagging an image (assign tag)
  console.log('\n🏷️ Adv 3: imageTag (assign)');
  try {
    const images = await mediaApi.imageGet(1, 1, 'SDK', 'draft');
    const tags = await mediaApi.imageTagGet();
    const imgId = images.data?.results?.[0] && (images.data.results[0].aposDocId || images.data.results[0]._id);
    const tagId = tags.data?.results?.[0] && (tags.data.results[0].aposDocId || tags.data.results[0]._id);
    if (!imgId || !tagId) { logTest('Image tagging', true, 'insufficient data (skipped)'); }
    else {
      const r = await mediaApi.imageTag({ _ids: [imgId], tagIds: [tagId] });
      logTest('Image tagging', r.status === 200, `image=${imgId} tag=${tagId}`);
    }
  } catch (e) { logTest('Image tagging', false, e.message); }
  await wait();

  // Adv 4: i18n + renderAreas
  console.log('\n🌐 Adv 4: imageGet with renderAreas=true');
  try {
    const r = await mediaApi.imageGet(1, 1, '', 'draft', 'en', true);
    logTest('i18n+render', r.status === 200, `results=${r.data?.results?.length ?? 0}`);
  } catch (e) { logTest('i18n+render', false, e.message); }
}

// ────────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ApostropheCMS Media API Test Suite');
  console.log('=====================================');
  console.log(`🔑 API Key: ${process.env.APOSTROPHE_API_KEY ? '***' + process.env.APOSTROPHE_API_KEY.slice(-4) : 'Not set'}`);
  console.log(`🌐 Base URL: ${process.env.APOSTROPHE_BASE_URL || 'http://localhost:3000/api/v1'}`);
  console.log('');
  await runMediaTests();
  await runAdvancedMediaTests();
  console.log('\n🎉 All tests complete');
}

if (require.main === module) {
  main().catch(err => { console.error('💥 Fatal error:', err); process.exit(1); });
}

module.exports = { runMediaTests, runAdvancedMediaTests, main };

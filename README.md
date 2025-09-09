# ApostropheCMS Typescript SDK Test Suite

This repository contains test scripts for validating the ApostropheCMS TypeScript SDK. Each test file corresponds to a set of API endpoints and demonstrates usage of the generated SDK functions.

## Setup

1. Create a project from the `starter-kit-essentials` repo.
2. Add an API key of `myapikey` in the express module options of your project (or update both Express and your `.env` file).
3. Clone or copy the `examples/typescript` folder from the `apostrophecms-openapi` repo to a local folder.
   (You may instead build a fresh SDK by running `npm run generate:typescript` in the root of that repo.)
4. Run `npm build` at the root of that folder.
5. Use `pwd` at the root to get the absolute path.
6. Switch to this repo and run `npm install <path>` to install the SDK locally.
7. Run each test with:

   ```bash
   node test-file-name.js
   ```

### Notes

* The **password reset route** is not currently working.
  To test it:

  * Set `RUN_PASSWORD_RESET_TESTS=true` in `.env`.
  * Modify your project’s `@apostrophecms/login/index.js` to include:

    ```js
    localLogin: true,
    passwordReset: true
    ```
* Make sure your ApostropheCMS instance is running with valid API key authentication.

---

## Test Files and SDK Functions

### 1. `attachments-api-tests.js`

**SDK functions tested:**

* `AttachmentsApi.attachmentUpload`
* `AttachmentsApi.attachmentCrop`

**Run with:**

```bash
node attachments-api-tests.js
```

---

### 2. `authorization-api-tests.js`

**SDK functions tested:**

* `AuthenticationApi.authContextPost`
* `AuthenticationApi.authContext` (deprecated GET)
* `AuthenticationApi.authWhoAmIPost`
* `AuthenticationApi.authWhoAmI` (deprecated GET)
* `AuthenticationApi.authLogin` (username/password and session modes)
* `AuthenticationApi.authResetRequest` (password reset)
* Bearer token flow with `AuthenticationApi.authWhoAmIPost`

**Run with:**

```bash
node authorization-api-tests.js
```

---

### 3. `global-api-tests.js`

**SDK functions tested:**

* `GlobalContentApi.globalGet`
* `GlobalContentApi.globalPost`
* `GlobalContentApi.globalGetById`
* `GlobalContentApi.globalPatchById`
* `GlobalContentApi.globalPublishById`
* `GlobalContentApi.globalGetLocalesById`

**Run with:**

```bash
node global-api-tests.js
```

---

### 4. `media-api-tests.js`

**SDK functions tested:**

* `MediaApi.imagePost`
* `MediaApi.imageGet`
* `MediaApi.imageGetById`
* `MediaApi.imagePatchById`
* `MediaApi.imageGetSrcById`
* `MediaApi.filePost`
* `MediaApi.fileGet`
* `MediaApi.fileGetById`
* `MediaApi.filePatchById`
* `MediaApi.fileGetSrcById`
* `MediaApi.imageArchive`, `MediaApi.fileArchive`
* `MediaApi.imageRestore`, `MediaApi.fileRestore`

**Run with:**

```bash
node media-api-tests.js
```

---

### 5. `pages-api-tests.js`

**SDK functions tested:**

* `PagesApi.pageGet`
* `PagesApi.pageGetById`
* `PagesApi.pagePost`
* `PagesApi.pagePatchById`
* `PagesApi.pagePublishById`
* `PagesApi.pageGetLocalesById`
* `PagesApi.pageArchive`
* `PagesApi.pageRestore`
* `PagesApi.pagePutById`

**Run with:**

```bash
node pages-api-tests.js
```

---

### 6. `user-api-tests.js`

**SDK functions tested:**

* `UsersApi.userList`
* `UsersApi.userUniqueUsername`
* `UsersApi.userCreate`
* `UsersApi.userGetById`
* `UsersApi.userPatchById`

**Run with:**

```bash
node user-api-tests.js
```

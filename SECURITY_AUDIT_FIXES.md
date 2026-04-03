# Security Audit and Code Scanning Fixes

## Date
2026-04-03

## Summary
This document details all security vulnerabilities identified through code scanning and the fixes implemented to address them.

## Critical Vulnerabilities Fixed

### 1. Authorization Bypass in Category Operations ✅
**Severity:** CRITICAL
**File:** `backend/src/controllers/categoryController.js`
**Lines:** 5-8, 18, 31, 41, 54

**Issue:** The category controller was not passing `req.user.id` to Category model methods, allowing users to access, modify, and delete categories belonging to other users.

**Fix Applied:**
- Updated `getAll()` to pass `req.user.id` to `Category.getAll()` and `Category.getByType()`
- Updated `getById()` to pass `req.user.id` to `Category.getById()`
- Updated `create()` to pass `req.user.id` to `Category.create()`
- Updated `update()` to pass `req.user.id` to `Category.update()`
- Updated `delete()` to pass `req.user.id` to `Category.delete()`

**Impact:** Prevents unauthorized access to other users' financial category data.

### 2. Hardcoded JWT Secret ✅
**Severity:** CRITICAL
**File:** `backend/src/middleware/auth.js`
**Line:** 6

**Issue:** The application used a hardcoded fallback JWT secret ('your-secret-key-change-in-production'), allowing attackers to forge authentication tokens if the environment variable wasn't set.

**Fix Applied:**
- Removed the fallback value for `JWT_SECRET`
- Added validation that throws an error if `JWT_SECRET` is not set
- Updated `.env.example` to emphasize JWT_SECRET is required
- Application now fails fast on startup if JWT_SECRET is missing

**Impact:** Eliminates the risk of authentication bypass through known default secrets.

## High Severity Vulnerabilities Fixed

### 3. Missing LIMIT Parameter Validation ✅
**Severity:** HIGH
**File:** `backend/src/controllers/transactionController.js`
**Line:** 13

**Issue:** The `limit` query parameter was not validated, allowing users to pass extremely large values or invalid inputs, potentially causing denial of service through memory exhaustion or slow database queries.

**Fix Applied:**
- Added validation using `parseInt()` with radix 10
- Check for `isNaN()` to reject invalid numbers
- Enforce bounds: minimum 1, maximum 1000
- Return 400 Bad Request with clear error message for invalid limits

**Impact:** Prevents denial of service attacks through resource exhaustion.

### 4. Path Traversal in File Uploads ✅
**Severity:** HIGH
**File:** `backend/src/routes/transactions.js`
**Lines:** 22-23

**Issue:** File upload functionality used `file.originalname` directly in the filename, potentially allowing path traversal attacks (e.g., `../../malicious.txt`).

**Fix Applied:**
- Import `basename` and `extname` from 'path' module
- Use `basename()` to remove any path components from original filename
- Sanitize filename by replacing special characters with underscores
- Only use the file extension from the sanitized name
- Generate filename using `timestamp-random${ext}` pattern

**Impact:** Prevents arbitrary file placement and potential server compromise.

## Medium Severity Issues Fixed

### 5. Weak Content Security Policy ✅
**Severity:** MEDIUM
**File:** `backend/src/middleware/security.js`
**Line:** 8

**Issue:** The CSP configuration included `'unsafe-inline'` for `styleSrc`, which weakens XSS protection by allowing inline styles.

**Fix Applied:**
- Removed `'unsafe-inline'` from `styleSrc` directive
- Now only allows styles from `'self'` origin

**Impact:** Strengthens XSS protection by enforcing stricter CSP.

**Note:** Frontend may need to use external stylesheets or CSS-in-JS solutions that generate separate style tags.

### 6. Weak Password Validation ✅
**Severity:** MEDIUM
**Files:** `backend/src/controllers/authController.js`
**Lines:** 16, 180, 269

**Issue:** Password minimum length was only 6 characters, below the current security best practice of 8+ characters.

**Fix Applied:**
- Updated password validation in `register()` from 6 to 8 character minimum
- Updated password validation in `changePassword()` from 6 to 8 character minimum
- Updated password validation in `resetPassword()` from 6 to 8 character minimum
- Updated all error messages to reflect new requirement

**Impact:** Reduces the risk of successful brute force attacks against user accounts.

### 7. Timing Attack in Password Reset ✅
**Severity:** MEDIUM
**File:** `backend/src/controllers/authController.js`
**Lines:** 273-283

**Issue:** Different code paths for invalid tokens vs expired tokens could leak information through timing differences, allowing attackers to enumerate valid tokens.

**Fix Applied:**
- Implemented constant-time token comparison using `crypto.timingSafeEqual()`
- Combined validity and expiry checks to ensure consistent response timing
- Added dummy comparison when token is invalid to maintain constant timing
- Return same error message for all failure cases

**Impact:** Prevents timing-based token enumeration attacks.

## Validation Results

All fixes have been validated:

✅ `auth.js` - Loads successfully with JWT_SECRET, fails correctly without it
✅ `categoryController.js` - Loads without syntax errors
✅ `transactionController.js` - Loads without syntax errors
✅ `transactions.js` (routes) - Loads without syntax errors
✅ `security.js` - Loads without syntax errors
✅ `authController.js` - Loads without syntax errors

## Known Issues

### Test Suite Configuration
The Jest test suite has a pre-existing configuration issue with ES modules that is unrelated to the security fixes. This was present before the security changes and does not affect the application runtime.

**Error:** `SyntaxError: Cannot use import statement outside a module`

**Status:** Not addressed in this security audit (test infrastructure issue)

## Low Severity Issues (Not Fixed in This PR)

The following low-severity issues were identified but not addressed in this security-focused PR:

1. **Alert() Usage for Error Messages** - Frontend UX improvement
2. **No HTTPS Enforcement** - Deployment configuration
3. **Insufficient Error Details Hiding** - Minor information disclosure
4. **No Logout Token Blacklisting** - Requires Redis implementation
5. **No Rate Limiting on File Uploads** - Resource management

These can be addressed in future improvements.

## Recommendations for Deployment

1. **Required Environment Variables:**
   - Ensure `JWT_SECRET` is set to a strong, random value (minimum 32 characters)
   - Generate using: `openssl rand -base64 64`

2. **Frontend Considerations:**
   - Review frontend for inline styles that may be blocked by stricter CSP
   - Use external stylesheets or properly configured CSS-in-JS solutions

3. **Password Policy:**
   - Inform users of new 8-character minimum requirement
   - Consider adding password complexity requirements in future updates

4. **Security Monitoring:**
   - Monitor authentication failures for unusual patterns
   - Set up alerts for repeated failed login attempts

## Files Modified

- `backend/src/controllers/categoryController.js` - Authorization fix
- `backend/src/middleware/auth.js` - JWT secret requirement
- `backend/src/controllers/transactionController.js` - LIMIT validation
- `backend/src/routes/transactions.js` - Filename sanitization
- `backend/src/middleware/security.js` - CSP improvement
- `backend/src/controllers/authController.js` - Password validation & timing attack fix
- `.env.example` - JWT_SECRET documentation

## Commit
SHA: 14bb0f2
Branch: claude/fix-code-scanning-findings

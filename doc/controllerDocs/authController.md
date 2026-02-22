# Auth Controller Documentation

## Overview

The `authController.js` file handles all authentication and authorization logic for the Natour's application. It manages user registration, login, password reset, and route protection.

---

## Functions

### 1. `jwtToken(id)`

**Type:** Helper Function

**Purpose:** Generates a JWT (JSON Web Token) for user authentication.

**Parameters:**

- `id` (String): The user's MongoDB ID

**Returns:**

- JWT token (String) that expires based on `JWT_EXPIRES_IN` environment variable

**How it works:**

- Signs the user ID with the JWT secret from environment variables
- Token includes expiration time
- Used after successful login and signup

**Example:**

```javascript
const token = jwtToken(newUser._id);
```

---

### 2. `createSendToken(user, statusCode, res)`

**Type:** Helper Function

**Purpose:** Generates JWT token, sets it as HTTP cookie, and sends response with token and user data. Centralizes token generation and response sending logic.

**Parameters:**

- `user` (Object): User document from database
- `statusCode` (Number): HTTP status code (201 for signup, 200 for login/reset)
- `res` (Response): Express response object

**Returns:** None (sends response directly)

**How it works:**

1. **Generate Token:** Calls `jwtToken(user._id)` to create JWT token
2. **Configure Cookie Options:**
   - `expires` - Set to `JWT_COOKIE_EXPIRES_IN` from environment (e.g., 90 days)
   - `secure` - Only true in production (HTTPS only)
   - `httpOnly` - True (prevents JavaScript access, prevents XSS attacks)
3. **Set Cookie:** Sends token as HTTP-only cookie via `res.cookie('jwt', token, cookieOptions)`
4. **Remove Password:** Sets `user.password = undefined` to prevent exposing password hash
5. **Send Response:** Returns JSON with status, token, and user data

**Cookie Security Features:**

- **httpOnly:** Prevents JavaScript from accessing the cookie (XSS protection)
- **secure:** Only sent over HTTPS in production
- **expires:** Limited lifetime, defaults to `JWT_COOKIE_EXPIRES_IN` days

**Response Format:**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: {
      _id, name, email, role, photo, ...
      // NOTE: password field is undefined
    }
  }
}
```

**Why Created:**

- **DRY Principle:** Reduces code duplication in signup, login, resetPassword, updatePassword
- **Consistency:** All auth endpoints follow same response format
- **Centralized Logic:** Cookie configuration in one place
- **Security:** Consistent token/cookie handling

**Usage Examples:**

Signup:

```javascript
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({...});
  createSendToken(newUser, 201, res);  // 201 Created
});
```

Login:

```javascript
exports.login = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email }).select('+password');
  // ... validate password ...
  createSendToken(user, 200, res); // 200 OK
});
```

Reset Password:

```javascript
exports.resetPassword = catchAsync(async (req, res, next) => {
  // ... reset logic ...
  createSendToken(user, 200, res);
});
```

Update Password:

```javascript
exports.updatePassword = catchAsync(async (req, res, next) => {
  // ... update logic ...
  createSendToken(user, 200, res);
});
```

**Before vs After:**

Before (without helper):

```javascript
const token = jwtToken(newUser._id);
res.status(201).json({
  status: 'success',
  token,
  data: { user: newUser },
});
// Repeated in signup, login, resetPassword, updatePassword
```

After (with helper):

```javascript
createSendToken(newUser, 201, res);
// Single line, used everywhere
```

---

### 3. `signup(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Registers a new user and logs them in immediately by returning a JWT token.

**Request Body:**

```javascript
{
  name: String,
  email: String,
  password: String,
  passwordConfirm: String,
  role: String (optional)
}
```

**Response:**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: {
      _id, name, email, role, ...
    }
  }
}
```

**How it works:**

1. Creates a new user with the provided credentials
2. Role is set from request body (unlike `req.body`, we explicitly define which fields to accept to prevent unauthorized admin signup)
3. Generates JWT token for the new user
4. Returns token and user data with 201 status code

**Important Notes:**

- Uses `catchAsync` wrapper to handle errors
- Does NOT use `User.create(req.body)` directly to prevent users from assigning themselves as admin
- No password strength validation implemented
- No email verification implemented

---

### 3. `signup(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Registers a new user and logs them in immediately by returning JWT token and setting auth cookie.

**Request Body:**

```javascript
{
  name: String,
  email: String,
  password: String,
  passwordConfirm: String,
  role: String (optional)
}
```

**Response (201 Created):**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: {
      _id, name, email, role, photo, ...
      // password field is undefined
    }
  }
}
```

**Response Headers:**

```
Set-Cookie: jwt={token}; Path=/; HttpOnly; [Secure]; Max-Age=...
```

**How it works:**

1. Creates a new user with explicit field assignment
   - Only accepts: name, email, password, passwordConfirm, role
   - Does NOT use `User.create(req.body)` to prevent field injection
   - Prevents users from assigning themselves as admin
2. Triggers user schema pre-save middleware:
   - Password is hashed with bcrypt
   - passwordConfirm is deleted (not stored)
3. Calls `createSendToken(newUser, 201, res)`:
   - Generates JWT token
   - Sets HTTP-only cookie with token
   - Removes password from response
   - Sends 201 Created response

**Important Notes:**

- Uses `catchAsync` wrapper for error handling
- User role is set from request body (usually defaults to 'user')
- No password strength validation implemented
- No email verification implemented
- User is immediately logged in after signup (no email confirmation required)

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "passwordConfirm": "securePassword123"
  }'
```

**Response Example:**

```javascript
{
  status: 'success',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  data: {
    user: {
      _id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      photo: undefined
    }
  }
}
```

---

### 4. `login(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Authenticates an existing user and returns a JWT token.

**Request Body:**

```javascript
{
  email: String,
  password: String
}
```

**Response:**

```javascript
{
  status: 'success',
  token: String
}
```

**How it works:**

1. **Validation:** Checks if email and password are provided, returns 400 error if missing
2. **User Lookup:** Finds user by email and explicitly selects the password field (normally hidden)
3. **Password Verification:** Uses user schema method `correctPassword()` to verify password hash
4. **Token Generation:** If credentials are valid, generates and returns JWT token
5. **Error Handling:** Returns 401 (Unauthorized) for incorrect email or password

**Error Cases:**

- Missing email or password → 400 Bad Request
- User not found or wrong password → 401 Unauthorized

---

### 4. `login(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Authenticates user and returns JWT token while setting auth cookie.

**Request Body:**

```javascript
{
  email: String,
  password: String
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: {
      _id, name, email, role, photo, ...
      // password field is undefined
    }
  }
}
```

**Response Headers:**

```
Set-Cookie: jwt={token}; Path=/; HttpOnly; [Secure]; Max-Age=...
```

**How it works:**

1. **Validation:** Checks if email and password are provided
   - Returns 400 Bad Request if missing
2. **User Lookup:** Finds user by email and explicitly selects password field
   - Password normally hidden, must explicitly select with `.select('+password')`
3. **Password Verification:** Uses user schema method `correctPassword()` to verify
   - Compares plaintext password with stored hash using bcrypt
   - Returns 401 Unauthorized if password incorrect
4. **Token Generation:** Calls `createSendToken(user, 200, res)`
   - Generates JWT token
   - Sets HTTP-only cookie
   - Removes password from response
   - Sends 200 OK response

**Error Cases:**

- Missing email or password → 400 Bad Request
- User not found → 401 Unauthorized (generic message)
- Password incorrect → 401 Unauthorized (generic message)

**Security Note:** Generic error messages ("Incorrect email or password") prevent attackers from determining if email exists in database (user enumeration prevention).

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

**Response Example:**

```javascript
{
  status: 'success',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  data: {
    user: {
      _id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user'
    }
  }
}
```

---

### 5. `protect(req, res, next)`

**Type:** Middleware (Async)

**Purpose:** Protects routes by verifying JWT token and ensuring user still exists.

**How it works:**

1. **Token Extraction:** Looks for token in `Authorization` header with "Bearer" prefix
   - Format: `Authorization: Bearer <token>`
   - Returns 401 if no token found
2. **Token Verification:** Uses `promisify(jwt.verify)` to verify token signature against JWT_SECRET
   - If token is invalid or expired, JWT library throws error
3. **User Existence Check:** Finds user in database by ID from decoded token
   - Returns 401 if user no longer exists
4. **Password Change Check:** Verifies user hasn't changed password after token was issued
   - Uses `changedPasswordAfter(iat)` method from user schema
   - Returns 401 if password was changed after token issue
5. **Grant Access:** If all checks pass, attaches user object to `req.user` and calls `next()`

**Error Cases:**

- No token → 401 Unauthorized (Not logged in)
- Invalid token → 401 Unauthorized
- User doesn't exist → 401 Unauthorized
- Password changed after token issued → 401 Unauthorized

**Usage in Routes:**

```javascript
router.post('/updateMe', protect, updateUser);
```

---

### 5. `protect(req, res, next)`

**Type:** Middleware (Async)

**Purpose:** Protects routes by verifying JWT token, checking user existence, and validating password hasn't changed.

**How it works:**

1. **Token Extraction:** Looks for token in `Authorization: Bearer {token}` header
   - Extracts token from header split by space
   - Returns 401 Unauthorized if no token found
2. **Token Verification:** Uses `promisify(jwt.verify)` to verify token signature
   - Verifies token against `JWT_SECRET` from environment
   - Decodes token to extract user ID and issue time (iat)
   - Returns 401 if token invalid or expired
3. **User Existence Check:** Finds user in database by decoded ID
   - Query: `User.findOne({ _id: decoded.id, active: { $ne: false } })`
   - Only finds users where `active` is not false (soft-delete pattern)
   - Returns 401 if user no longer exists or is inactive
4. **Password Change Validation:** Checks if password was changed after token was issued
   - Uses `changedPasswordAfter(decoded.iat)` method from user schema
   - Returns 401 if password was changed since token issue (invalidates old tokens)
5. **Grant Access:** If all checks pass:
   - Attaches user object to `req.user` for use in subsequent middleware/handlers
   - Calls `next()` to pass control

**Error Cases:**

- No token in Authorization header → 401 "You are not logged in!"
- Invalid or tampered token → 401 (JWT library error)
- Token expired → 401 (JWT library error)
- User no longer exists → 401 "The user belonging to this token does no longer exist"
- User is inactive (`active: false`) → 401 (not found)
- Password changed after token issue → 401 "User recently changed password! Please log in again"

**Usage in Routes:**

```javascript
// Protect single route
router.post('/updateMe', protect, updateUser);

// Protect multiple routes
router.use(protect); // All subsequent routes protected
router.get('/me', getCurrentUser);
router.patch('/update', updateProfile);
```

**Important Implementation Details:**

- Token extracted from Bearer scheme (standard HTTP authentication)
- User query includes `active: { $ne: false }` to support soft deletes
- Password change detection prevents token reuse after password change
- User object attached to request for downstream handlers

**Example of Protected Route Chain:**

```
Request with token
    ↓
protect() middleware
    ↓
Verify token signature
    ↓
Check user exists & is active
    ↓
Check password not changed
    ↓
req.user = user
    ↓
next() → Route handler
```

---

### 6. `restrictTo(...roles)`

**Type:** Higher-Order Middleware Function

**Purpose:** Authorizes users based on their role. Used in conjunction with `protect`.

**Parameters:**

- `roles` (Rest parameter): Variable number of role strings (e.g., 'admin', 'lead-guide')

**Returns:** Middleware function

**How it works:**

1. Returns a middleware function that captures the allowed roles in closure
2. Checks if the current user's role is included in the allowed roles array
3. Returns 403 (Forbidden) if user role is not authorized
4. Calls `next()` if user is authorized

**Error Case:**

- User role not in allowed roles → 403 Forbidden

**Usage in Routes:**

```javascript
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);
router.patch(
  '/tours/:id',
  protect,
  restrictTo('admin', 'lead-guide'),
  updateTour,
);
```

---

### 6. `restrictTo(...roles)`

**Type:** Higher-Order Middleware Factory

**Purpose:** Creates middleware that restricts access based on user roles. Used after `protect` middleware.

**Parameters:**

- `roles` (Rest parameter): Variable number of role strings (e.g., 'admin', 'lead-guide', 'user')

**Returns:** Middleware function

**How it works:**

1. **Factory Pattern:** Returns middleware function with roles captured in closure
2. **Role Check:** Checks if user's role (from `req.user` set by protect) is in allowed roles
3. **Authorization:**
   - Returns 403 Forbidden if user role not authorized
   - Calls `next()` if user role authorized

**Error Case:**

- User role not in allowed roles → 403 "You do not have permission to perform this action"

**Usage in Routes:**

```javascript
// Admin only
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

// Multiple roles
router.patch(
  '/tours/:id',
  protect,
  restrictTo('admin', 'lead-guide'),
  updateTour,
);

// Users only (reviews)
router.post('/reviews', protect, restrictTo('user'), createReview);
```

**Role Hierarchy:**

- `'user'` - Regular users (can book tours, create reviews)
- `'guide'` - Tour guides (can lead tours)
- `'lead-guide'` - Senior guides (can manage tours and guides)
- `'admin'` - Administrators (full system access)

**Example Middleware Chain:**

```
POST /api/v1/tours/:id
  ↓
protect middleware (authenticates user)
  ↓
restrictTo('admin', 'lead-guide')
  ↓
if user.role not in ['admin', 'lead-guide'] → 403
  ↓
updateTour handler
```

---

### 7. `forgotPassword(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Initiates password reset by sending reset token to user's email.

**Request Body:**

```javascript
{
  email: String;
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  message: 'Token sent to email!'
}
```

**How it works:**

1. **User Lookup:** Finds user by email address
   - Returns 404 Not Found if no user with that email
2. **Token Generation:** Calls user schema method `createPasswordResetToken()`
   - Generates random 32-byte (256-bit) token
   - Hashes token using SHA-256
   - Stores hashed token in database
   - Sets `passwordResetExpires` to 10 minutes from now
3. **Email Sending:** Constructs reset URL and sends email
   - Reset URL: `{protocol}://{host}/api/v1/users/resetPassword/{resetToken}`
   - Sends plaintext token in email (hashed version in DB)
   - Email contains warning if user didn't request reset
4. **Error Handling:** If email send fails:
   - Clears `passwordResetToken` and `passwordResetExpires`
   - Saves changes to database
   - Returns 500 Server Error

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgotPassword \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

**Response Example:**

```javascript
{
  status: 'success',
  message: 'Token sent to email!'
}
```

**Email Content Example:**

```
Subject: Your password reset token (valid for 10 minutes)

Body:
Forgot your password? Submit a PATCH request with your new password to:
https://app.com/api/v1/users/resetPassword/a1b2c3d4e5f6...

If you didn't forget your password, please ignore this email!
```

**Security Features:**

- Token sent via email (not in response)
- Plaintext token only in email, hashed in database
- 10-minute expiration window
- Token randomly generated, extremely unlikely collision
- Email notification if password reset requested

**Important Notes:**

- Uses `sendEmail` utility function
- Does NOT require authentication
- If email send fails, tokens are cleared to prevent stale tokens
- Used for users who forgot passwords (vs updatePassword for logged-in users)

---

### 8. `resetPassword(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Validates reset token and updates user password. Auto-logs user in with new token.

**Request Parameters:**

```javascript
{
  token: String (from URL like /resetPassword/{token})
}
```

**Request Body:**

```javascript
{
  password: String,
  passwordConfirm: String
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: Object
  }
}
```

**Response Headers:**

```
Set-Cookie: jwt={newToken}; Path=/; HttpOnly; [Secure]; Max-Age=...
```

**How it works:**

1. **Token Processing:** Hashes the reset token from URL
   - Uses same hashing as `createPasswordResetToken()`
   - Ensures token comparison is secure (hash vs hash)
2. **Token Validation:** Finds user with matching token and valid expiry
   - Query: `User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })`
   - Returns 400 Bad Request if token invalid or expired
3. **Password Update:** Sets new password and clears reset tokens
   - Assigns new password to `user.password`
   - Assigns confirmation to `user.passwordConfirm`
   - Clears `passwordResetToken` and `passwordResetExpires`
   - Saves user (triggers schema pre-save middleware for hashing)
4. **Auto-Login:** Calls `createSendToken(user, 200, res)`
   - Generates new JWT token
   - Sets HTTP-only cookie
   - Returns token and user data
   - User is immediately logged in

**Request Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/resetPassword/a1b2c3d4... \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newSecurePass123",
    "passwordConfirm": "newSecurePass123"
  }'
```

**Error Cases:**

- Token invalid/tampered → 400 "Token is invalid or has expired"
- Token expired (>10 min) → 400 "Token is invalid or has expired"
- Password validation fails → 400 (schema validation error)
- Passwords don't match → 400 "Passwords are not same"

**Security Considerations:**

- Token only valid for 10 minutes
- Token can only be used once (cleared after reset)
- Old password not required (different from `updatePassword`)
- User can only be locked out temporarily (reset restores access)
- Password hashing happens in user schema pre-save middleware

**Important Notes:**

- Different flow from `updatePassword` (no current password verification)
- Automatic login after reset (better UX)
- Reset token becomes invalid immediately after use
- Old JWT tokens still valid (password change doesn't invalidate existing sessions)

---

### 9. `updatePassword(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Allows authenticated users to change password while logged in.

**Request Body:**

```javascript
{
  currentPassword: String,
  newPassword: String,
  newPasswordConfirm: String
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  token: String,
  data: {
    user: Object
  }
}
```

**Response Headers:**

```
Set-Cookie: jwt={newToken}; Path=/; HttpOnly; [Secure]; Max-Age=...
```

**How it works:**

1. **Get User with Password:** Retrieves current user from database
   - Uses `req.user.id` set by `protect` middleware
   - Explicitly selects password field (normally hidden)
   - Returns 404 if user not found
2. **Verify Current Password:** Confirms user knows their current password
   - Uses `correctPassword()` method to compare hashes
   - Returns 401 Unauthorized if incorrect
3. **Update Password:** Sets new password and confirmation
   - Assigns `newPassword` to `user.password`
   - Assigns `newPasswordConfirm` to `user.passwordConfirm`
   - Saves user (triggers pre-save middleware for hashing and `passwordChangedAt` update)
4. **Token Generation:** Calls `createSendToken(user, 200, res)`
   - Generates new JWT token
   - Sets HTTP-only cookie
   - `passwordChangedAt` update invalidates old tokens
   - Returns new token and user data

**Prerequisites:**

- User must be authenticated (requires `protect` middleware)

**Request Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/updatePassword \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldPassword123",
    "newPassword": "newSecurePass456",
    "newPasswordConfirm": "newSecurePass456"
  }'
```

**Error Cases:**

- Not authenticated → 401 (from protect middleware)
- User not found → 404 Not Found
- Current password incorrect → 401 "Your current password is incorrect"
- New password validation fails → 400 (schema validation)
- Passwords don't match → 400 "Passwords are not same"

**Security Features:**

- Requires current password verification (prevents unauthorized changes)
- `passwordChangedAt` update invalidates all old tokens immediately
- All existing sessions become invalid after password change
- New password hashed before storing
- Requires prior authentication

**Important Notes:**

- Different from `resetPassword` (requires current password knowledge)
- Only available to authenticated users
- Immediately invalidates all other sessions
- More secure than reset (current password required)
- User must re-authenticate with new password elsewhere

**Comparison: updatePassword vs resetPassword**

| Aspect                    | updatePassword      | resetPassword           |
| ------------------------- | ------------------- | ----------------------- |
| Requires auth             | Yes (protect)       | No                      |
| Requires current password | Yes                 | No                      |
| Use case                  | User knows password | User forgot password    |
| Token invalidation        | Immediate           | Delayed (10 min window) |
| Email required            | No                  | Yes                     |
| User action               | Account security    | Account recovery        |

---

## Middleware Dependencies

- **catchAsync:** Wrapper for handling async errors
- **AppError:** Custom error class for operational errors
- **sendEmail:** Email utility for sending reset tokens

## User Schema Methods

These controller functions depend on methods defined in the User model:

- `correctPassword(candidatePassword, userPassword)` - Compares password hash
- `changedPasswordAfter(JWTimestamp)` - Checks if password was changed after token issue
- `createPasswordResetToken()` - Generates and hashes reset token

---

## Security Best Practices Implemented

1. **Selective Field Assignment:** Signup doesn't use `req.body` directly to prevent role injection
2. **Password Field Hidden:** Password normally excluded from queries, explicitly selected in login
3. **Token Expiration:** JWT tokens expire based on environment configuration
4. **Password Change Validation:** Users must re-login if they change password
5. **Reset Token Expiration:** Reset tokens valid for limited time only
6. **Role-Based Authorization:** Routes can be restricted to specific user roles
7. **Error Message Consistency:** Generic messages for auth failures to prevent user enumeration

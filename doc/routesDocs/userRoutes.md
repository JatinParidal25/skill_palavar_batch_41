# User Routes Documentation

## Overview

**File:** `routes/userRoutes.js`

**Purpose:** Define all HTTP endpoints for user authentication and account management

**Key Pattern:** Routes are organized in order - specific routes first, then protected routes, then admin routes

---

## Critical Concept: Route Order Matters

**This is VERY important:**

```javascript
// CORRECT ORDER:
router.post('/signup', signup); // 1. Specific routes
router.use(protect); // 2. Apply middleware
router.get('/me', getMe, getUser); // 3. Protected routes
router.use(restrictTo('admin')); // 4. Apply role check
router.get('/', getAllUsers); // 5. Admin-only routes

// WRONG ORDER (would not work):
router.use(protect); // Applied to ALL routes
router.post('/signup', signup); // signup requires login (wrong!)
```

**Why?** Middleware applies to all routes **defined after it**, not before.

---

## Route Order Breakdown

### Phase 1: Public Authentication Routes (No Login Needed)

```javascript
router.post('/signup', signup); // Register new user
router.post('/login', login); // User login
router.post('/forgotPassword', forgotPassword); // Request password reset
router.patch('/resetPassword/:token', resetPassword); // Reset with token
```

**These routes are public** - anyone can access, no authentication required.

---

### Phase 2: Apply Protection Middleware

```javascript
router.use(protect);
```

**What this does:**

- All routes **defined after this line** require authentication
- User must send valid JWT token in Authorization header
- Middleware sets `req.user` for subsequent handlers

---

### Phase 3: Protected Routes (Login Required)

```javascript
router.patch('/updatePassword', updatePassword); // Change own password
router.get('/me', getMe, getUser); // Get own profile
router.patch('/updateMe', updateMe); // Update own profile
router.delete('/deleteMe', deleteMe); // Deactivate account
```

**These routes require login** - `protect` middleware ensures this.

---

### Phase 4: Apply Role Check

```javascript
router.use(restrictTo('admin'));
```

**What this does:**

- All routes **defined after this line** require admin role
- User must have `role: 'admin'` in database
- Non-admin users get 403 Forbidden

---

### Phase 5: Admin-Only Routes

```javascript
router
  .route('/')
  .get(getAllUsers) // Get all users (admin only)
  .post(createUser); // Create user (admin only)

router
  .route('/:id')
  .get(getUser) // Get user details (admin only)
  .patch(updateUser) // Update user (admin only)
  .delete(deleteUser); // Delete user (admin only)
```

**These routes require admin role** - only administrators can access.

---

## All User Routes

### Phase 1: Public Routes (No Authentication)

#### 1. **POST /signup** - Register New User

```
POST /api/v1/users/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

**Purpose:** Create new user account

**Authentication:** Not required (public)

**Required Fields:**

- name (user's full name)
- email (must be unique)
- password (minimum 8 characters)
- passwordConfirm (must match password)

**What happens:**

1. Validates email is unique
2. Validates passwords match
3. Hashes password with bcrypt
4. Creates user in database
5. Generates JWT token
6. Automatically logs in

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "photo": "/img/users/default.jpg",
      "role": "user"
    }
  }
}
```

**Token Use:**

- Save token in frontend (localStorage/cookies)
- Send in Authorization header for protected routes:
  ```
  Authorization: Bearer {token}
  ```

---

#### 2. **POST /login** - User Login

```
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Purpose:** Authenticate user and get login token

**Authentication:** Not required (public)

**What happens:**

1. Finds user by email
2. Compares password with stored hash
3. If valid, generates JWT token
4. Returns token for use in requests

**Response (Success):**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Response (Failed):**

```json
{
  "status": "fail",
  "message": "Incorrect email or password"
}
```

---

#### 3. **POST /forgotPassword** - Request Password Reset

```
POST /api/v1/users/forgotPassword
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Purpose:** Initiate password reset process

**Authentication:** Not required (public)

**What happens:**

1. Finds user by email
2. Generates reset token (valid 10 minutes)
3. Sends email with reset link:
   ```
   http://localhost:3000/api/v1/users/resetPassword/[TOKEN]
   ```
4. User clicks link and resets password

**Response:**

```json
{
  "status": "success",
  "message": "Token sent to email!"
}
```

**Note:** No token returned - user receives email with reset link

---

#### 4. **PATCH /resetPassword/:token** - Reset Password with Token

```
PATCH /api/v1/users/resetPassword/abc123def456...
Content-Type: application/json

{
  "password": "newPassword123",
  "passwordConfirm": "newPassword123"
}
```

**Purpose:** Complete password reset process

**Authentication:** Not required, but must have valid reset token

**Parameters:**

- `:token` - Reset token from email (not in body, in URL)

**What happens:**

1. Finds user with this reset token
2. Checks token hasn't expired (10 minute limit)
3. Updates password
4. Clears reset token
5. Automatically logs in with new password

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

---

### Phase 2: Protected Routes (Login Required)

#### 5. **PATCH /updatePassword** - Change Password (Logged In)

```
PATCH /api/v1/users/updatePassword
Authorization: Bearer {token}
Content-Type: application/json

{
  "passwordCurrent": "oldPassword123",
  "password": "newPassword456",
  "passwordConfirm": "newPassword456"
}
```

**Purpose:** Change password when already logged in

**Authentication:** Required (login needed)

**What happens:**

1. Verifies current password is correct
2. Validates new passwords match
3. Updates password
4. Generates new JWT token (logs out from other devices)
5. Returns new token

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 6. **GET /me** - Get Own Profile

```
GET /api/v1/users/me
Authorization: Bearer {token}
```

**Purpose:** Get current logged-in user's profile

**Authentication:** Required (login needed)

**How it works:**

1. `getMe` middleware sets `req.params.id = req.user.id`
2. Passes to `getUser` handler
3. Returns user's own data

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "photo": "/img/users/john.jpg",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

#### 7. **PATCH /updateMe** - Update Own Profile

```
PATCH /api/v1/users/updateMe
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Purpose:** Update own profile information

**Authentication:** Required (login needed)

**Important Security:**

- Only allows updating: `name` and `email`
- Automatically blocks: `password`, `role`, `active` (security!)
- If user tries to send role: "admin", it's ignored

**What happens:**

1. Filters request body (only name, email allowed)
2. Updates user record
3. Returns updated user

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "photo": "/img/users/john.jpg",
      "role": "user"
    }
  }
}
```

**What Happens If You Try This:**

```javascript
// Frontend tries to hack:
{
  "name": "John Smith",
  "role": "admin"  // ← Will be ignored
}

// updateMe filters to:
{
  "name": "John Smith"
  // role removed by allowedFields filter
}
```

---

#### 8. **DELETE /deleteMe** - Deactivate Account

```
DELETE /api/v1/users/deleteMe
Authorization: Bearer {token}
```

**Purpose:** Deactivate user account (soft delete)

**Authentication:** Required (login needed)

**Important:** Account is NOT permanently deleted - it's hidden

**What happens:**

1. Sets `active: false` in database
2. User doesn't appear in any queries
3. User can reactivate by logging in
4. All user data is preserved

**How it works in Code:**

```javascript
// deleteMe handler
User.findByIdAndUpdate(req.user.id, { active: false });

// User model automatically filters:
pre(/^find/, function() {
  this.find({ active: { $ne: false } });
  // Excludes inactive users from all queries
});
```

**Response:**

```
Status: 204 No Content
(no body returned)
```

---

### Phase 3: Admin-Only Routes (Admin Role Required)

#### 9. **GET /** - Get All Users (Admin)

```
GET /api/v1/users
Authorization: Bearer {admin-token}
```

**Purpose:** Get list of all users (admin only)

**Authentication:** Required (login needed)

**Authorization:** `admin` role only

**Supports filters, sorting, pagination (like tours):**

```
GET /api/v1/users?role=guide&fields=name,email
GET /api/v1/users?sort=-createdAt&limit=20
```

**Response:**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "active": true
      }
      // ... more users
    ]
  }
}
```

---

#### 10. **POST /** - Create User (Admin)

```
POST /api/v1/users
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "role": "guide"
}
```

**Purpose:** Create new user (admin only)

**Authentication:** Required (login needed)

**Authorization:** `admin` role only

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "guide",
      "active": true
    }
  }
}
```

---

#### 11. **GET /:id** - Get User Details (Admin)

```
GET /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {admin-token}
```

**Purpose:** Get specific user's details (admin only)

**Authentication:** Required (login needed)

**Authorization:** `admin` role only

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "photo": "/img/users/john.jpg",
      "role": "user",
      "active": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

#### 12. **PATCH /:id** - Update User (Admin)

```
PATCH /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "role": "guide"
}
```

**Purpose:** Update any user's details (admin only)

**Authentication:** Required (login needed)

**Authorization:** `admin` role only

**What can be updated:**

- name, email, photo, role
- Note: Does NOT update password (use updatePassword endpoint)

**Response:**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "role": "guide"
    }
  }
}
```

---

#### 13. **DELETE /:id** - Delete User (Admin)

```
DELETE /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {admin-token}
```

**Purpose:** Delete user permanently (admin only)

**Authentication:** Required (login needed)

**Authorization:** `admin` role only

**What happens:**

- Permanently deletes user from database
- User's reviews remain (orphaned)
- Returns 204 No Content

**Response:**

```
Status: 204 No Content
(no body returned)
```

---

## Middleware Chain Explained

### How Middleware Works

```javascript
router.post('/signup', signup); // signup has NO middleware
router.use(protect); // protect applied to routes BELOW
router.get('/me', getMe, getUser); // Uses protect + getMe + getUser
router.use(restrictTo('admin')); // admin check applied to routes BELOW
router.get('/', getAllUsers); // Uses protect + restrictTo
```

**Processing Order:**

```
Request → Router → Check if route matches
           ↓
        If matches:
           ↓
        Execute middleware in order: protect → restrictTo → handler
           ↓
        Send response
```

### Multiple Middleware in One Route

```javascript
router.get('/me', getMe, getUser);
```

**Processes as:**

1. Check authentication (protect - applied globally)
2. Execute `getMe` middleware (sets req.params.id)
3. Execute `getUser` handler (returns user data)

**In Code:**

```javascript
// getMe middleware
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id; // Set ID to own user
  next(); // Continue to next handler
};

// Then getUser runs with req.params.id set
exports.getUser = factory.getOne(User);
```

---

## Using in Your Application

### Frontend Example (JavaScript)

```javascript
// Sign up
const signupResponse = await fetch('/api/v1/users/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    passwordConfirm: 'password123'
  })
});
const data = await signupResponse.json();
const token = data.token;

// Store token (localStorage or cookie)
localStorage.setItem('jwt', token);

// Use token in protected routes
const meResponse = await fetch('/api/v1/users/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const user = await meResponse.json();
```

### Backend Example (in another controller)

```javascript
// Import User model to check data
const User = require('../models/userModel');

// Get user data
const user = await User.findById(userId);

// Check if user is active
if (!user.active) {
  throw new Error('User account is deactivated');
}
```

---

## Common Authorization Patterns

### Public Routes (No Auth)

```
signup, login, forgotPassword, resetPassword
```

### User Routes (Any logged-in user)

```
updatePassword, getMe, updateMe, deleteMe
```

### Admin Routes (Admin only)

```
GET /users, POST /users, PATCH /users/:id, DELETE /users/:id
```

### Special Routes (Multiple roles)

In tour routes:

```javascript
// Only admin and lead-guide can create tours
router.post('/', restrictTo('admin', 'lead-guide'), createTour);

// Only admin, lead-guide, and guide can view schedule
router.get(
  '/monthly-plan/:year',
  restrictTo('admin', 'lead-guide', 'guide'),
  getMonthlyPlan
);
```

---

## Reference Table

| Route                   | Method | Auth | Role  | Purpose            |
| ----------------------- | ------ | ---- | ----- | ------------------ |
| `/signup`               | POST   | No   | -     | Register           |
| `/login`                | POST   | No   | -     | Login              |
| `/forgotPassword`       | POST   | No   | -     | Reset request      |
| `/resetPassword/:token` | PATCH  | No   | -     | Reset with token   |
| `/updatePassword`       | PATCH  | Yes  | -     | Change password    |
| `/me`                   | GET    | Yes  | -     | Get own profile    |
| `/updateMe`             | PATCH  | Yes  | -     | Update own profile |
| `/deleteMe`             | DELETE | Yes  | -     | Deactivate         |
| `/`                     | GET    | Yes  | admin | All users          |
| `/`                     | POST   | Yes  | admin | Create user        |
| `/:id`                  | GET    | Yes  | admin | User details       |
| `/:id`                  | PATCH  | Yes  | admin | Update user        |
| `/:id`                  | DELETE | Yes  | admin | Delete user        |

---

## Security Features

1. **Password Hashing:** Passwords never stored in plain text
2. **Token Expiry:** JWT tokens expire (check config)
3. **Field Filtering:** updateMe only allows name/email (can't become admin)
4. **Soft Delete:** Inactive users hidden from queries
5. **Rate Limiting:** Global limit on login attempts (in app.js)
6. **Password Reset Tokens:** Expire after 10 minutes

---

## 🧪 Testing Routes with Postman

Below are practical examples for testing each route in Postman.

### Setup

**Base URL:** `http://localhost:5000/api/v1`

**For Protected Routes:**

- Go to Authorization tab
- Select "Bearer Token"
- Paste your JWT token

---

### Phase 1: Public Routes (No Authentication)

#### 1. POST Signup

**Request:**

```
POST {{baseURL}}/users/signup
```

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "pass1234",
  "passwordConfirm": "pass1234"
}
```

**Expected Response (201):**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "photo": "default.jpg"
    }
  }
}
```

**Save Token:** In Tests tab:

```javascript
pm.environment.set('token', pm.response.json().token);
```

**Common Error (400):**

```json
{
  "status": "fail",
  "message": "Invalid input data. Passwords do not match"
}
```

---

#### 2. POST Login

**Request:**

```
POST {{baseURL}}/users/login
```

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "email": "john@example.com",
  "password": "pass1234"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Save Token:** In Tests tab:

```javascript
pm.environment.set('token', pm.response.json().token);
```

**Common Error (401):**

```json
{
  "status": "fail",
  "message": "Incorrect email or password"
}
```

---

#### 3. POST Forgot Password

**Request:**

```
POST {{baseURL}}/users/forgotPassword
```

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "email": "john@example.com"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "message": "Token sent to email!"
}
```

**Note:** Check your email (or Mailtrap if in development) for reset token.

**Common Error (404):**

```json
{
  "status": "fail",
  "message": "There is no user with that email address"
}
```

---

#### 4. PATCH Reset Password

**Request:**

```
PATCH {{baseURL}}/users/resetPassword/a1b2c3d4e5f6789...
```

**Note:** Replace token with the one from email

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "password": "newpass1234",
  "passwordConfirm": "newpass1234"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Common Error (400):**

```json
{
  "status": "fail",
  "message": "Token is invalid or has expired"
}
```

---

### Phase 2: Protected Routes (Login Required)

**⚠️ For all routes below, add Authorization header:**

```
Authorization: Bearer {{token}}
```

#### 5. PATCH Update Password

**Request:**

```
PATCH {{baseURL}}/users/updatePassword
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "passwordCurrent": "pass1234",
  "password": "newpass5678",
  "passwordConfirm": "newpass5678"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Update Token:** In Tests tab:

```javascript
pm.environment.set('token', pm.response.json().token);
```

**Common Error (401):**

```json
{
  "status": "fail",
  "message": "Your current password is wrong"
}
```

---

#### 6. GET My Profile

**Request:**

```
GET {{baseURL}}/users/me
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "photo": "default.jpg",
      "active": true
    }
  }
}
```

---

#### 7. PATCH Update My Profile

**Request:**

```
PATCH {{baseURL}}/users/updateMe
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON) - Only name and email allowed:**

```json
{
  "name": "John Updated",
  "email": "johnupdated@example.com"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "John Updated",
      "email": "johnupdated@example.com",
      "role": "user"
    }
  }
}
```

**⚠️ Attempting to update restricted fields:**

```json
{
  "role": "admin"
}
```

**Response (200 but role not changed):**

- Field is ignored due to filtering
- Role remains "user"

---

#### 8. DELETE Deactivate Account

**Request:**

```
DELETE {{baseURL}}/users/deleteMe
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Body:** None

**Expected Response (204 No Content):**

```
(Empty response body)
```

**Note:** User is not deleted, just marked as `active: false`

**Result:** User can no longer log in until reactivated by admin

---

### Phase 3: Admin Routes (Admin Role Required)

**⚠️ For all routes below:**

- Must be logged in
- User must have `role: 'admin'`

#### 9. GET All Users

**Request:**

```
GET {{baseURL}}/users
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 12,
  "data": {
    "users": [
      {
        "_id": "5c8a1d5b0190b214360dc057",
        "name": "Jonas Schmedtmann",
        "email": "admin@natours.io",
        "role": "admin"
      },
      {
        "_id": "5c8a1dfa2f8fb814b56fa181",
        "name": "Leo Gillespie",
        "email": "leo@example.com",
        "role": "guide"
      }
    ]
  }
}
```

**Common Error (403):**

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

---

#### 10. POST Create User (Admin)

**Request:**

```
POST {{baseURL}}/users
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "pass1234",
  "passwordConfirm": "pass1234",
  "role": "guide"
}
```

**Expected Response (201):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j2",
      "name": "New User",
      "email": "newuser@example.com",
      "role": "guide"
    }
  }
}
```

---

#### 11. GET Single User

**Request:**

```
GET {{baseURL}}/users/5c8a1d5b0190b214360dc057
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "5c8a1d5b0190b214360dc057",
      "name": "Jonas Schmedtmann",
      "email": "admin@natours.io",
      "role": "admin",
      "photo": "user-1.jpg",
      "active": true
    }
  }
}
```

**Common Error (404):**

```json
{
  "status": "fail",
  "message": "No user found with that ID"
}
```

---

#### 12. PATCH Update User (Admin)

**Request:**

```
PATCH {{baseURL}}/users/5c8a1dfa2f8fb814b56fa181
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "role": "lead-guide",
  "active": true
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "5c8a1dfa2f8fb814b56fa181",
      "name": "Leo Gillespie",
      "email": "leo@example.com",
      "role": "lead-guide",
      "active": true
    }
  }
}
```

---

#### 13. DELETE User (Admin)

**Request:**

```
DELETE {{baseURL}}/users/5c8a1dfa2f8fb814b56fa181
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Body:** None

**Expected Response (204 No Content):**

```
(Empty response body)
```

**Note:** This is a hard delete (actually removes from database)

---

### Postman Collection Setup

#### Environment Variables

Create a new environment with:

```
baseURL: http://localhost:5000/api/v1
token: (leave empty, will be set after login)
userId: (optional, for testing)
```

#### Collection Tests

Add to collection Tests tab:

```javascript
// Auto-save token from login/signup
if (pm.response.json().token) {
  pm.environment.set('token', pm.response.json().token);
  console.log('Token saved!');
}

// Test status code
pm.test('Status code is successful', function() {
  pm.response.to.have.status.oneOf([200, 201, 204]);
});
```

#### Pre-request Script

For dynamic emails in signup:

```javascript
// Generate unique email
const timestamp = Date.now();
pm.environment.set('testEmail', `test${timestamp}@example.com`);
```

Then use `{{testEmail}}` in request body.

---

### Testing Workflow

**1. Initial Setup:**

```
1. Signup new user → saves token
2. Or Login existing user → saves token
```

**2. Test Protected Routes:**

```
Token is automatically used from environment
```

**3. Test Admin Routes:**

```
Login as admin first
Then test admin endpoints
```

**4. Test Error Cases:**

```
- Remove token → test 401 errors
- Use wrong credentials → test validation
- Try admin route as user → test 403 errors
```

---

### Common Postman Tips

1. **Folder Organization:**

   ```
   User Routes/
   ├── 1. Public/
   │   ├── Signup
   │   ├── Login
   │   └── Forgot Password
   ├── 2. Protected/
   │   ├── Update Password
   │   ├── Get Me
   │   └── Update Me
   └── 3. Admin/
       ├── Get All Users
       └── Create User
   ```

2. **Global Authorization:**

   - Set at collection level
   - Type: Bearer Token
   - Token: `{{token}}`
   - Override for public routes

3. **Response Validation:**
   ```javascript
   pm.test('User has correct structure', function() {
     const user = pm.response.json().data.user;
     pm.expect(user).to.have.property('_id');
     pm.expect(user).to.have.property('email');
     pm.expect(user).to.have.property('role');
   });
   ```

---

## Summary

**User Routes Key Points:**

1. **Order matters** - Specific routes before general, middleware stacking
2. **Three phases:**
   - Public (signup, login, password reset)
   - Protected (user profile management)
   - Admin (user management)
3. **Soft delete** - Users deactivated, not deleted
4. **Field filtering** - updateMe only allows name/email
5. **Middleware chain** - protect, then restrictTo, then handler

**Remember:** When building features that need user data, use GET /me endpoint or access req.user in protected routes.

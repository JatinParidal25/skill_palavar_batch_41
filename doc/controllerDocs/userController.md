# User Controller Documentation

## Overview

The `userController.js` file contains route handlers for managing user data and profiles. Currently, most user management endpoints are not fully implemented and return placeholder 500 errors.

---

## Functions

### 1. `getAllUsers(req, res, next)`

**Type:** Route Handler (Async) ✅ **IMPLEMENTED**

**Purpose:** Retrieves all users from the database.

**Parameters:** None

**Response (200 OK):**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    users: [
      {
        _id: ObjectId,
        name: String,
        email: String,
        role: String,
        active: Boolean,
        ...
      }
    ]
  }
}
```

**How it works:**

1. Queries the database for all user documents
2. Returns array of users with total count
3. Wrapped with `catchAsync` for error handling

**Error Handling:**

- Database connection errors → 500 Server Error
- Any other async errors → caught and passed to error handler

**Request:** `GET /api/v1/users`

**Example Response:**

```javascript
{
  status: 'success',
  results: 3,
  data: {
    users: [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "John Doe",
        email: "john@example.com",
        role: "user",
        active: true
      },
      {
        _id: "507f1f77bcf86cd799439012",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "admin",
        active: true
      }
    ]
  }
}
```

---

### 2. `createUser(req, res, next)`

**Type:** Route Handler ⚠️ **NOT IMPLEMENTED**

**Purpose:** Creates a new user (placeholder endpoint).

**Status:** Returns 500 error with "This route is not yet defined" message

**Response (500):**

```javascript
{
  status: 'error',
  message: 'This route is not yet defined'
}
```

**Why not implemented:**

- User creation should be handled by the `signup` function in `authController.js`
- The signup endpoint handles password hashing, validation, and email verification
- This endpoint is reserved for admin-level user creation in the future

**Expected Future Implementation:**
When implemented, this will likely:

1. Accept user data in request body
2. Validate required fields
3. Hash password
4. Create user document
5. Return created user with 201 status

**Request:** `POST /api/v1/users`

---

### 3. `getUser(req, res, next)`

**Type:** Route Handler ⚠️ **NOT IMPLEMENTED**

**Purpose:** Retrieves a specific user by ID (placeholder endpoint).

**Status:** Returns 500 error with "This route is not yet defined" message

**Response (500):**

```javascript
{
  status: 'error',
  message: 'This route is not yet defined'
}
```

**Expected Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Why not implemented:**

- May conflict with user profile endpoints
- Authorization logic needed to prevent users from viewing other users' data
- Requires `protect` middleware to verify authentication

**Expected Future Implementation:**
When implemented, this will likely:

1. Extract user ID from request parameters
2. Verify authorization (own profile or admin)
3. Query database for user
4. Return user data or 404 if not found

**Expected Request:** `GET /api/v1/users/:id`

---

### 4. `updateUser(req, res, next)`

**Type:** Route Handler ⚠️ **NOT IMPLEMENTED**

**Purpose:** Updates user information (placeholder endpoint).

**Status:** Returns 500 error with "This route is not yet defined" message

**Response (500):**

```javascript
{
  status: 'error',
  message: 'This route is not yet defined'
}
```

**Expected Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Expected Request Body:**

```javascript
{
  name: String (optional),
  email: String (optional),
  photo: String (optional),
  // ... other updateable fields (NOT password)
}
```

**Why not implemented:**

- Security considerations: Password updates should use dedicated reset endpoints
- Field validation needed to prevent updating protected fields
- Email validation required if email is changed
- Photo upload handling may be needed

**Expected Future Implementation:**
When implemented, this will likely:

1. Verify authentication and authorization
2. Validate update data (excluding sensitive fields like password)
3. Update user document
4. Return updated user data with 200 status
5. Reject password updates (use dedicated password reset instead)

**Expected Request:** `PATCH /api/v1/users/:id`

---

### 5. `deleteUser(req, res, next)`

**Type:** Route Handler ⚠️ **NOT IMPLEMENTED**

**Purpose:** Deletes a user account (placeholder endpoint).

**Status:** Returns 500 error with "This route is not yet defined" message

**Response (500):**

```javascript
{
  status: 'error',
  message: 'This route is not yet defined'
}
```

**Expected Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Why not implemented:**

- Sensitive operation requiring careful authorization
- Should verify user password before deletion
- May need to handle user-created content (tours, reviews)
- Possibly implement soft delete (mark as inactive) instead of hard delete

**Expected Future Implementation:**
When implemented, this will likely:

1. Verify authentication and authorization (only user or admin)
2. Ask for password confirmation
3. Either:
   - Hard delete: Remove user document completely
   - Soft delete: Mark `active: false` instead of removing
4. Return 204 No Content status
5. Handle cleanup of user-related data

**Expected Request:** `DELETE /api/v1/users/:id`

---

## Dependencies

### Utilities

- **catchAsync:** Wrapper for handling async errors automatically
- Used by: `getAllUsers`

### Models

- **User:** Mongoose schema defining user structure and methods

---

## Current Implementation Status

| Function      | Status             | Notes                                  |
| ------------- | ------------------ | -------------------------------------- |
| `getAllUsers` | ✅ Implemented     | Returns all users with results count   |
| `createUser`  | ⚠️ Not Implemented | Use signup from authController instead |
| `getUser`     | ⚠️ Not Implemented | Reserved for future implementation     |
| `updateUser`  | ⚠️ Not Implemented | Reserved for future implementation     |
| `deleteUser`  | ⚠️ Not Implemented | Reserved for future implementation     |

---

## Security Considerations for Future Implementation

### For `createUser`

- Validate email format and uniqueness
- Enforce strong password requirements
- Hash passwords using bcrypt
- Consider email verification before activation
- Prevent privilege escalation (role assignment)

### For `getUser`

- Verify user owns the profile or is admin
- Don't expose sensitive fields (passwords, sensitive metadata)
- Consider hiding inactive users from search

### For `updateUser`

- Verify user owns the profile or is admin
- Prevent password updates via this endpoint (use dedicated password reset)
- Validate email changes (check uniqueness, verify new email)
- Whitelist updateable fields (name, email, photo, etc.)
- Don't allow role changes via this endpoint

### For `deleteUser`

- Require password confirmation
- Consider soft delete to preserve data integrity
- Clean up user-created content appropriately
- Log deletion for audit purposes
- Consider account deactivation period (recovery window)

---

## Integration Notes

### User Authentication Flow

```
User Registration → authController.signup()
  ↓
User Login → authController.login()
  ↓
Access Protected Routes → authController.protect()
  ↓
View User Profile → GET /api/v1/users/:id (not yet implemented)
```

### Future User Management Flow

```
Admin Views All Users → getAllUsers() ✅
  ↓
Admin Creates User → createUser() (planned)
  ↓
Admin Updates User → updateUser() (planned)
  ↓
Admin Deletes User → deleteUser() (planned)
  ↓
User Updates Own Profile → updateUser() (planned)
  ↓
User Deletes Own Account → deleteUser() (planned)
```

---

## Related Controllers

- **authController:** Handles signup, login, password reset
- **tourController:** Manages tours (may include user references)

---

## Request Examples (When Implemented)

### Get All Users

```
GET /api/v1/users
Authorization: Bearer {token}
```

### Get Specific User (Future)

```
GET /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {token}
```

### Update User Profile (Future)

```
PATCH /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

### Delete User Account (Future)

```
DELETE /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "currentPassword"
}
```

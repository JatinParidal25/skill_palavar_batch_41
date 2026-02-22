# User Model Documentation

## Overview

**File:** `models/userModel.js`

**Purpose:** Define user data structure, authentication methods, and validation

**Database Collection:** `users`

---

## What Is This Model?

A model defines:

- User profile information (name, email, photo)
- Password storage and management
- Authentication methods (password comparison, reset tokens)
- Role-based access control (admin, lead-guide, guide, user)
- Account status (active/inactive)

---

## User Schema Fields

### Account Information

#### `name` - Full Name

```javascript
type: String,
required: [true, 'Please provide your name']
```

**Example:** "John Doe"

**Validation:** Required - can't create user without name

---

#### `email` - Email Address

```javascript
type: String,
required: [true, 'Please provide your email'],
unique: true,
lowercase: true,
match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
```

**Example:** "john@example.com"

**Validation:**

- Required: Must provide email
- Unique: No two users can have same email
- Lowercase: Automatically stored as lowercase
- Format: Must be valid email (uses regex pattern)

---

#### `photo` - Profile Photo

```javascript
type: String,
default: '/img/users/default.jpg'
```

**Example:** "/img/users/john.jpg"

**Purpose:** User's profile picture URL

**Default:** Default avatar if not provided

---

#### `role` - User Role

```javascript
type: String,
enum: ['user', 'guide', 'lead-guide', 'admin'],
default: 'user'
```

**Valid values:**

- `'user'` - Regular user (can book tours, write reviews)
- `'guide'` - Tour guide (can lead tours)
- `'lead-guide'` - Senior guide (can create and manage tours)
- `'admin'` - Administrator (full system access)

**Example:** "user"

**Default:** 'user' (new signups are regular users)

**Purpose:** Determines what actions user can perform

---

### Password Security

#### `password` - Hashed Password

```javascript
type: String,
required: [true, 'Please provide a password'],
minlength: 8,
select: false  // NOT returned in queries by default
```

**Example:** "$2b$10$abcd1234..." (hashed with bcrypt)

**Important Points:**

- Stored as bcrypt hash (not plain text)
- Minimum 8 characters
- Hidden from queries (select: false) for security
- Never send password to frontend

**Validation:**

- Required on signup
- Must be 8+ characters
- User enters plain text, auto-hashed before saving

---

#### `passwordConfirm` - Confirmation Password

```javascript
type: String,
required: [true, 'Please confirm your password'],
validate: {
  validator: function(el) {
    return el === this.password;  // Must match password field
  },
  message: 'Passwords are not the same'
}
```

**Example:** "myPassword123" (must match password field)

**Purpose:** Ensures user typed password correctly during signup

**Important:** Only exists during signup - NOT stored in database

**Validation:** Must exactly match password field

---

#### `passwordChangedAt` - Last Password Change

```javascript
type: Date;
```

**Example:** "2024-01-15T10:30:00.000Z"

**Purpose:** Tracks when password was last changed

**Auto-set:** Updated automatically when password changes

**Usage:** Security check - if JWT was issued before password changed, token is invalid

---

#### `passwordResetToken` - Password Reset Token

```javascript
type: String;
```

**Example:** "abc123def456..." (hashed token)

**Purpose:** One-time token sent to email for password reset

**Security:** Stored as hash (not plain text)

**Lifetime:** Expires after 10 minutes

---

#### `passwordResetExpires` - Token Expiration Time

```javascript
type: Date;
```

**Example:** "2024-01-15T10:40:00.000Z" (10 minutes from creation)

**Purpose:** When password reset token expires

**Auto-set:** Calculated as current time + 10 minutes when reset requested

---

### Account Status

#### `active` - Account Active Status

```javascript
type: Boolean,
default: true,
select: false  // Hidden from queries by default
```

**Example:** true (account is active)

**Purpose:** Soft delete marker - deactivated accounts hidden from queries

**Values:**

- `true` - Account active (default)
- `false` - Account deactivated (not shown in queries)

**How it works:**

```javascript
// Pre-find middleware automatically excludes inactive users:
pre(/^find/, function () {
  this.find({ active: { $ne: false } }); // Exclude inactive
});
```

---

## Authentication Methods

### `correctPassword(candidatePassword, userPassword)`

**Purpose:** Verify password during login

**Parameters:**

- `candidatePassword` - Plain text password user entered
- `userPassword` - Stored bcrypt hash from database

**Returns:** boolean - true if match, false if not

**How it works:**

```javascript
// In database: password = "$2b$10$abcd1234..."
// User enters: "myPassword123"

const isCorrect = await user.correctPassword('myPassword123', user.password);
// Compares plain text with hash using bcrypt
// Returns: true (if matches) or false (if doesn't match)
```

**Usage in Login:**

```javascript
// authController.js
exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select(
    '+password',
  );

  if (
    !user ||
    !(await user.correctPassword(req.body.password, user.password))
  ) {
    throw new Error('Incorrect email or password');
  }
  // ... create token and send response
};
```

---

### `changedPasswordAfter(JWTTimestamp)`

**Purpose:** Check if password was changed after JWT was issued

**Parameters:**

- `JWTTimestamp` - Time JWT token was issued

**Returns:** boolean - true if password changed after token issued

**How it works:**

```javascript
// Token issued at: 2024-01-15 10:00:00
// Password changed at: 2024-01-15 10:30:00

const changed = user.changedPasswordAfter(1705315200); // JWTTimestamp
// Returns: true (password changed AFTER token issued)
```

**Usage in Protect Middleware:**

```javascript
// authController.js protect() function
exports.protect = async (req, res, next) => {
  const token = extractToken(req);
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);

  // Check if password changed after token issued
  if (user.changedPasswordAfter(decoded.iat)) {
    throw new Error('Password recently changed! Please login again');
  }

  req.user = user;
  next();
};
```

**Purpose:** Security - force re-login if password changed on different device

---

### `createPasswordResetToken()`

**Purpose:** Generate reset token for "forgot password" feature

**Returns:** Plain text token (hashed version is saved to DB)

**How it works:**

1. Generates random 32-byte token
2. Converts to hex string (64 characters)
3. Hashes token with SHA256
4. Saves hashed token to database
5. Returns plain text token (sent to user's email)

**Example:**

```javascript
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save(); // Save hashed token to DB

  // Send plain token to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  // Email: http://localhost:3000/api/v1/users/resetPassword/abc123...
};
```

**Security Flow:**

```
User clicks "Forgot Password"
    ↓
createPasswordResetToken() generates token
    ↓
Plain token sent to email
    ↓
Hashed token saved in DB (passwordResetToken field)
    ↓
User clicks email link with plain token
    ↓
resetPassword endpoint receives plain token
    ↓
Hashes received token, compares with DB hash
    ↓
If match and not expired, update password
```

**Why this approach?**

- Even if DB is compromised, tokens are useless (hashed)
- Tokens expire after 10 minutes
- One-time use only

---

## Middleware (Automatic Processing)

### Pre-save: Hash Password

```javascript
pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  // Hash password with bcrypt (10 salt rounds)
  this.password = await bcrypt.hash(this.password, 10);

  // Delete passwordConfirm field (not stored in DB)
  this.passwordConfirm = undefined;

  next();
});
```

**When:** Before saving user document

**What it does:**

1. Checks if password field was modified
2. Hashes plain text password with bcrypt
3. Removes passwordConfirm field (only for validation)
4. Saves hashed password to database

**Important:** Existing passwords NOT re-hashed (only when modified)

---

### Pre-save: Update passwordChangedAt

```javascript
pre('save', function (next) {
  // Only update if password modified and not new user
  if (!this.isModified('password') || this.isNew) return next();

  // Subtract 1 second so password changed timestamp is before token issued
  this.passwordChangedAt = Date.now() - 1000;

  next();
});
```

**When:** Before saving if password is modified

**What it does:**

1. Updates passwordChangedAt to current time
2. Subtracts 1 second (ensures token validity check works correctly)

**Purpose:** Tracks when password last changed for security

---

### Pre-find: Hide Inactive Users

```javascript
pre(/^find/, function (next) {
  // Only return active users
  this.find({ active: { $ne: false } });
  next();
});
```

**When:** Before ANY find query (find, findById, findByIdAndUpdate, etc.)

**What it does:**

- Automatically adds filter: `{ active: { $ne: false } }`
- Excludes users with active: false from all queries
- Implements soft delete pattern

**Example:**

```javascript
// Query:
const users = await User.find();

// Automatically becomes:
const users = await User.find({ active: { $ne: false } });

// Deactivated users NOT included
```

---

## Field Reference for Developers

**When building features, use this table:**

| Field                | Type    | Required     | Purpose               | Hidden by Default | Auto-set     |
| -------------------- | ------- | ------------ | --------------------- | ----------------- | ------------ |
| name                 | String  | Yes          | User's full name      | No                | No           |
| email                | String  | Yes (unique) | Email address         | No                | No           |
| photo                | String  | No           | Profile photo URL     | No                | No           |
| role                 | String  | No           | User permission level | No                | No           |
| password             | String  | Yes          | Hashed password       | Yes               | Yes (hashed) |
| passwordConfirm      | String  | Yes\*        | Confirmation password | N/A               | No (deleted) |
| passwordChangedAt    | Date    | No           | Last password change  | No                | Yes          |
| passwordResetToken   | String  | No           | Reset token (hashed)  | Yes               | No           |
| passwordResetExpires | Date    | No           | Token expiration      | Yes               | No           |
| active               | Boolean | No           | Account status        | Yes               | No           |

_\*\*Only required during signup_

---

## Using User Model in Controllers

### During Signup

```javascript
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'myPassword123',
  passwordConfirm: 'myPassword123', // Only for validation
  role: 'user', // Auto-set if not provided
});
// Middleware automatically:
// - Hashes password
// - Deletes passwordConfirm
// - Sets passwordChangedAt
```

### During Login

```javascript
const user = await User.findOne({ email }).select('+password');
const correct = await user.correctPassword(enteredPassword, user.password);
```

### Checking Password Change

```javascript
const user = await User.findById(userId);
const tokenIssueTime = decodedToken.iat; // Token issue time

if (user.changedPasswordAfter(tokenIssueTime)) {
  // Password changed after token issued - force re-login
}
```

### Soft Delete (Deactivate Account)

```javascript
await User.findByIdAndUpdate(userId, { active: false });

// Now deleted user NOT in any queries:
const users = await User.find(); // Doesn't include this user

// But data still in database - can be restored if needed
```

### Password Reset

```javascript
const resetToken = user.createPasswordResetToken();
await user.save(); // Save hashed token

// Later, when user submits reset:
const hashedReceived = crypto
  .createHash('sha256')
  .update(receivedToken)
  .digest('hex');

const user = await User.findOne({
  passwordResetToken: hashedReceived,
  passwordResetExpires: { $gt: Date.now() },
});
// Finds user by hashed token and checks expiration
```

---

## Common Security Patterns

### 1. Field Filtering for updateMe

```javascript
// User tries to update:
{
  name: 'John Smith',
  role: 'admin'  // HACK: Try to promote yourself
}

// allowedFields filters to only:
{
  name: 'John Smith'
  // role removed - can't change via updateMe
}
```

### 2. Soft Delete Pattern

```javascript
// Instead of deleting:
await User.findByIdAndDelete(userId); // ❌ Data lost

// Use soft delete:
await User.findByIdAndUpdate(userId, { active: false }); // ✅ Data preserved

// Automatic filtering hides deactivated users:
const users = await User.find(); // Inactive users excluded
```

### 3. Password Reset Token Security

```javascript
// Token flow:
1. User requests reset → createPasswordResetToken()
2. Plain token sent to email
3. Hashed token stored in DB
4. User clicks link with plain token
5. System hashes received token
6. Compares hash with DB hash
7. Allows reset only if match & not expired
```

### 4. Password Change Validation

```javascript
// When user logs in:
1. Extract JWT token
2. Verify signature
3. Get user from DB
4. Check changedPasswordAfter(token.iat)
5. If true → password changed → force re-login
```

---

## Validation Examples

### Valid Signup

```javascript
{
  name: 'John Doe',
  email: 'john@example.com',
  password: 'myPassword123',
  passwordConfirm: 'myPassword123',
  role: 'user'  // Optional, defaults to 'user'
}
```

### Invalid Signup

```javascript
{
  name: 'John',  // ✅ OK (name length not validated)
  email: 'invalid-email',  // ❌ Invalid email format
  password: 'short',  // ❌ Less than 8 characters
  passwordConfirm: 'different'  // ❌ Doesn't match password
}
```

---

## Important Security Features

1. **Password Hashing:** Uses bcrypt with 10 salt rounds
2. **Hidden Fields:**
   - password (select: false)
   - active (select: false)
   - passwordResetToken (select: false)
   - passwordResetExpires (select: false)
3. **Soft Delete:** Deactivated accounts hidden from queries
4. **Reset Token:** Expires after 10 minutes, hashed in database
5. **Field Filtering:** updateMe only allows name/email
6. **Role-based Access:** Different permissions for different roles

---

## Summary

**User Model:**

- Stores user profile (name, email, photo) and role
- Manages password hashing and authentication
- Implements password reset with token system
- Provides soft delete via active flag
- Offers authentication methods (correctPassword, changedPasswordAfter)
- Auto-hides inactive users from all queries

**Key Concepts:**

1. Passwords auto-hashed, never stored in plain text
2. passwordConfirm only for validation, not stored
3. Soft delete preserves data while hiding deactivated accounts
4. createPasswordResetToken() handles secure password reset
5. changedPasswordAfter() ensures token validity after password change

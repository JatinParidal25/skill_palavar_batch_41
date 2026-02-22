# Technical Concepts Deep Dive

## Overview

This guide explains the core technical concepts, patterns, and technologies used in the Natour's project. Perfect for understanding the "why" and "how" behind implementation decisions.

---

## Table of Contents

1. [Middleware Concept](#middleware-concept)
2. [Authentication & Authorization](#authentication--authorization)
3. [Mongoose & MongoDB](#mongoose--mongodb)
4. [Error Handling Philosophy](#error-handling-philosophy)
5. [Security Patterns](#security-patterns)
6. [API Design Patterns](#api-design-patterns)
7. [Code Patterns & Best Practices](#code-patterns--best-practices)

---

## Middleware Concept

### What is Middleware?

**Definition:** A function that has access to the request object (`req`), response object (`res`), and the next middleware function (`next`).

**Visual Representation:**

```
Request → MW1 → MW2 → MW3 → Route Handler → Response
```

### Middleware Function Signature

```javascript
function middleware(req, res, next) {
  // Do something with req/res
  next(); // Pass control to next middleware
}
```

### Three Actions Middleware Can Take

#### 1. Modify Request/Response

```javascript
app.use((req, res, next) => {
  req.user = { id: 123, name: 'John' }; // Add to request
  next();
});
```

#### 2. Send Response (End Chain)

```javascript
app.use((req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authorized',
    });
    // next() not called → chain ends
  }
  next();
});
```

#### 3. Pass to Next Middleware

```javascript
app.use((req, res, next) => {
  console.log('Logging request');
  next(); // Continue to next middleware
});
```

### Middleware Types

#### Application-level Middleware

```javascript
// Runs for ALL requests
app.use((req, res, next) => {
  console.log('Every request');
  next();
});

// Runs for specific path
app.use('/api/v1/tours', (req, res, next) => {
  console.log('Only for /api/v1/tours/*');
  next();
});
```

#### Router-level Middleware

```javascript
const router = express.Router();

// Only for this router's routes
router.use((req, res, next) => {
  console.log('In tour router');
  next();
});

router.get('/', getAllTours);
```

#### Error-handling Middleware

```javascript
// Special signature: (err, req, res, next)
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    message: err.message,
  });
});
```

### Middleware Stacking

```javascript
// Multiple middleware for one route
router.post(
  '/tours',
  protect, // MW 1: Authentication
  restrictTo('admin'), // MW 2: Authorization
  createTour, // MW 3: Route handler
);
```

**Execution Flow:**

```
Request
  ↓
protect (checks JWT)
  ├─ Valid → next()
  └─ Invalid → Send 401 response (END)
  ↓
restrictTo('admin') (checks role)
  ├─ Is admin → next()
  └─ Not admin → Send 403 response (END)
  ↓
createTour (create resource)
  └─ Send 201 response (END)
```

### Practical Example: protect Middleware

```javascript
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not logged in', 401));
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  // 4. Add user to request
  req.user = user;

  // 5. Pass to next middleware
  next();
});
```

---

## Authentication & Authorization

### Authentication vs Authorization

**Authentication:** Who are you?

- Login with email/password
- Verify JWT token
- Confirm identity

**Authorization:** What can you do?

- Check user role
- Verify permissions
- Control access

### JWT (JSON Web Token) Explained

#### What is a JWT?

A token that proves user identity without storing sessions on the server.

**Structure:**

```
header.payload.signature
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImlhdCI6MTYxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Parts:**

1. **Header** (eyJhbGci...)

   ```json
   { "alg": "HS256", "typ": "JWT" }
   ```

   Algorithm and type

2. **Payload** (eyJpZCI...)

   ```json
   { "id": "123", "iat": 1616239022 }
   ```

   User data (not sensitive!)

3. **Signature** (SflKxw...)
   ```
   HMACSHA256(
     base64UrlEncode(header) + "." + base64UrlEncode(payload),
     secret
   )
   ```
   Verifies token hasn't been tampered with

#### Creating a JWT

```javascript
const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign(
    { id }, // Payload
    process.env.JWT_SECRET, // Secret key
    { expiresIn: process.env.JWT_EXPIRES_IN }, // Options
  );
};

// Usage
const token = signToken(user._id);
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Verifying a JWT

```javascript
const { promisify } = require('util');

// Verify token
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

console.log(decoded);
// { id: '123', iat: 1616239022, exp: 1623975022 }
```

#### Why JWT is Stateless

**Traditional Sessions:**

```
1. User logs in
2. Server creates session
3. Stores session in database/memory
4. Sends session ID to client
5. Client sends session ID with each request
6. Server looks up session in database

Problem: Server must store ALL sessions
```

**JWT:**

```
1. User logs in
2. Server creates JWT
3. Sends JWT to client
4. Client sends JWT with each request
5. Server verifies JWT signature

Benefit: No storage needed! Token contains all info
```

### Token Expiration & Refresh

```javascript
// config.env
JWT_EXPIRES_IN=90d  // Token valid for 90 days

// After 90 days
jwt.verify(token, secret)
// TokenExpiredError: jwt expired

// User must log in again to get new token
```

**Refresh Token Pattern (Not Implemented):**

```javascript
// Login gives two tokens:
{
  accessToken: 'short-lived-token',  // 15 minutes
  refreshToken: 'long-lived-token'   // 90 days
}

// When accessToken expires:
// Use refreshToken to get new accessToken
// Without logging in again
```

### Password Security

#### Hashing vs Encryption

**Encryption:** Two-way (can decrypt)

```
encrypt("password") → "a1b2c3"
decrypt("a1b2c3") → "password"
```

**Hashing:** One-way (can't decrypt)

```
hash("password") → "a1b2c3"
unhash("a1b2c3") → IMPOSSIBLE!
```

**Why hash passwords?**

If database is breached, attackers can't decrypt passwords.

#### bcrypt Explained

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const hash = await bcrypt.hash('myPassword123', 10);
// $2a$10$abcdef... (60 characters)

// Verify password
const isValid = await bcrypt.compare('myPassword123', hash);
// true

const isInvalid = await bcrypt.compare('wrongPassword', hash);
// false
```

**What is the "10"?**

Salt rounds = how many times to hash the hash.

```
10 rounds = 2^10 = 1,024 iterations
12 rounds = 2^12 = 4,096 iterations
```

Higher = more secure but slower.

**How bcrypt.compare() works:**

```
1. Extract salt from stored hash
2. Hash provided password with same salt
3. Compare hashes
4. Return true if match
```

You can't "decrypt" the hash, but you can verify if a password matches.

#### Password Changed Timestamp

```javascript
// In userModel.js
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // Set timestamp when password changed
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
```

**Why `-1000` (subtract 1 second)?**

Sometimes JWT is created BEFORE database save completes:

```
10:00:00.000 - JWT created (iat: 1000)
10:00:00.100 - Database saves (passwordChangedAt: 1001)

// This would make JWT invalid!
// So we subtract 1 second to be safe
```

#### Checking if Password Changed After Token

```javascript
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false; // Not changed
};

// Usage in protect middleware
if (user.changedPasswordAfter(decoded.iat)) {
  return next(
    new AppError('Password recently changed. Please log in again', 401),
  );
}
```

**Why this matters:**

```
1. User logs in → Gets JWT (iat: 1000)
2. User's password is compromised
3. User changes password (passwordChangedAt: 2000)
4. Attacker tries to use old JWT (iat: 1000)
5. Check: 1000 < 2000 → Password changed after token
6. Reject request → User must log in with new password
```

### Authorization Patterns

#### Role-based Access Control (RBAC)

```javascript
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles = ['admin', 'lead-guide']

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission', 403));
    }

    next();
  };
};

// Usage
router.delete('/tours/:id', protect, restrictTo('admin'), deleteTour);
```

**How `...roles` works:**

```javascript
restrictTo('admin', 'lead-guide');
// Inside function: roles = ['admin', 'lead-guide']

restrictTo('admin');
// Inside function: roles = ['admin']
```

#### Closure in restrictTo

```javascript
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // This inner function "remembers" roles
    // Even after restrictTo() has finished executing
  };
};
```

**This is a closure:** The inner function has access to `roles` from outer function.

---

## Mongoose & MongoDB

### Schema vs Model

**Schema:** Blueprint for documents

```javascript
const tourSchema = new mongoose.Schema({
  name: String,
  price: Number,
});
```

**Model:** Constructor for creating documents

```javascript
const Tour = mongoose.model('Tour', tourSchema);
```

**Document:** Instance of a model

```javascript
const tour = new Tour({ name: 'Tour', price: 500 });
```

### Query Middleware

**Purpose:** Run functions before/after queries

```javascript
// Pre-query middleware
tourSchema.pre(/^find/, function (next) {
  // 'this' is the query object
  this.find({ secretTour: { $ne: true } });
  next();
});

// Post-query middleware
tourSchema.post(/^find/, function (docs, next) {
  // 'docs' is the result
  console.log(`Query returned ${docs.length} documents`);
  next();
});
```

**Regex `/^find/`:**

Matches all queries starting with "find":

- `find()`
- `findOne()`
- `findById()`
- `findOneAndUpdate()`
- etc.

### Document Middleware

**Purpose:** Run functions before/after save operations

```javascript
// Pre-save middleware
userSchema.pre('save', async function (next) {
  // 'this' is the document being saved
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Post-save middleware
userSchema.post('save', function (doc, next) {
  // 'doc' is the saved document
  console.log(`Saved user: ${doc.name}`);
  next();
});
```

**Only triggers on:**

- `.save()`
- `.create()`

**Does NOT trigger on:**

- `.findByIdAndUpdate()`
- `.updateOne()`
- `.updateMany()`

### Aggregation Middleware

**Purpose:** Modify aggregation pipeline

```javascript
tourSchema.pre('aggregate', function (next) {
  // 'this' is the aggregation object
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });
  next();
});
```

### Virtual Properties

**Purpose:** Computed fields not stored in database

```javascript
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// In database:
{ name: "Tour", duration: 14 }

// In response:
{ name: "Tour", duration: 14, durationWeeks: 2 }
```

**Why virtual?**

- Save database space
- Always up-to-date
- Derived from other fields

**Enable in query:**

```javascript
Tour.findById(id).select('+durationWeeks'); // Won't work!

// Must enable in schema:
tourSchema.set('toJSON', { virtuals: true });
tourSchema.set('toObject', { virtuals: true });
```

### Virtual Populate

**Purpose:** Populate without storing reference

```javascript
tourSchema.virtual('reviews', {
  ref: 'Review',           // Model to populate from
  foreignField: 'tour',    // Field in Review model
  localField: '_id'        // Field in Tour model
});

// In database:
Tour: { _id: '123', name: 'Tour' }
Review: { tour: '123', rating: 5 }

// After populate:
Tour: {
  _id: '123',
  name: 'Tour',
  reviews: [{ tour: '123', rating: 5 }]
}
```

### Indexes

**Purpose:** Speed up queries

```javascript
tourSchema.index({ price: 1, ratingsAverage: -1 });
// 1 = ascending, -1 = descending

// Speeds up queries like:
Tour.find().sort({ price: 1, ratingsAverage: -1 });
```

**Trade-off:**

- Faster reads
- Slower writes (index must be updated)
- More storage

### Validators

```javascript
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
    maxlength: [40, 'Name must be 40 characters or less'],
    minlength: [10, 'Name must be at least 10 characters'],
  },

  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
    min: [0, 'Price must be positive'],
  },

  difficulty: {
    type: String,
    required: true,
    enum: {
      values: ['easy', 'medium', 'difficult'],
      message: 'Difficulty must be easy, medium, or difficult',
    },
  },

  // Custom validator
  priceDiscount: {
    type: Number,
    validate: {
      validator: function (val) {
        // 'this' only works on NEW documents
        return val < this.price;
      },
      message: 'Discount ({VALUE}) must be less than price',
    },
  },
});
```

---

## Error Handling Philosophy

### Operational vs Programming Errors

**Operational Errors (Expected):**

- User not found
- Invalid input
- Network timeout
- File not found

**Handle:** Send clean error to client

**Programming Errors (Bugs):**

- Syntax error
- Undefined variable
- Infinite loop

**Handle:** Log, alert developers, crash gracefully

### Error Classification

```javascript
// Operational error
if (!tour) {
  return next(new AppError('No tour found', 404));
}

// AppError has:
{
  statusCode: 404,
  status: 'fail',
  isOperational: true,  // Mark as operational
  message: 'No tour found'
}
```

**In error controller:**

```javascript
if (err.isOperational) {
  // Send clean error to client
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
} else {
  // Programming error - don't leak details
  console.error('ERROR:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
}
```

### Error Handling Layers

```
Layer 1: try-catch / catchAsync
  → Catches errors in async functions

Layer 2: Express error middleware
  → Catches errors passed to next(err)

Layer 3: Unhandled rejection handler
  → Catches promise rejections outside Express

Layer 4: Uncaught exception handler
  → Catches synchronous errors outside Express
```

### Mongoose Error Handling

```javascript
// CastError (Invalid ID)
const tour = await Tour.findById('invalid-id');
// CastError: Cast to ObjectId failed

// Handle in error controller:
if (err.name === 'CastError') {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
}

// Duplicate key error
const tour = await Tour.create({ name: 'Existing Name' });
// MongoError: E11000 duplicate key error

// Handle:
if (err.code === 11000) {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}`;
  return new AppError(message, 400);
}

// Validation error
const tour = await Tour.create({ price: -100 });
// ValidationError: price: Price must be positive

// Handle:
if (err.name === 'ValidationError') {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
}
```

---

## Security Patterns

### Principle: Defense in Depth

Multiple layers of security:

```
1. Rate limiting → Prevent brute force
2. Helmet → Secure headers
3. Data sanitization → Prevent injection
4. XSS protection → Prevent script injection
5. HPP → Prevent parameter pollution
6. HTTPS → Encrypt data in transit
7. JWT → Secure authentication
8. Password hashing → Protect credentials
```

### OWASP Top 10 Mitigations

| Threat                    | Mitigation                              |
| ------------------------- | --------------------------------------- |
| Injection                 | mongoSanitize, input validation         |
| Broken Auth               | JWT, bcrypt, password policies          |
| XSS                       | xss-clean, Content Security Policy      |
| Access Control            | protect, restrictTo middleware          |
| Security Misconfiguration | helmet, secure headers                  |
| Sensitive Data Exposure   | HTTPS, encryption, hashing              |
| Insufficient Logging      | morgan, winston                         |
| CSRF                      | CSRF tokens (if using cookies for auth) |

### Security Checklist

- [ ] Rate limiting on all routes
- [ ] Rate limiting extra strict on auth routes
- [ ] Helmet for security headers
- [ ] Data sanitization (NoSQL injection)
- [ ] XSS protection
- [ ] Parameter pollution prevention
- [ ] HTTPS in production
- [ ] JWT with expiration
- [ ] Password hashing with bcrypt
- [ ] Input validation on all user data
- [ ] Environment variables for secrets
- [ ] CORS configured properly
- [ ] Error messages don't leak info

---

## API Design Patterns

### RESTful Principles

**Resource-based URLs:**

```
GET    /api/v1/tours        → Get all tours
POST   /api/v1/tours        → Create tour
GET    /api/v1/tours/:id    → Get one tour
PATCH  /api/v1/tours/:id    → Update tour
DELETE /api/v1/tours/:id    → Delete tour
```

**HTTP Methods:**

- GET: Retrieve data
- POST: Create new resource
- PATCH/PUT: Update resource
- DELETE: Remove resource

**Status Codes:**

- 200: Success
- 201: Created
- 204: No Content (deleted)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

### JSend Response Format

**Success:**

```json
{
  "status": "success",
  "data": {
    "tour": { ... }
  }
}
```

**Fail (Client Error):**

```json
{
  "status": "fail",
  "message": "Invalid input data"
}
```

**Error (Server Error):**

```json
{
  "status": "error",
  "message": "Something went wrong"
}
```

### Pagination Pattern

```javascript
// Request
GET /api/v1/tours?page=2&limit=10

// Response
{
  "status": "success",
  "results": 10,
  "page": 2,
  "data": {
    "tours": [...]
  }
}
```

### Filtering Pattern

```javascript
// Exact match
GET /api/v1/tours?difficulty=easy

// Operators
GET /api/v1/tours?price[gte]=500&price[lte]=1000

// Multiple filters
GET /api/v1/tours?difficulty=easy&duration[gte]=5
```

### Sorting Pattern

```javascript
// Ascending
GET /api/v1/tours?sort=price

// Descending
GET /api/v1/tours?sort=-price

// Multiple fields
GET /api/v1/tours?sort=price,ratingsAverage
```

### Field Selection Pattern

```javascript
// Include fields
GET /api/v1/tours?fields=name,duration,price

// Exclude fields
GET /api/v1/tours?fields=-__v,-createdAt
```

---

## Code Patterns & Best Practices

### Factory Pattern

**Problem:** Repetitive CRUD handlers

**Solution:** Generic factory functions

```javascript
// Before (repetitive)
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) return next(new AppError('No tour found', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError('No user found', 404));
  res.status(204).json({ status: 'success', data: null });
});

// After (factory)
exports.deleteTour = factory.deleteOne(Tour);
exports.deleteUser = factory.deleteOne(User);
```

### Controller Pattern

```
Thin controllers, fat models
```

**Controllers:** Handle HTTP (request/response)
**Models:** Handle business logic

**Bad:**

```javascript
// Controller has business logic
exports.createTour = catchAsync(async (req, res, next) => {
  // Calculate average rating
  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  req.body.ratingsAverage = avgRating;

  const tour = await Tour.create(req.body);
  res.status(201).json({ status: 'success', data: { tour } });
});
```

**Good:**

```javascript
// Controller just handles HTTP
exports.createTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.create(req.body);
  res.status(201).json({ status: 'success', data: { tour } });
});

// Model handles business logic
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([...]);
  await Tour.findByIdAndUpdate(tourId, {
    ratingsAverage: stats[0].avgRating
  });
};
```

### Separation of Concerns

```
routes/       → Define endpoints
controllers/  → Handle HTTP logic
models/       → Define data & business logic
utils/        → Shared utilities
```

### DRY Principle

**Don't Repeat Yourself**

**Bad:**

```javascript
const tour1 = await Tour.findById(req.params.id);
if (!tour1) return next(new AppError('No tour found', 404));

const tour2 = await Tour.findById(req.params.id);
if (!tour2) return next(new AppError('No tour found', 404));
```

**Good:**

```javascript
exports.getOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return next(new AppError('No document found', 404));
    res.status(200).json({ status: 'success', data: { data: doc } });
  });
```

### Async/Await Best Practices

**Always await promises:**

```javascript
// Bad
const tour = Tour.findById(id); // Returns promise, not tour!

// Good
const tour = await Tour.findById(id);
```

**Use catchAsync:**

```javascript
// Bad
exports.getTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({ status: 'success', data: { tour } });
  } catch (err) {
    next(err);
  }
};

// Good
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  res.status(200).json({ status: 'success', data: { tour } });
});
```

---

This documentation provides deep technical understanding of all core concepts used in the project.

# Application Setup & Middleware Guide

## Overview

This guide explains how the application is structured, initialized, and configured through `server.js` and `app.js`. Understanding these files is crucial as they form the foundation of the entire application.

---

## Table of Contents

1. [server.js - Application Entry Point](#serverjs---application-entry-point)
2. [app.js - Express Configuration](#appjs---express-configuration)
3. [Middleware Stack Explained](#middleware-stack-explained)
4. [Security Middleware](#security-middleware)
5. [Request Flow](#request-flow)

---

## server.js - Application Entry Point

**File:** `server.js`

### Purpose

The entry point of the application. Responsible for:

1. Database connection
2. Starting the Express server
3. Handling uncaught exceptions and unhandled rejections
4. Environment configuration

### Complete Code Breakdown

```javascript
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// ============================================
// SAFETY NET #1: Uncaught Exceptions
// ============================================
// Must be at the top to catch synchronous errors
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  process.exit(1);
});
```

**What is an Uncaught Exception?**

Synchronous errors that aren't caught by try-catch:

```javascript
console.log(x); // ReferenceError: x is not defined
// Without the handler above, the app would crash ungracefully
```

**Why at the top?**

The handler must be registered BEFORE any code runs that might throw an error.

**Why `process.exit(1)`?**

- `1` = Error exit code
- `0` = Success exit code
- Signals to the operating system that the app crashed

---

### Environment Configuration

```javascript
dotenv.config({ path: './config.env' });
```

**What does this do?**

Loads environment variables from `config.env` file into `process.env`.

**Example config.env:**

```env
NODE_ENV=development
PORT=5000
DATABASE=mongodb+srv://user:<PASSWORD>@cluster.mongodb.net/natours
DATABASE_PASSWORD=mySecretPassword
JWT_SECRET=my-ultra-secret-key
JWT_EXPIRES_IN=90d
```

**After loading:**

```javascript
process.env.NODE_ENV; // 'development'
process.env.PORT; // '5000'
process.env.DATABASE_PASSWORD; // 'mySecretPassword'
```

---

### Database Connection

```javascript
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(() => console.log('DB connection successful'));
```

**Step-by-step:**

1. **Get database URL** from environment variable
2. **Replace placeholder** `<PASSWORD>` with actual password
3. **Connect to MongoDB** using Mongoose
4. **Log success** if connection succeeds

**Why replace `<PASSWORD>`?**

Security! Never hardcode passwords in connection strings.

**Connection Options:**

- `useUnifiedTopology`: Use new MongoDB driver connection management
- `useNewUrlParser`: Use new URL parser instead of deprecated one

**What if connection fails?**

The promise rejection is caught by the unhandled rejection handler below.

---

### Start the Server

```javascript
const app = require('./app');

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

**Flow:**

1. **Import Express app** from app.js
2. **Get port** from environment (default: 5000)
3. **Start listening** on that port
4. **Log** when ready

**Why save to `server` variable?**

We need it to gracefully shut down later.

---

### Safety Net #2: Unhandled Rejections

```javascript
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
```

**What is an Unhandled Rejection?**

A promise rejection that wasn't caught with `.catch()`:

```javascript
// Example: Database query without .catch()
User.findById('invalid-id'); // Promise rejection, but no .catch()!
```

**Why `server.close()` first?**

**Graceful shutdown:**

1. Stop accepting new requests
2. Wait for current requests to finish
3. Then exit

**vs Immediate `process.exit(1)`:**

- Would kill mid-request
- Could corrupt data
- Bad user experience

---

### Error Handling Philosophy

```
┌─────────────────────────────────────┐
│  Synchronous Errors                 │
│  (Uncaught Exceptions)              │
│  → uncaughtException handler        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Async Errors in Route Handlers     │
│  → catchAsync → Express Error MW    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Async Errors Outside Routes        │
│  (Unhandled Rejections)             │
│  → unhandledRejection handler       │
└─────────────────────────────────────┘
```

**Best Practice:**

These handlers are **safety nets**, not primary error handling:

- Use try-catch for sync code
- Use catchAsync for async routes
- Use .catch() for promises
- Let these handlers catch what slips through

---

## app.js - Express Configuration

**File:** `app.js`

### Purpose

Configures the Express application with:

1. Security middleware
2. Request processing middleware
3. Routes
4. Error handling

### Middleware Stack Order (CRITICAL!)

```javascript
const express = require('express');
const app = express();

// 1. Security Middleware
app.use(helmet());
app.use(limiter);
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// 2. Utility Middleware
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body parser

// 3. Custom Middleware
app.use((req, res, next) => { ... });

// 4. Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// 5. 404 Handler
app.all('*', (req, res, next) => { ... });

// 6. Error Handler
app.use(globalErrorHandler);
```

**Why does order matter?**

Middleware executes top-to-bottom. Each middleware can:

- Process the request
- Send a response (ending the chain)
- Call `next()` to pass to the next middleware

---

## Middleware Stack Explained

### 1. Security: helmet()

```javascript
const helmet = require('helmet');
app.use(helmet());
```

**Purpose:** Sets security-related HTTP headers

**Headers Added:**

- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - Enable XSS filter
- `Strict-Transport-Security` - Force HTTPS

**Attack Prevented:** Cross-site scripting (XSS), clickjacking, MIME attacks

**Example:**

Without helmet:

```
HTTP/1.1 200 OK
Content-Type: application/json
```

With helmet:

```
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Type: application/json
```

---

### 2. Security: Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  max: 100, // Maximum requests
  windowMs: 60 * 60 * 1000, // Time window (1 hour)
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter);
```

**What it does:**

Limits each IP to 100 requests per hour to `/api/*` endpoints.

**How it works:**

```
Request 1-100: ✅ Allowed
Request 101:   ❌ 429 Too Many Requests

Wait 1 hour → Counter resets
```

**Why needed?**

Prevents:

- Brute force attacks (password guessing)
- DoS attacks (overwhelming server)
- API abuse

**Response when limited:**

```json
{
  "status": "error",
  "message": "Too many requests from this IP, please try again in an hour!"
}
```

**Storage:**

By default, stores request counts in memory. For production with multiple servers, use Redis:

```javascript
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  max: 100,
  windowMs: 60 * 60 * 1000,
});
```

---

### 3. Logging: morgan()

```javascript
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
```

**Purpose:** Log HTTP requests to console

**Output Example:**

```
GET /api/v1/tours 200 45.123 ms - 1234
POST /api/v1/users/login 401 12.456 ms - 56
```

**Format:**

```
METHOD URL STATUS_CODE RESPONSE_TIME - CONTENT_LENGTH
```

**Why only in development?**

In production, use a proper logging service (Winston, Loggly, etc.) to:

- Store logs persistently
- Search and analyze logs
- Set up alerts

---

### 4. Body Parser: express.json()

```javascript
app.use(express.json());
```

**Purpose:** Parse JSON request bodies

**What it does:**

```javascript
// Request:
POST /api/v1/tours
Content-Type: application/json

{"name": "Tour Name", "price": 500}

// Without express.json():
req.body // undefined

// With express.json():
req.body // { name: "Tour Name", price: 500 }
```

**Size Limit (Security):**

```javascript
app.use(express.json({ limit: '10kb' }));
```

Rejects requests with bodies larger than 10kb. Prevents:

- Memory exhaustion
- DoS attacks with huge payloads

---

### 5. Security: Data Sanitization (NoSQL Injection)

```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

**Purpose:** Remove MongoDB operators from user input

**Attack Example:**

```javascript
// Malicious login attempt:
POST /api/v1/users/login
{
  "email": { "$gt": "" },  // This matches ALL emails!
  "password": "anything"
}

// Without sanitization:
User.findOne({ email: { "$gt": "" } })
// Returns first user in database!

// With sanitization:
User.findOne({ email: "{ \"$gt\": \"\" }" })
// No match, login fails ✅
```

**How it works:**

Removes or escapes MongoDB operators (`$`, `.`) from:

- `req.body`
- `req.query`
- `req.params`

**Options:**

```javascript
// Remove operators
app.use(mongoSanitize());

// Replace with _
app.use(mongoSanitize({ replaceWith: '_' }));
```

---

### 6. Security: XSS Protection

```javascript
const xss = require('xss-clean');
app.use(xss());
```

**Purpose:** Sanitize user input to prevent Cross-Site Scripting (XSS)

**Attack Example:**

```javascript
// Malicious input:
POST /api/v1/tours
{
  "name": "<script>alert('HACKED!')</script>"
}

// Without XSS protection:
// Script tag stored in database
// When rendered: alert() executes!

// With XSS protection:
// HTML/JS tags converted to safe strings
{
  "name": "&lt;script&gt;alert('HACKED!')&lt;/script&gt;"
}
```

**What it cleans:**

- Removes/escapes HTML tags
- Removes/escapes JavaScript code
- Cleans `req.body`, `req.query`, `req.params`

---

### 7. Security: HTTP Parameter Pollution

```javascript
const hpp = require('hpp');

app.use(
  hpp({
    whitelist: [
      'duration',
      'price',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
    ],
  }),
);
```

**Purpose:** Prevent parameter pollution attacks

**Attack Example:**

```javascript
// Malicious query:
GET /api/v1/tours?sort=price&sort=duration

// Without HPP:
req.query.sort // ['price', 'duration'] (array!)
query.sort(req.query.sort) // Error! sort() expects string

// With HPP:
req.query.sort // 'duration' (last value, string)
```

**Whitelist:**

```javascript
// These parameters CAN have multiple values:
GET /api/v1/tours?duration=5&duration=7
// Allowed! Find tours with duration 5 OR 7

// Other parameters:
GET /api/v1/tours?page=1&page=2
// Takes last value: page=2
```

**Why whitelist duration, price, etc?**

For filtering:

```
GET /api/v1/tours?duration[gte]=5&duration[lte]=10
```

Without whitelisting, this could break.

---

### 8. Custom Middleware

```javascript
app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
```

**Purpose:** Add custom functionality

**Middleware #1:**

- Logs message for every request
- Demonstrates middleware execution
- Useful for debugging

**Middleware #2:**

- Adds `requestTime` property to request object
- Available in all subsequent middleware/routes

**Usage:**

```javascript
exports.getAllTours = catchAsync(async (req, res, next) => {
  console.log(`Request received at: ${req.requestTime}`);
  // ...
});
```

---

### 9. Route Mounting

```javascript
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
```

**What is Route Mounting?**

Connecting routers to URL paths.

**How it works:**

```javascript
// Request: GET /api/v1/tours/123

// Step 1: app.use('/api/v1/tours', tourRouter)
// Matches /api/v1/tours
// Passes control to tourRouter

// Step 2: In tourRouter
router.get('/:id', getTour);
// Matches /:id (123)
// Calls getTour controller
```

**Path Matching:**

| Request URL            | Mounted Path    | Router Path | Match? |
| ---------------------- | --------------- | ----------- | ------ |
| `/api/v1/tours`        | `/api/v1/tours` | `/`         | ✅ Yes |
| `/api/v1/tours/123`    | `/api/v1/tours` | `/:id`      | ✅ Yes |
| `/api/v1/users/signup` | `/api/v1/users` | `/signup`   | ✅ Yes |
| `/api/v1/tours`        | `/api/v1/users` | -           | ❌ No  |

---

### 10. 404 Handler

```javascript
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
```

**Purpose:** Handle requests that don't match any route

**`app.all('*')`:**

- `all`: Any HTTP method (GET, POST, PUT, DELETE, etc.)
- `'*'`: Any URL

**Why is this at the end?**

If execution reaches here, no previous route matched.

**Example:**

```
GET /api/v1/tours ✅ Handled by tourRouter
GET /api/v1/invalid ❌ No route matches
                    → Falls through to 404 handler
                    → Creates AppError
                    → Passes to error middleware
```

**Response:**

```json
{
  "status": "fail",
  "message": "Can't find /api/v1/invalid on this server"
}
```

---

### 11. Global Error Handler

```javascript
const globalErrorHandler = require('./controllers/errorController');
app.use(globalErrorHandler);
```

**Purpose:** Catch all errors and send appropriate responses

**How it works:**

```javascript
// Any middleware/route calls next(error)
next(new AppError('Something went wrong', 500));

// Error skips all normal middleware
// Goes straight to error handler

// Error handler sends response
res.status(500).json({
  status: 'error',
  message: 'Something went wrong',
});
```

**Must be last middleware** because:

1. It catches errors from all previous middleware
2. Nothing should come after it

See [errorController.md](controllerDocs/errorController.md) for details.

---

## Request Flow Diagram

```
1. Client Request
   ↓
2. helmet() - Add security headers
   ↓
3. limiter - Check rate limit
   ↓
4. morgan() - Log request (dev only)
   ↓
5. express.json() - Parse JSON body
   ↓
6. mongoSanitize() - Remove NoSQL operators
   ↓
7. xss() - Remove XSS attacks
   ↓
8. hpp() - Prevent param pollution
   ↓
9. Custom middleware - Add requestTime
   ↓
10. Route matching
    ├─ /api/v1/tours → tourRouter
    ├─ /api/v1/users → userRouter
    ├─ /api/v1/reviews → reviewRouter
    └─ No match → 404 handler
       ↓
11. Controller function
    ├─ Success → Send response
    └─ Error → next(error)
       ↓
12. Error Handler - Send error response
```

---

## Environment Variables Explained

**File:** `config.env`

```env
# App Environment
NODE_ENV=development          # 'development' or 'production'
PORT=5000                      # Server port

# Database
DATABASE=mongodb+srv://user:<PASSWORD>@cluster.mongodb.net/natours
DATABASE_PASSWORD=secretpass   # Replace <PASSWORD> with this

# JWT (JSON Web Token)
JWT_SECRET=my-ultra-secure-secret-key-change-this
JWT_EXPIRES_IN=90d            # Token lifetime
JWT_COOKIE_EXPIRES_IN=90      # Cookie lifetime (days)

# Email (Development - Mailtrap)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password

# Email (Production - Example with SendGrid)
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_USERNAME=apikey
# EMAIL_PASSWORD=your_sendgrid_api_key
```

### Usage in Code

```javascript
// Get environment
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}

// Get port
const port = process.env.PORT || 5000;

// Build database connection
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// Sign JWT token
jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});
```

---

## Security Best Practices

### 1. Rate Limiting

```javascript
// Stricter limits for authentication endpoints
const authLimiter = rateLimit({
  max: 5, // Only 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'Too many login attempts, please try again in 15 minutes',
});

app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/signup', authLimiter);
```

### 2. Helmet Configuration

```javascript
// Custom helmet config
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
);
```

### 3. CORS (Cross-Origin Resource Sharing)

```javascript
const cors = require('cors');

// Allow all origins (development)
app.use(cors());

// Allow specific origin (production)
app.use(
  cors({
    origin: 'https://www.natours.com',
    credentials: true,
  }),
);
```

### 4. Body Parser Limits

```javascript
// Limit request body size
app.use(express.json({ limit: '10kb' }));

// Limit URL-encoded body size
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  }),
);
```

---

## Production vs Development

### Development

```javascript
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Detailed logging
  // ... more development tools
}
```

**Features:**

- Detailed error messages
- Stack traces in responses
- Console logging
- Hot reloading

### Production

```javascript
if (process.env.NODE_ENV === 'production') {
  // Minimal error messages
  // No stack traces
  // Logging to file/service
  // Performance monitoring
}
```

**Features:**

- Generic error messages (don't leak info)
- Compressed responses
- HTTPS only
- Proper logging service
- Performance monitoring

---

## Startup Sequence Summary

```
1. server.js starts
   ↓
2. Register uncaughtException handler
   ↓
3. Load environment variables from config.env
   ↓
4. Connect to MongoDB
   ↓
5. Import app from app.js
   ↓
6. Start Express server on port
   ↓
7. Register unhandledRejection handler
   ↓
8. Server running and ready! ✅
```

---

## Common Issues & Solutions

### Issue: Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F

# Or use different port
PORT=3000 npm start
```

### Issue: Database Connection Failed

```
MongoNetworkError: connection timeout
```

**Solutions:**

1. Check internet connection
2. Verify DATABASE_PASSWORD in config.env
3. Whitelist IP in MongoDB Atlas
4. Check firewall settings

### Issue: Environment Variables Not Loading

```
undefined
```

**Solutions:**

1. Ensure config.env exists
2. Check path in dotenv.config()
3. Restart server after changing .env
4. Don't use quotes in .env values

```env
# Wrong
DATABASE_PASSWORD="mypassword"

# Right
DATABASE_PASSWORD=mypassword
```

---

This comprehensive guide covers everything you need to understand how the application starts, configures itself, and processes requests through the middleware stack.

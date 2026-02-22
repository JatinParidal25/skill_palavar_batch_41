# Utilities Documentation

## Overview

The `utils/` folder contains essential helper classes and functions that provide core functionality used throughout the application. These utilities handle error management, asynchronous operations, API query processing, and email functionality.

---

## Table of Contents

1. [AppError - Custom Error Class](#apperror---custom-error-class)
2. [catchAsync - Async Error Handler](#catchasync---async-error-handler)
3. [APIFeatures - Query Builder](#apifeatures---query-builder)
4. [Email - Email Sending](#email---email-sending)

---

## AppError - Custom Error Class

**File:** `utils/appError.js`

### Purpose

Creates operational errors with proper status codes and error classification. This distinguishes **operational errors** (predictable errors like "user not found") from **programming errors** (bugs).

### Why It's Important

- Standardizes error handling across the application
- Enables the global error handler to distinguish between expected and unexpected errors
- Provides clear error responses to clients

### Code Breakdown

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call parent Error constructor
    this.statusCode = statusCode; // HTTP status code (404, 400, etc.)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as operational error

    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Property Breakdown

| Property        | Type    | Purpose                      | Example                       |
| --------------- | ------- | ---------------------------- | ----------------------------- |
| `message`       | string  | Error description            | "Tour not found"              |
| `statusCode`    | number  | HTTP status code             | 404, 400, 500                 |
| `status`        | string  | Error type                   | "fail" (4xx) or "error" (5xx) |
| `isOperational` | boolean | Is this a predictable error? | true                          |

### Status vs StatusCode

```javascript
// 4xx errors (client errors) → status: 'fail'
statusCode: 400 → status: 'fail'
statusCode: 404 → status: 'fail'

// 5xx errors (server errors) → status: 'error'
statusCode: 500 → status: 'error'
statusCode: 503 → status: 'error'
```

### Usage Examples

#### Example 1: Resource Not Found

```javascript
// In tourController.js
const tour = await Tour.findById(req.params.id);

if (!tour) {
  return next(new AppError('No tour found with that ID', 404));
}
```

**Result:**

```json
{
  "status": "fail",
  "message": "No tour found with that ID"
}
```

#### Example 2: Validation Error

```javascript
// In authController.js
if (req.body.password !== req.body.passwordConfirm) {
  return next(new AppError('Passwords do not match', 400));
}
```

**Result:**

```json
{
  "status": "fail",
  "message": "Passwords do not match"
}
```

#### Example 3: Authorization Error

```javascript
// In authController.js
if (!req.user.role === 'admin') {
  return next(
    new AppError('You do not have permission to perform this action', 403),
  );
}
```

### What is `isOperational`?

**Operational errors** are errors we can predict and handle:

- User not found (404)
- Invalid input (400)
- Unauthorized access (401)

**Programming errors** are bugs we didn't expect:

- Syntax errors
- Undefined variables
- Database connection failures

The `isOperational: true` flag tells the error handler: "This is expected, send a clean error message to the client."

### What Does `Error.captureStackTrace` Do?

```javascript
Error.captureStackTrace(this, this.constructor);
```

This captures where the error was created (the stack trace) but excludes the AppError constructor itself from the trace. This makes debugging easier because you see where YOU called `new AppError()`, not the internals of the AppError class.

---

## catchAsync - Async Error Handler

**File:** `utils/catchAsync.js`

### Purpose

Wraps async functions to automatically catch errors and pass them to Express's error handling middleware. This eliminates the need for try-catch blocks in every async route handler.

### The Problem It Solves

**Without catchAsync:**

```javascript
exports.getAllTours = async (req, res, next) => {
  try {
    const tours = await Tour.find();
    res.status(200).json({
      status: 'success',
      data: { tours },
    });
  } catch (err) {
    next(err); // Have to manually catch and forward
  }
};
```

**With catchAsync:**

```javascript
exports.getAllTours = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res.status(200).json({
    status: 'success',
    data: { tours },
  });
});
// Errors automatically caught and passed to next()!
```

### Code Breakdown

```javascript
module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);
```

Let's break this down step by step:

#### Step 1: Accept a Function

```javascript
(fn) => ...
```

`fn` is your async route handler function.

#### Step 2: Return a Middleware Function

```javascript
(req, res, next) => ...
```

Returns a standard Express middleware function with `req`, `res`, `next`.

#### Step 3: Execute and Catch

```javascript
fn(req, res, next).catch(next);
```

- Executes your async function `fn(req, res, next)`
- If the promise rejects (an error occurs), `.catch(next)` passes the error to `next()`
- This sends the error to Express's error handling middleware

### How It Works - Visual Flow

```
1. Route is called
   ↓
2. catchAsync wrapper executes
   ↓
3. Your async function (fn) runs
   ↓
4a. Success → Send response
4b. Error → .catch(next) → Error middleware
```

### Usage Examples

#### Example 1: Basic Usage

```javascript
const catchAsync = require('../utils/catchAsync');

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});
```

**If `Tour.findById()` throws an error:**

- catchAsync automatically catches it
- Passes it to `next(err)`
- Error middleware handles it

#### Example 2: Multiple Async Operations

```javascript
exports.createTour = catchAsync(async (req, res, next) => {
  // Both operations automatically protected
  const newTour = await Tour.create(req.body);
  const reviews = await Review.find({ tour: newTour.id });

  res.status(201).json({
    status: 'success',
    data: { tour: newTour, reviews },
  });
});
```

### Why Use It?

1. **Clean Code**: No try-catch blocks everywhere
2. **Consistent Error Handling**: All errors go through the same path
3. **Less Boilerplate**: One wrapper instead of repetitive try-catch
4. **Maintainable**: Easy to update error handling logic in one place

---

## APIFeatures - Query Builder

**File:** `utils/apiFeatures.js`

### Purpose

A powerful utility class that processes URL query parameters to build MongoDB queries with filtering, sorting, field selection, and pagination.

### The Problem It Solves

**Without APIFeatures:**

```javascript
// Manually handle each query feature
const queryObj = { ...req.query };
delete queryObj.page;
delete queryObj.sort;
delete queryObj.limit;
delete queryObj.fields;

let queryStr = JSON.stringify(queryObj);
queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

let query = Tour.find(JSON.parse(queryStr));

if (req.query.sort) {
  const sortBy = req.query.sort.split(',').join(' ');
  query = query.sort(sortBy);
}
// ... more code for pagination, field limiting
```

**With APIFeatures:**

```javascript
const features = new APIFeatures(Tour.find(), req.query)
  .filter()
  .sort()
  .limitFields()
  .pagination();

const tours = await features.query;
```

### Constructor

```javascript
constructor(query, queryString) {
  this.query = query;           // Mongoose query object
  this.queryString = queryString; // req.query from Express
}
```

**Parameters:**

- `query`: Initial Mongoose query (e.g., `Tour.find()`)
- `queryString`: URL query parameters from `req.query`

### Method 1: filter()

**Purpose:** Apply filtering conditions from URL parameters

**URL Examples:**

```
GET /api/v1/tours?difficulty=easy
GET /api/v1/tours?duration[gte]=5
GET /api/v1/tours?price[lt]=1000&difficulty=easy
```

**Code Breakdown:**

```javascript
filter() {
  // 1. Create copy of query string
  const queryObj = { ...this.queryString };

  // 2. Remove special fields (not for filtering)
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 3. Convert operators to MongoDB format
  // gte → $gte, gt → $gt, lte → $lte, lt → $lt
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  // 4. Apply filter to query
  this.query = this.query.find(JSON.parse(queryStr));

  return this; // For method chaining
}
```

**Transformation Example:**

```javascript
// URL: ?duration[gte]=5&difficulty=easy

// Step 1: queryObj = { duration: { gte: '5' }, difficulty: 'easy' }
// Step 2: Still { duration: { gte: '5' }, difficulty: 'easy' }
// Step 3: Becomes { duration: { $gte: '5' }, difficulty: 'easy' }
// Step 4: MongoDB query → find({ duration: { $gte: 5 }, difficulty: 'easy' })
```

**Supported Operators:**

| URL Format        | MongoDB Operator | Meaning               |
| ----------------- | ---------------- | --------------------- |
| `price[gte]=500`  | `$gte`           | Greater than or equal |
| `price[gt]=500`   | `$gt`            | Greater than          |
| `price[lte]=1000` | `$lte`           | Less than or equal    |
| `price[lt]=1000`  | `$lt`            | Less than             |

**Real Examples:**

```javascript
// Get tours with duration >= 5 days
GET /api/v1/tours?duration[gte]=5

// Get easy tours under $1000
GET /api/v1/tours?difficulty=easy&price[lt]=1000

// Get medium or hard tours with duration 5-10 days
GET /api/v1/tours?difficulty=medium&duration[gte]=5&duration[lte]=10
```

### Method 2: sort()

**Purpose:** Sort results by one or more fields

**URL Examples:**

```
GET /api/v1/tours?sort=price
GET /api/v1/tours?sort=-price              (descending)
GET /api/v1/tours?sort=price,ratingsAverage (multiple)
```

**Code Breakdown:**

```javascript
sort() {
  if (this.queryString.sort) {
    // Convert comma-separated fields to space-separated
    const sortBy = this.queryString.sort.split(',').join(' ');
    this.query = this.query.sort(sortBy);
  } else {
    // Default: newest first
    this.query = this.query.sort('-createdAt');
  }

  return this;
}
```

**Sort Direction:**

| Format        | Direction                | Example       |
| ------------- | ------------------------ | ------------- |
| `sort=price`  | Ascending (low to high)  | 100, 200, 300 |
| `sort=-price` | Descending (high to low) | 300, 200, 100 |

**Multi-field Sorting:**

```javascript
// Sort by price (ascending), then by ratingsAverage (descending)
GET /api/v1/tours?sort=price,-ratingsAverage

// Transformation:
'price,-ratingsAverage'
  → split(',')
  → ['price', '-ratingsAverage']
  → join(' ')
  → 'price -ratingsAverage'
```

**Practical Examples:**

```javascript
// Cheapest tours first
GET /api/v1/tours?sort=price

// Most expensive tours first
GET /api/v1/tours?sort=-price

// Highest rated tours first, then by price
GET /api/v1/tours?sort=-ratingsAverage,price

// Default (no sort parameter): newest tours first
GET /api/v1/tours
// Automatically sorts by -createdAt
```

### Method 3: limitFields()

**Purpose:** Select specific fields to include/exclude in the response (projection)

**URL Examples:**

```
GET /api/v1/tours?fields=name,duration,price
GET /api/v1/tours?fields=-__v,-createdAt    (exclude)
```

**Code Breakdown:**

```javascript
limitFields() {
  if (this.queryString.fields) {
    // Convert comma-separated fields to space-separated
    const fields = this.queryString.fields.split(',').join(' ');
    this.query = this.query.select(fields);
  } else {
    // Default: exclude __v field
    this.query = this.query.select('-__v');
  }

  return this;
}
```

**Field Selection:**

| Format                   | Action             | Result                                |
| ------------------------ | ------------------ | ------------------------------------- |
| `fields=name,price`      | Include only these | `{ name, price }`                     |
| `fields=-__v,-createdAt` | Exclude these      | Everything except \_\_v and createdAt |

**Why Exclude `__v`?**

`__v` is a version key added by Mongoose. It's internal metadata not useful for clients, so it's excluded by default.

**Practical Examples:**

```javascript
// Get only tour names and prices
GET /api/v1/tours?fields=name,price
// Response: { name: "Tour Name", price: 497 }

// Get all fields except internal ones
GET /api/v1/tours?fields=-__v,-createdAt
// Response: { name, duration, price, ... } // no __v or createdAt

// Combine with filtering
GET /api/v1/tours?difficulty=easy&fields=name,price,difficulty
// Easy tours, showing only name, price, difficulty
```

### Method 4: pagination()

**Purpose:** Implement page-based pagination

**URL Examples:**

```
GET /api/v1/tours?page=2&limit=10
GET /api/v1/tours?page=3              (default limit: 100)
GET /api/v1/tours?limit=5             (default page: 1)
```

**Code Breakdown:**

```javascript
pagination() {
  // 1. Get page number (default: 1)
  const page = this.queryString.page * 1 || 1;

  // 2. Get items per page (default: 100)
  const limit = this.queryString.limit * 1 || 100;

  // 3. Calculate how many items to skip
  const skipValue = (page - 1) * limit;

  // 4. Apply to query
  this.query = this.query.skip(skipValue).limit(limit);

  return this;
}
```

**How Pagination Math Works:**

```javascript
// Page 1, Limit 10
skipValue = (1 - 1) * 10 = 0
// Get items 1-10

// Page 2, Limit 10
skipValue = (2 - 1) * 10 = 10
// Skip first 10, get items 11-20

// Page 3, Limit 10
skipValue = (3 - 1) * 10 = 20
// Skip first 20, get items 21-30
```

**Why `* 1`?**

```javascript
this.queryString.page * 1;
```

URL query parameters are strings. Multiplying by 1 converts to a number:

- `"2" * 1` → `2`
- `"abc" * 1` → `NaN` → falls back to default

**Practical Examples:**

```javascript
// Get page 1 (default: first 100 tours)
GET /api/v1/tours

// Get page 2, 10 tours per page (tours 11-20)
GET /api/v1/tours?page=2&limit=10

// Get page 3, 5 tours per page (tours 11-15)
GET /api/v1/tours?page=3&limit=5

// Combine with filtering and sorting
GET /api/v1/tours?difficulty=easy&sort=price&page=2&limit=10
// Page 2 of easy tours, sorted by price
```

### Complete Usage Example

```javascript
// In tourController.js
exports.getAllTours = catchAsync(async (req, res, next) => {
  // BUILD QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter() // Apply filters
    .sort() // Apply sorting
    .limitFields() // Select fields
    .pagination(); // Apply pagination

  // EXECUTE QUERY
  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});
```

**Complex Query Example:**

```
GET /api/v1/tours?difficulty=easy&duration[gte]=5&price[lt]=1000&sort=price&fields=name,duration,price&page=2&limit=10
```

**What happens:**

1. **filter()**: `{ difficulty: 'easy', duration: { $gte: 5 }, price: { $lt: 1000 } }`
2. **sort()**: Sort by price (ascending)
3. **limitFields()**: Show only name, duration, price
4. **pagination()**: Skip 10, show next 10

**Result:** Page 2 (tours 11-20) of easy tours, 5+ days, under $1000, sorted by price, showing only name/duration/price.

### Method Chaining

All methods return `this`, enabling chaining:

```javascript
new APIFeatures(Tour.find(), req.query)
  .filter() // Returns this
  .sort() // Returns this
  .limitFields() // Returns this
  .pagination(); // Returns this
```

This is a common pattern in JavaScript called a "fluent interface."

---

## Email - Email Sending

**File:** `utils/email.js`

### Purpose

Sends emails using Nodemailer for password reset functionality.

### Configuration Requirements

**Environment Variables (config.env):**

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_username
EMAIL_PASSWORD=your_password
```

**For Development:** Use [Mailtrap.io](https://mailtrap.io) - a fake SMTP service for testing

**For Production:** Use a real email service like:

- SendGrid
- Mailgun
- Amazon SES
- Gmail (not recommended for production)

### Code Breakdown

```javascript
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Define the email options
  const mailOptions = {
    from: 'Jatin Paridal <test@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
```

### What is a Transporter?

A **transporter** is Nodemailer's connection to an email service. It handles:

- SMTP connection
- Authentication
- Email delivery

Think of it as the "email server connector."

### Usage in authController.js

```javascript
const sendEmail = require('../utils/email');

// In forgotPassword function
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Find user
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('No user with that email', 404));
  }

  // 2. Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Create reset URL
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  // 4. Email message
  const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`;

  try {
    // 5. Send email
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // If email fails, reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error sending email. Try again later!', 500));
  }
});
```

### Email Options Object

```javascript
{
  email: 'user@example.com',    // Recipient
  subject: 'Password Reset',     // Email subject
  message: 'Click here...'       // Email body (plain text)
}
```

### Example Email Sent

```
From: Jatin Paridal <test@gmail.com>
To: john@example.com
Subject: Your password reset token (valid for 10 min)

Forgot your password? Submit a PATCH request with your new password to:
http://localhost:5000/api/v1/users/resetPassword/a1b2c3d4e5f6...
```

### Production Considerations

**Current Setup (Development):**

- Uses Mailtrap (fake SMTP)
- Emails are caught, not delivered
- Perfect for testing

**Production Setup:**

- Use real email service (SendGrid, etc.)
- Add HTML email templates
- Handle email delivery failures
- Implement email queues for high volume
- Add email tracking/analytics

### Possible Enhancements

```javascript
// HTML email template
const mailOptions = {
  from: "Natour's <noreply@natours.com>",
  to: options.email,
  subject: options.subject,
  text: options.message,
  html: `<p>${options.message}</p>`, // HTML version
};

// With attachments
const mailOptions = {
  // ...
  attachments: [
    {
      filename: 'logo.png',
      path: '/img/logo.png',
    },
  ],
};
```

---

## Summary

### When to Use Each Utility

| Utility         | Use Case                      | Example                                        |
| --------------- | ----------------------------- | ---------------------------------------------- |
| **AppError**    | Creating operational errors   | `new AppError('Not found', 404)`               |
| **catchAsync**  | Wrapping async route handlers | `catchAsync(async (req, res) => {})`           |
| **APIFeatures** | Processing query parameters   | `new APIFeatures(query, req.query)`            |
| **sendEmail**   | Sending emails                | `await sendEmail({ email, subject, message })` |

### Best Practices

1. **Always use AppError for operational errors**
   - Don't throw regular Error objects for expected errors
   - Use appropriate status codes

2. **Wrap all async handlers with catchAsync**
   - Eliminates try-catch blocks
   - Ensures consistent error handling

3. **Use APIFeatures for all GET endpoints**
   - Provides consistent query interface
   - Easy to add new features

4. **Handle email failures gracefully**
   - Always wrap in try-catch
   - Provide fallback logic

### Common Patterns

```javascript
// Pattern 1: Get One Resource
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

// Pattern 2: Get All Resources with Query
exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const tours = await features.query;

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

// Pattern 3: Send Email with Error Handling
try {
  await sendEmail({
    email: user.email,
    subject: 'Password Reset',
    message: resetURL,
  });

  res.status(200).json({
    status: 'success',
    message: 'Email sent',
  });
} catch (err) {
  // Cleanup and error response
  return next(new AppError('Email failed', 500));
}
```

---

## Technical Deep Dive

### Why Does catchAsync Work?

```javascript
module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);
```

**Step-by-step execution:**

1. You write: `catchAsync(async (req, res, next) => { ... })`
2. catchAsync receives your function as `fn`
3. catchAsync returns: `(req, res, next) => fn(req, res, next).catch(next)`
4. Express calls this returned function when the route is hit
5. Your async function executes: `fn(req, res, next)`
6. If your function throws/rejects, `.catch(next)` catches it
7. `next` is called with the error, sending it to error middleware

### Why Does Method Chaining Work in APIFeatures?

```javascript
return this;
```

Each method returns the instance (`this`), allowing:

```javascript
obj
  .method1() // Returns obj
  .method2() // Called on obj, returns obj
  .method3(); // Called on obj, returns obj
```

This is the same pattern used by:

- jQuery: `$('.el').hide().fadeIn().css(...)`
- Lodash: `_.chain(arr).filter(...).map(...).value()`
- Mongoose: `Model.find().sort().limit()`

---

This documentation provides a complete understanding of all utility functions, their purposes, implementation details, and practical usage examples.

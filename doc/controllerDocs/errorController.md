# Error Controller Documentation

## Overview

The `errorController.js` file contains the global error handling middleware and utility functions for formatting errors. It implements environment-specific error responses (development vs. production) and handles various MongoDB and JWT errors.

---

## Functions

### 1. `sendErrorDev(err, res)`

**Type:** Error Response Formatter

**Purpose:** Formats and sends detailed error responses in development environment.

**Parameters:**

- `err` (Error Object): The error object with properties like `statusCode`, `status`, `message`, `stack`
- `res` (Response Object): Express response object

**Response (varies by statusCode):**

```javascript
{
  status: String,           // e.g., 'fail', 'error'
  error: Object,           // Full error object
  message: String,         // Error message
  stack: String           // Full stack trace
}
```

**Example Dev Response:**

```javascript
{
  status: 'fail',
  error: {
    statusCode: 400,
    status: 'fail',
    message: 'Invalid tour ID: xyz123',
    isOperational: true,
    ...
  },
  message: 'Invalid tour ID: xyz123',
  stack: 'Error: Invalid tour ID...\n    at getTour (tourController.js:85:5)\n    ...'
}
```

**How it works:**

1. Returns the error's `statusCode` as HTTP status
2. Includes full error object with all debugging information
3. Includes complete stack trace for troubleshooting
4. Useful for developers to understand what went wrong and where

**When Used:**

- Only in development environment (`NODE_ENV === 'development'`)
- Helps developers quickly identify and fix bugs

---

### 2. `sendErrorProd(err, res)`

**Type:** Error Response Formatter

**Purpose:** Formats and sends safe error responses in production environment, hiding implementation details.

**Parameters:**

- `err` (Error Object): The error object with `isOperational` flag
- `res` (Response Object): Express response object

**Response:**

```javascript
// For operational errors (isOperational: true)
{
  status: String,    // e.g., 'fail'
  message: String   // User-friendly error message
}

// For unknown/programming errors
{
  status: 'error',
  message: 'something went wrong'
}
```

**How it works:**

1. **Check if error is operational:** If `isOperational` is true:
   - Error was thrown intentionally (expected error)
   - Safe to send to client
   - Returns error message and status code
2. **Unknown/Programming Error:** If `isOperational` is false:
   - Error may contain sensitive information
   - Log full error details to console for debugging
   - Send generic message to client
   - Returns 500 status code

**Security Benefits:**

- Prevents exposing implementation details to users
- Doesn't leak internal system information
- Generic messages don't help attackers
- Stack traces never exposed in production

**Example Production Responses:**

Operational Error:

```javascript
{
  status: 'fail',
  message: 'Invalid tour ID: xyz123'
}
```

Unknown Error:

```javascript
{
  status: 'error',
  message: 'something went wrong'
}
```

---

### 3. `handleCastErrorDB(err)`

**Type:** Error Handler (Specific to MongoDB)

**Purpose:** Handles MongoDB CastError when invalid ID format is used.

**Parameters:**

- `err` (CastError): MongoDB casting error object

**Returns:**

- `AppError` object with 400 status code

**Example:**

```javascript
// When query includes invalid ObjectId
GET /api/v1/tours/invalidid123

// MongoDB throws CastError
// This handler converts it to:
{
  message: 'Invalid _id: invalidid123.',
  statusCode: 400,
  status: 'fail'
}
```

**How it works:**

1. Extracts the field name from `err.path` (usually `_id`)
2. Extracts the invalid value from `err.value`
3. Creates user-friendly error message
4. Returns AppError with 400 Bad Request status

**Common Trigger:** Invalid MongoDB ObjectId format (not 24 hex characters)

---

### 4. `handleDuplicateFieldsDB(err)`

**Type:** Error Handler (Specific to MongoDB)

**Purpose:** Handles MongoDB duplicate key error (E11000) when unique field is duplicated.

**Parameters:**

- `err` (MongoError): MongoDB duplicate key error

**Returns:**

- `AppError` object with 400 status code

**Example:**

```javascript
// When creating user with existing email
POST /api/v1/auth/signup
{
  "email": "john@example.com"  // Already exists
}

// MongoDB throws E11000 error
// This handler converts it to:
{
  message: 'Duplicate field value: john@example.com. Please use another value.',
  statusCode: 400,
  status: 'fail'
}
```

**How it works:**

1. Extracts the duplicate value from `err.keyValue` object
2. Gets the first key's value (e.g., email address)
3. Creates user-friendly error message suggesting alternative value
4. Returns AppError with 400 Bad Request status

**Common Triggers:**

- Duplicate email on user signup
- Duplicate tour name
- Any field with `unique: true` constraint

**Error Code:** MongoDB error code 11000

---

### 5. `handleValidationErrorDB(err)`

**Type:** Error Handler (Specific to MongoDB)

**Purpose:** Handles Mongoose validation errors when data doesn't match schema rules.

**Parameters:**

- `err` (ValidationError): Mongoose validation error

**Returns:**

- `AppError` object with 400 status code

**Example:**

```javascript
// When tour difficulty is invalid value
POST /api/v1/tours
{
  "name": "City Tour",
  "difficulty": "extreme"  // Only allows 'easy', 'medium', 'difficult'
}

// Mongoose throws ValidationError
// This handler converts it to:
{
  message: 'Invalid input Data: Difficulty must be one of: easy, medium, difficult.',
  statusCode: 400,
  status: 'fail'
}
```

**How it works:**

1. Extracts all validation error messages from `err.errors` object
2. Maps through each error and collects the message
3. Joins all messages with '. ' separator
4. Returns AppError with 400 Bad Request status

**Common Triggers:**

- Missing required fields
- Invalid enum values
- Field values outside valid range
- String length validation failure
- Type mismatches

---

### 6. `handleJWTError(err)`

**Type:** Error Handler (Specific to JWT)

**Purpose:** Handles invalid JWT tokens (corrupted or tampered).

**Parameters:**

- `err` (JsonWebTokenError): JWT verification error

**Returns:**

- `AppError` object with 401 status code

**Example:**

```javascript
// When token is invalid/tampered
GET /api/v1/tours
Authorization: Bearer invalid.token.here

// JWT.verify throws JsonWebTokenError
// This handler converts it to:
{
  message: 'Invalid token, Please log in again',
  statusCode: 401,
  status: 'fail'
}
```

**How it works:**

1. Creates AppError with fixed message
2. Returns 401 Unauthorized status
3. Prompts user to re-authenticate

**Common Triggers:**

- Token manually modified
- Token from different secret key
- Malformed token structure
- Corrupted token data

---

### 7. `handleJWTExpiredError(err)`

**Type:** Error Handler (Specific to JWT)

**Purpose:** Handles expired JWT tokens.

**Parameters:**

- `err` (TokenExpiredError): JWT expiration error

**Returns:**

- `AppError` object with 401 status code

**Example:**

```javascript
// When token has expired
GET /api/v1/tours
Authorization: Bearer eyJhb...  // Token issued 7 days ago (expired after 30 days)

// JWT.verify throws TokenExpiredError
// This handler converts it to:
{
  message: 'Your token has expired! Please log in again',
  statusCode: 401,
  status: 'fail'
}
```

**How it works:**

1. Creates AppError with fixed message
2. Returns 401 Unauthorized status
3. Prompts user to re-authenticate

**Common Triggers:**

- Session timeout
- Token age exceeds `JWT_EXPIRES_IN` setting
- User not logged in for extended period

---

### 8. Global Error Handler Middleware (Default Export)

**Type:** Error Handling Middleware

**Purpose:** Main error handling middleware that routes errors to appropriate handlers.

**Parameters:**

- `err` (Error): Error object
- `req` (Request): Express request object
- `res` (Response): Express response object
- `next` (Function): Express next function (for chaining)

**How it works:**

1. **Initialize Error Properties:**
   - Sets default `statusCode: 500` if not set
   - Sets default `status: 'error'` if not set

2. **Environment-Specific Handling:**
   - If `NODE_ENV === 'development'`: Call `sendErrorDev()`
   - If `NODE_ENV === 'production'`: Process error and call `sendErrorProd()`

3. **Production Error Processing** (converts various error types):
   - **CastError:** Calls `handleCastErrorDB()` for invalid MongoDB IDs
   - **E11000 Error:** Calls `handleDuplicateFieldsDB()` for duplicate unique fields
   - **ValidationError:** Calls `handleValidationErrorDB()` for schema validation failures
   - **JsonWebTokenError:** Calls `handleJWTError()` for invalid tokens
   - **TokenExpiredError:** Calls `handleJWTExpiredError()` for expired tokens

4. **Response:** Sends appropriate error response to client

**Integration:** Must be registered LAST in Express middleware chain:

```javascript
app.use(express.json());
app.use(routes);
app.use(errorController); // Always last
```

---

## Error Flow Diagram

```
Error Thrown (anywhere in app)
        ↓
catchAsync() catches it
        ↓
next(error) passes to Express
        ↓
Error Handler Middleware
        ↓
        ├─→ Development? → sendErrorDev() → Full details
        │
        └─→ Production?
             ├─→ Is Operational Error? → sendErrorProd() → Safe message
             └─→ Unknown Error? → Log it + Generic message
```

---

## Error Types Handled

| Error Type        | Trigger                 | Handler                   | Status | Message                              |
| ----------------- | ----------------------- | ------------------------- | ------ | ------------------------------------ |
| CastError         | Invalid MongoDB ID      | `handleCastErrorDB`       | 400    | `Invalid {field}: {value}`           |
| E11000            | Duplicate unique field  | `handleDuplicateFieldsDB` | 400    | `Duplicate field value: {value}`     |
| ValidationError   | Schema validation fails | `handleValidationErrorDB` | 400    | `Invalid input Data: {errors}`       |
| JsonWebTokenError | Invalid token           | `handleJWTError`          | 401    | `Invalid token, Please log in again` |
| TokenExpiredError | Token expired           | `handleJWTExpiredError`   | 401    | `Your token has expired!`            |
| AppError          | Operational errors      | Both handlers             | Varies | Custom message                       |
| Unknown           | Unhandled errors        | Production only           | 500    | `something went wrong`               |

---

## Usage Examples

### Creating Operational Errors (handled safely)

```javascript
// In controllers
if (!tour) {
  return next(new AppError('Tour not found', 404));
}
```

### Error Response in Development

```javascript
GET /api/v1/tours/invalid
Status: 400

{
  status: 'fail',
  error: { ... },
  message: 'Invalid _id: invalid.',
  stack: '... full stack trace ...'
}
```

### Error Response in Production

```javascript
GET /api/v1/tours/invalid
Status: 400

{
  status: 'fail',
  message: 'Invalid _id: invalid.'
}
```

---

## Best Practices

1. **Always throw AppError for operational errors:**

   ```javascript
   return next(new AppError('User not found', 404));
   ```

2. **Use catchAsync to wrap async handlers:**

   ```javascript
   exports.getTour = catchAsync(async (req, res, next) => {
     const tour = await Tour.findById(req.params.id);
     if (!tour) return next(new AppError('Not found', 404));
   });
   ```

3. **Register error handler last:**

   ```javascript
   const errorController = require('./controllers/errorController');
   app.use(errorController);
   ```

4. **Never expose stack traces in production**
   - Only development mode shows stack traces
   - Production shows generic error messages for unknown errors

5. **Provide helpful messages for known errors**
   - Invalid input errors tell users what's wrong
   - Duplicate field errors suggest alternatives
   - Expired token errors prompt re-login

---

## Security Considerations

1. **Information Disclosure Prevention:**
   - Development mode shows all details for debugging
   - Production mode hides implementation details
   - Unknown errors logged server-side, not sent to client

2. **Error Message Design:**
   - Tells users what went wrong
   - Doesn't reveal internal system structure
   - Doesn't leak sensitive data or paths

3. **HTTP Status Codes:**
   - Appropriate codes for different error types
   - Helps clients understand and handle errors properly
   - Follows REST conventions

4. **Logging:**
   - Unknown errors logged to console for investigation
   - Can be extended to log to files/external services
   - Valuable for post-incident analysis

# Natour's Project - Complete Architecture Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Routes Structure](#routes-structure)
3. [Models Architecture](#models-architecture)
4. [Controllers & Handlers](#controllers--handlers)
5. [How to Use](#how-to-use)
6. [Request/Response Flow](#requestresponse-flow)

---

## Project Overview

**Natour's** is a tour booking application with the following core features:

- User authentication and authorization
- Tour management and discovery
- Review system for tours
- Role-based access control
- API-first architecture

### Core Entities

```
User
  ├── Authentication (signup, login, password reset)
  ├── Profile (name, email, photo, role)
  └── Reviews (can write reviews)

Tour
  ├── Details (name, price, difficulty, etc.)
  ├── Reviews (has many reviews)
  └── Ratings (average rating from reviews)

Review
  ├── Content (review text, rating 1-5)
  ├── Author (userId reference)
  └── Subject (tourId reference)
```

---

## Routes Structure

### How Routes Work in This Project

Routes are the **URL endpoints** that users access. They connect HTTP methods (GET, POST, etc.) to controller functions.

#### Route Registration (in app.js)

```javascript
app.use('/api/v1/tours', tourRouter); // Tour endpoints
app.use('/api/v1/users', userRouter); // User endpoints
app.use('/api/v1/reviews', reviewRouter); // Review endpoints
```

This means:

- `/api/v1/tours/...` → tourRouter handles it
- `/api/v1/users/...` → userRouter handles it
- `/api/v1/reviews/...` → reviewRouter handles it

---

### Tour Routes (`tourRoutes.js`)

**Purpose:** Define all tour-related endpoints

```javascript
const router = express.Router();

// Mount review router for nested routes
router.use('/:tourId/reviews', reviewRouter);
```

**Why:** When a tour has an ID (e.g., `/api/v1/tours/123/reviews`), pass control to reviewRouter

#### Tour Routes List

| Method | Route                 | Auth | Role                     | Handler                     | Purpose                                    |
| ------ | --------------------- | ---- | ------------------------ | --------------------------- | ------------------------------------------ |
| GET    | `/top-5-cheap`        | No   | -                        | aliasTopTours → getAllTours | Get 5 cheapest best-rated tours            |
| GET    | `/tour-stats`         | No   | -                        | getTourStats                | Tour statistics (avg price, ratings, etc.) |
| GET    | `/monthly-plan/:year` | Yes  | admin, lead-guide, guide | getMonthlyPlan              | Tour schedule for a year                   |
| GET    | `/`                   | No   | -                        | getAllTours                 | Get all tours with filters                 |
| POST   | `/`                   | Yes  | admin, lead-guide        | createTour                  | Create new tour                            |
| GET    | `/:id`                | No   | -                        | getTour                     | Get single tour with reviews               |
| PATCH  | `/:id`                | Yes  | admin, lead-guide        | updateTour                  | Update tour details                        |
| DELETE | `/:id`                | Yes  | admin, lead-guide        | deleteTour                  | Delete tour                                |

#### Key Concept: Nested Routes

```javascript
// In tourRoutes.js
router.use('/:tourId/reviews', reviewRouter);
```

This enables:

```
GET  /api/v1/tours/123/reviews      → Gets reviews for tour 123
POST /api/v1/tours/123/reviews      → Creates review for tour 123
```

**How it works:**

1. User visits `/api/v1/tours/123/reviews`
2. tourRouter sees `/123/reviews` and matches `/:tourId/reviews`
3. Passes `:tourId` (123) and control to reviewRouter
4. reviewRouter handles the review operations for that tour

---

### User Routes (`userRoutes.js`)

**Purpose:** Define user and authentication endpoints

**Important:** Route order matters! Specific routes MUST come before parameterized routes.

```javascript
// Specific routes (no parameters)
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

// Protect all routes after this
router.use(protect); // All routes below need authentication

router.patch('/updatePassword', updatePassword);
router.get('/me', getMe, getUser);
router.patch('/updateMe', updateMe);
router.delete('/deleteMe', deleteMe);

// Admin-only routes
router.use(restrictTo('admin')); // All routes below need admin role

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);
```

#### User Routes List

| Method | Route                   | Auth | Role  | Handler         | Purpose                     |
| ------ | ----------------------- | ---- | ----- | --------------- | --------------------------- |
| POST   | `/signup`               | No   | -     | signup          | Register new user           |
| POST   | `/login`                | No   | -     | login           | User login                  |
| POST   | `/forgotPassword`       | No   | -     | forgotPassword  | Request password reset      |
| PATCH  | `/resetPassword/:token` | No   | -     | resetPassword   | Reset password with token   |
| GET    | `/me`                   | Yes  | -     | getMe → getUser | Get own profile             |
| PATCH  | `/updatePassword`       | Yes  | -     | updatePassword  | Change password (logged in) |
| PATCH  | `/updateMe`             | Yes  | -     | updateMe        | Update own profile          |
| DELETE | `/deleteMe`             | Yes  | -     | deleteMe        | Deactivate account          |
| GET    | `/`                     | Yes  | admin | getAllUsers     | Get all users (admin)       |
| POST   | `/`                     | Yes  | admin | createUser      | Create user (admin)         |
| GET    | `/:id`                  | Yes  | admin | getUser         | Get user details (admin)    |
| PATCH  | `/:id`                  | Yes  | admin | updateUser      | Update user (admin)         |
| DELETE | `/:id`                  | Yes  | admin | deleteUser      | Delete user (admin)         |

#### Understanding Middleware Chain

```javascript
router.use(protect); // Authentication middleware
// All routes defined AFTER this need authentication
// Users must send valid JWT token in Authorization header

router.use(restrictTo('admin')); // Authorization middleware
// All routes defined AFTER this need admin role
// Only users with role='admin' can access
```

---

### Review Routes (`reviewRoutes.js`)

**Purpose:** Define review endpoints

```javascript
const router = express.Router({ mergeParams: true });
// mergeParams: true allows access to parent route parameters (tourId)

router
  .route('/')
  .get(getAllReviews)
  .post(protect, restrictTo('user'), createReview);
```

#### Review Routes List

| Method | Route                           | Auth | Role | Handler       | Purpose                         |
| ------ | ------------------------------- | ---- | ---- | ------------- | ------------------------------- |
| GET    | `/api/v1/reviews`               | No   | -    | getAllReviews | All reviews in system           |
| POST   | `/api/v1/reviews`               | Yes  | user | createReview  | Create review                   |
| GET    | `/api/v1/tours/:tourId/reviews` | No   | -    | getAllReviews | Reviews for tour (nested)       |
| POST   | `/api/v1/tours/:tourId/reviews` | Yes  | user | createReview  | Create review for tour (nested) |

---

## Models Architecture

### What Are Models?

Models define **data structure** and **database operations**. They're the blueprint for how data is stored and validated.

```
Model = MongoDB Collection + Validation + Methods + Middleware
```

---

### User Model (`userModel.js`)

**Stores:** User account information

#### Fields

| Field                  | Type    | Required | Special                           | Purpose                    |
| ---------------------- | ------- | -------- | --------------------------------- | -------------------------- |
| `name`                 | String  | Yes      | -                                 | User's full name           |
| `email`                | String  | Yes      | unique                            | Email address (lowercase)  |
| `photo`                | String  | No       | -                                 | Profile photo URL          |
| `role`                 | String  | No       | enum: user/guide/lead-guide/admin | User permission level      |
| `password`             | String  | Yes      | hidden                            | Hashed password (bcrypt)   |
| `passwordConfirm`      | String  | Yes\*    | not stored                        | Confirmation during signup |
| `passwordChangedAt`    | Date    | No       | -                                 | Last password change time  |
| `passwordResetToken`   | String  | No       | -                                 | Token for password reset   |
| `passwordResetExpires` | Date    | No       | -                                 | Reset token expiration     |
| `active`               | Boolean | No       | default: true                     | Account active status      |

**\*Only required during signup**

#### Key Methods

```javascript
correctPassword(candidatePassword, userPassword);
// Compare plaintext password with stored hash
// Used in: login()

changedPasswordAfter(JWTTimestamp);
// Check if password changed after token issued
// Used in: protect() middleware

createPasswordResetToken();
// Generate reset token (stored as hash)
// Used in: forgotPassword()
```

#### Middleware

```javascript
pre('save', ...)  // Hash password before saving
pre('save', ...)  // Update passwordChangedAt when password changes
pre(/^find/, ...) // Exclude inactive users from queries
```

#### Example Usage

```javascript
// Create user (signup)
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'myPassword123',
  passwordConfirm: 'myPassword123',
});
// Password is automatically hashed before saving

// Verify password (login)
const isValid = await user.correctPassword(
  'myPassword123', // User entered
  user.password, // Stored hash
);

// Check if password changed (after token issued)
const changed = user.changedPasswordAfter(tokenIssueTime);
```

---

### Tour Model (`tourModel.js`)

**Stores:** Tour information and details

#### Fields

| Field             | Type     | Required | Special                     | Purpose               |
| ----------------- | -------- | -------- | --------------------------- | --------------------- |
| `name`            | String   | Yes      | unique, 10-40 chars         | Tour name             |
| `slug`            | String   | No       | -                           | URL-friendly name     |
| `duration`        | Number   | Yes      | -                           | Days to complete      |
| `maxGroupSize`    | Number   | Yes      | -                           | Max participants      |
| `difficulty`      | String   | Yes      | enum: easy/medium/difficult | Difficulty level      |
| `ratingsAverage`  | Number   | No       | default: 4.5, 1-5           | Average rating        |
| `ratingsQuantity` | Number   | No       | default: 0                  | Number of ratings     |
| `price`           | Number   | Yes      | -                           | Tour price            |
| `priceDiscount`   | Number   | No       | < price                     | Discount price        |
| `summary`         | String   | Yes      | -                           | Short description     |
| `description`     | String   | No       | -                           | Detailed description  |
| `imageCover`      | String   | Yes      | -                           | Main tour image       |
| `images`          | [String] | No       | -                           | Gallery images        |
| `createdAt`       | Date     | No       | default: now, hidden        | Creation timestamp    |
| `startDates`      | [Date]   | No       | -                           | Available start dates |
| `secretTour`      | Boolean  | No       | default: false              | Hide from listing     |

#### Virtual Property

```javascript
durationWeeks;
// Calculated: duration / 7
// Example: 14 days → 2 weeks
// Not stored, computed on query
```

#### Example Usage

```javascript
// Get all tours
const tours = await Tour.find();

// Filter tours
const easyTours = await Tour.find({ difficulty: 'easy' });

// Get tour with reviews populated
const tour = await Tour.findById(tourId).populate({ path: 'reviews' });
```

---

### Review Model (`reviewModel.js`)

**Stores:** User reviews and ratings for tours

#### Fields

| Field       | Type     | Required | Special      | Purpose       |
| ----------- | -------- | -------- | ------------ | ------------- |
| `review`    | String   | Yes      | -            | Review text   |
| `rating`    | Number   | Yes      | 1-5          | Rating score  |
| `createdAt` | Date     | No       | default: now | Creation date |
| `tourId`    | ObjectId | Yes      | ref: Tour    | Which tour    |
| `userId`    | ObjectId | Yes      | ref: User    | Who reviewed  |

#### Auto-Population

When you fetch reviews, userId is **automatically populated** with user details:

```javascript
const reviews = await Review.find();
// Automatically includes:
// userId: { _id, name, photo }

// Instead of just:
// userId: ObjectId(...)
```

#### Static Methods (Calculated from Review Data)

```javascript
calcAverageRatings(tourId);
// Calculate and update tour's average rating
// Runs automatically when review is created/updated/deleted
// Updates tour's ratingsAverage and ratingsQuantity
```

#### Middleware

```javascript
pre(/^find/, ...)     // Auto-populate user data
post('save', ...)     // Update tour ratings after review created
pre(/^findOneAnd/, .) // Prepare for update/delete
post(/^findOneAnd/,..)// Update tour ratings after review changed
```

#### Example Usage

```javascript
// Create review (auto-updates tour ratings)
const review = await Review.create({
  review: 'Amazing tour!',
  rating: 5,
  tourId: tourId,
  userId: userId,
});
// Tour's ratingsAverage automatically updated

// Get reviews (auto-populated)
const reviews = await Review.find({ tourId });
// Each review includes full user data (name, photo)

// Check user in review
console.log(reviews[0].userId.name); // "John Doe"
console.log(reviews[0].userId.photo); // "/img/users/..."
```

---

## Controllers & Handlers

### What Are Controllers?

Controllers contain **business logic** - they decide what to do with requests.

```
Request → Controller → Model → Response
```

### Handler Factory (`handlerFactory.js`)

**Purpose:** Reusable functions for common CRUD operations

Instead of writing delete/update/get code multiple times, factory creates it once:

```javascript
// Use factory to create handlers
exports.deleteTour = factory.deleteOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.createTour = factory.createOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.getAllTours = factory.getAll(Tour);
```

#### Available Factory Functions

**1. `deleteOne(Model)`** - Delete by ID

```javascript
// Deletes document, returns 204 No Content
exports.deleteTour = factory.deleteOne(Tour);
```

**2. `updateOne(Model)`** - Update by ID

```javascript
// Updates document with request body
// Returns updated document
exports.updateTour = factory.updateOne(Tour);
```

**3. `createOne(Model)`** - Create new document

```javascript
// Creates from request body
// Returns new document with 201 Created
exports.createTour = factory.createOne(Tour);
```

**4. `getOne(Model, popOptions)` - Get by ID**

```javascript
// With optional population of references
// Returns single document
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// ↑ Also returns tour's reviews
```

**5. `getAll(Model)` - Get all documents**

```javascript
// Supports filtering, sorting, pagination
// Handles nested routes (if tourId in URL)
exports.getAllTours = factory.getAll(Tour);
```

---

### Tour Controller (`tourController.js`)

**Uses:** Factory functions + custom logic

#### `aliasTopTours` Middleware

```javascript
// Pre-sets query filters for "top 5 cheap" endpoint
req.query.limit = '5';
req.query.sort = '-ratingAverage,price';
req.query.fields = 'name,price,ratingAverage,summary,difficulty';
next(); // Passes to getAllTours with modified query
```

**Use case:**

```
GET /api/v1/tours/top-5-cheap
↓
aliasTopTours middleware pre-filters
↓
getAllTours handler executes with filters
↓
Returns top 5 cheapest, best-rated tours
```

#### `getTourStats` - Aggregation

```javascript
// Calculates tour statistics
// Tours with rating >= 4.5
// Returns: count, avg rating, avg price, min, max
```

#### `getMonthlyPlan` - Aggregation

```javascript
// Tour schedule for a year
// Groups by month
// Shows how many tours start each month
```

---

### User Controller (`userController.js`)

**Purpose:** User-specific operations

#### `updateMe` - Update own profile

```javascript
// Only allows: name, email
// Prevents: password, role, active status
// Auto-filters unwanted fields
```

#### `deleteMe` - Soft delete

```javascript
// Doesn't actually delete
// Sets active: false
// Allows account recovery
```

#### `getMe` - Get own profile

```javascript
// Just sets req.params.id = req.user.id
// Then calls factory.getOne()
```

#### Admin Functions (Using Factory)

```javascript
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
```

---

### Review Controller (`reviewController.js`)

#### `getAllReviews`

```javascript
// Gets all reviews (or filtered by tourId if nested route)
// Auto-populates user data
```

#### `createReview`

```javascript
// Creates review
// Auto-sets tourId from URL param (nested route)
// Auto-sets userId from logged-in user
// Triggers tour rating update
```

---

### Auth Controller (`authController.js`)

**Purpose:** Authentication and authorization

#### `signup` - Register user

```javascript
// Creates user, hashes password, sends token
// Auto-logs in with JWT
```

#### `login` - User login

```javascript
// Verifies credentials, sends JWT token
```

#### `protect` - Verify token

```javascript
// Middleware that:
// 1. Extracts token from header
// 2. Verifies signature
// 3. Checks user still exists
// 4. Checks password not changed
// Sets req.user for handlers
```

#### `restrictTo(roles)` - Check role

```javascript
// Middleware that verifies user role
// Blocks unauthorized users with 403
```

#### `forgotPassword` - Reset request

```javascript
// Sends reset email with token
// Token valid for 10 minutes
```

#### `resetPassword` - Reset password

```javascript
// Verifies reset token
// Updates password
// Auto-logs in
```

#### `updatePassword` - Change password (logged in)

```javascript
// Requires current password
// Updates password
// Auto-logs in with new token
```

---

## How to Use

### Making Requests

#### Get All Tours

```bash
curl "http://localhost:3000/api/v1/tours"
```

#### Get Filtered Tours

```bash
curl "http://localhost:3000/api/v1/tours?difficulty=easy&price[lte]=1500"
```

#### Create Tour (Admin Required)

```bash
curl -X POST "http://localhost:3000/api/v1/tours" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "City Tour",
    "duration": 5,
    "maxGroupSize": 25,
    "difficulty": "easy",
    "price": 999,
    "summary": "Amazing city experience"
  }'
```

#### Sign Up

```bash
curl -X POST "http://localhost:3000/api/v1/users/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "passwordConfirm": "password123"
  }'
```

#### Login

```bash
curl -X POST "http://localhost:3000/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
// Returns JWT token
```

#### Create Review (User Required)

```bash
curl -X POST "http://localhost:3000/api/v1/tours/123/reviews" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "review": "Amazing tour!",
    "rating": 5
  }'
// tourId (123) comes from URL
// userId comes from authenticated user
```

---

## Request/Response Flow

### Example: Create Review for Tour

```
1. USER MAKES REQUEST
   POST /api/v1/tours/123/reviews
   Authorization: Bearer eyJhbGc...
   Body: { review: "Great!", rating: 5 }

2. ROUTE MATCHING (app.js)
   Matches /api/v1/tours/:tourId/reviews
   Mounts reviewRouter
   ↓ tourRouter passes control to reviewRouter

3. ROUTE HANDLER (reviewRoutes.js)
   .post(protect, restrictTo('user'), createReview)

4. MIDDLEWARE EXECUTION
   protect middleware:
     ✓ Extracts token from header
     ✓ Verifies signature
     ✓ Gets user from database
     ✓ Sets req.user = user
     ✓ Calls next()

   restrictTo('user') middleware:
     ✓ Checks req.user.role === 'user'
     ✓ Calls next()

5. CONTROLLER (reviewController.js)
   createReview(req, res, next)
     • Gets tourId from req.params.tourId
     • Gets userId from req.user.id
     • Creates review with Review.create()

6. MODEL MIDDLEWARE (reviewModel.js)
   post('save') triggered:
     • Calculates tour's average rating
     • Updates tour's ratingsAverage and ratingsQuantity

7. RESPONSE SENT
   Status: 201 Created
   Body: {
     status: 'success',
     data: {
       review: { _id, review, rating, tourId, userId, ... }
     }
   }

8. USER RECEIVES RESPONSE
```

---

## Summary

### Routes vs Models vs Controllers

| Component      | What                   | Where             | Example                    |
| -------------- | ---------------------- | ----------------- | -------------------------- |
| **Route**      | Defines URL endpoint   | tourRoutes.js     | POST /api/v1/tours/:id     |
| **Model**      | Defines data structure | tourModel.js      | { name, price, ... }       |
| **Controller** | Defines business logic | tourController.js | Get tour, validate, return |

### Key Flow

```
URL Request
  ↓ Route matches
Middleware checks (auth, role)
  ↓ Controller processes
Model reads/writes database
  ↓ Response sent
```

### Role-Based Access

```
Public Routes (no auth):
  - GET /tours
  - POST /signup
  - POST /login

User Routes (authenticated):
  - PATCH /updatePassword
  - GET /me
  - POST /reviews

Admin Routes (admin only):
  - POST /tours
  - DELETE /tours/:id
  - GET /users
  - DELETE /users/:id
```

This architecture makes the code **reusable**, **scalable**, and **easy to maintain**.

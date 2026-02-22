# Handler Factory Documentation

## Overview

**File:** `controllers/handlerFactory.js`

**Purpose:** Reusable functions that create handlers for common CRUD operations

**Why:** Instead of writing delete/update/create code multiple times, create it once and reuse

---

## What Is A Factory?

A **factory function** creates other functions. Instead of writing the same code repeatedly:

```javascript
// ❌ WITHOUT factory (repetitive):
exports.deleteTour = (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) throw new Error('Not found');
  res.status(204).json(null);
};

exports.deleteUser = (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new Error('Not found');
  res.status(204).json(null);
};

exports.deleteReview = (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new Error('Not found');
  res.status(204).json(null);
};

// ✅ WITH factory (reusable):
exports.deleteTour = factory.deleteOne(Tour);
exports.deleteUser = factory.deleteOne(User);
exports.deleteReview = factory.deleteOne(Review);
```

**Key Idea:** Write once, use 3+ times → DRY principle (Don't Repeat Yourself)

---

## How Factory Works

### Factory Function Pattern

```javascript
// Factory function takes a Model, returns a handler
const deleteOne = (Model) => {
  return async (req, res, next) => {
    // This is the actual handler
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      throw new Error('No document found');
    }

    res.status(204).json(null);
  };
};

// Usage:
const deleteTourHandler = deleteOne(Tour); // Get handler for Tour
const deleteUserHandler = deleteOne(User); // Get handler for User

// In routes, use the handler
router.delete('/:id', deleteTourHandler);
```

### Real Usage in This Project

```javascript
// tourController.js
const factory = require('./handlerFactory');

// Get handlers from factory
exports.deleteTour = factory.deleteOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// Then in tourRoutes.js
router.delete('/:id', deleteTour); // Use the handler
```

---

## Available Factory Functions

### 1. **deleteOne(Model)** - Delete by ID

**Purpose:** Delete a document and return 204 No Content

**Usage:**

```javascript
exports.deleteTour = factory.deleteOne(Tour);
exports.deleteUser = factory.deleteOne(User);
exports.deleteReview = factory.deleteOne(Review);
```

**How it works:**

1. Gets ID from `req.params.id`
2. Deletes document from database
3. If not found, throws error
4. Returns 204 (no content)

**What it does:**

```javascript
const deleteOne = (Model) => {
  return async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  };
};
```

**Usage in route:**

```javascript
router.delete('/:id', protect, restrictTo('admin'), deleteTour);

// Request:
DELETE /api/v1/tours/507f1f77bcf86cd799439011

// Response:
Status: 204 No Content
```

---

### 2. **updateOne(Model)** - Update by ID

**Purpose:** Update document and return updated data

**Usage:**

```javascript
exports.updateTour = factory.updateOne(Tour);
exports.updateUser = factory.updateOne(User);
exports.updateReview = factory.updateOne(Review);
```

**How it works:**

1. Gets ID from `req.params.id`
2. Updates document with `req.body`
3. Enables validators (validates updated data)
4. Returns updated document with 200

**What it does:**

```javascript
const updateOne = (Model) => {
  return async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Validate on update
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  };
};
```

**Usage in route:**

```javascript
router.patch('/:id', protect, restrictTo('admin'), updateTour);

// Request:
PATCH /api/v1/tours/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 1997
}

// Response:
Status: 200 OK
{
  "status": "success",
  "data": {
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Name",
      "price": 1997,
      // ... other fields
    }
  }
}
```

---

### 3. **createOne(Model)** - Create New Document

**Purpose:** Create new document from request body

**Usage:**

```javascript
exports.createTour = factory.createOne(Tour);
exports.createUser = factory.createOne(User);
exports.createReview = factory.createOne(Review);
```

**How it works:**

1. Creates document from `req.body`
2. Validates all required fields
3. Returns new document with 201 Created
4. Triggers any model hooks (like review auto-rating)

**What it does:**

```javascript
const createOne = (Model) => {
  return async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  };
};
```

**Usage in route:**

```javascript
router.post('/', protect, restrictTo('admin'), createTour);

// Request:
POST /api/v1/tours
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Tour",
  "duration": 5,
  "maxGroupSize": 30,
  "difficulty": "easy",
  "price": 1500,
  "summary": "Great tour"
}

// Response:
Status: 201 Created
{
  "status": "success",
  "data": {
    "data": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "New Tour",
      "duration": 5,
      // ... other fields
    }
  }
}
```

---

### 4. **getOne(Model, popOptions)** - Get Single Document

**Purpose:** Get one document by ID, with optional data population

**Usage:**

```javascript
// Without population
exports.getUser = factory.getOne(User);

// With population (include related data)
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.getReview = factory.getOne(Review, { path: 'userId' });
```

**Parameters:**

- `Model` - The database model (Tour, User, Review, etc.)
- `popOptions` - Optional object with `path` property
  - `path: 'reviews'` - Include reviews data
  - `path: 'userId'` - Include user data
  - Can be omitted if no population needed

**How it works:**

1. Gets ID from `req.params.id`
2. Fetches document from database
3. If popOptions provided, populates related data
4. Returns document with 200

**What it does (without population):**

```javascript
const getOne = (Model, popOptions) => {
  return async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (popOptions) {
      query = query.populate(popOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  };
};
```

**Usage Examples:**

```javascript
// Get tour WITH reviews
router.get('/:id', getTour);  // getTour uses factory.getOne(Tour, { path: 'reviews' })

// Request:
GET /api/v1/tours/507f1f77bcf86cd799439011

// Response:
{
  "status": "success",
  "data": {
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The City Wanderer",
      "reviews": [
        {
          "_id": "...",
          "review": "Amazing!",
          "rating": 5,
          "userId": {
            "_id": "...",
            "name": "John Doe"
          }
        },
        // ... more reviews
      ]
    }
  }
}
```

**Why Populate?**

```javascript
// Without population:
tour: {
  _id: "123",
  name: "Tour",
  reviews: ["456", "457"]  // Just IDs, no review data
}

// With population:
tour: {
  _id: "123",
  name: "Tour",
  reviews: [
    { _id: "456", review: "Great!", rating: 5 },
    { _id: "457", review: "Good", rating: 4 }
  ]
}
```

---

### 5. **getAll(Model)** - Get All Documents (with Filtering)

**Purpose:** Get all documents with support for filtering, sorting, pagination

**Usage:**

```javascript
exports.getAllTours = factory.getAll(Tour);
exports.getAllUsers = factory.getAll(User);
exports.getAllReviews = factory.getAll(Review);
```

**How it works:**

1. Reads request query parameters
2. Filters by fields (e.g., difficulty=easy)
3. Sorts results (e.g., sort=-price)
4. Implements pagination (e.g., page=2, limit=10)
5. Returns array of documents

**Supported Query Parameters:**

#### Filtering

```
GET /api/v1/tours?difficulty=easy
GET /api/v1/tours?price[lte]=1000&price[gte]=500
```

**Query operations:**

- `[gte]` - Greater than or equal
- `[lte]` - Less than or equal
- `[gt]` - Greater than
- `[lt]` - Less than

#### Sorting

```
GET /api/v1/tours?sort=price           // Low to high
GET /api/v1/tours?sort=-price          // High to low
GET /api/v1/tours?sort=-ratingAverage,price  // Multiple fields
```

#### Field Selection

```
GET /api/v1/tours?fields=name,price,difficulty
GET /api/v1/tours?fields=-description  // Exclude description
```

#### Pagination

```
GET /api/v1/tours?page=2&limit=10     // Page 2, 10 per page
GET /api/v1/tours?skip=20&limit=10    // Skip 20, get 10
```

**Response:**

```json
{
  "status": "success",
  "results": 29,
  "data": {
    "data": [
      {
        "_id": "...",
        "name": "Tour 1",
        "price": 500
      }
      // ... more documents
    ]
  }
}
```

---

### Special Feature: Nested Route Handling in getAll

The `getAll` factory has special logic for nested routes (reviews under tours):

```javascript
// In getAll factory:
if (req.params.tourId) {
  filter = { tourId: req.params.tourId }; // Auto-filter by tour
}
```

**How it works:**

When you access `/api/v1/tours/123/reviews`:

1. tourRouter matches `/123/reviews`
2. Sets `req.params.tourId = 123`
3. Passes to reviewRouter
4. reviewRouter's getAll handler (which uses `factory.getAll(Review)`)
5. Factory detects `req.params.tourId` and auto-filters

```javascript
// Example: Get reviews for tour 123
GET / api / v1 / tours / 123 / reviews;

// Factory automatically does:
Review.find({ tourId: 123 });

// Without needing special code in reviewController!
```

**This means you can use same handler for:**

- `GET /api/v1/reviews` - All reviews (no filter)
- `GET /api/v1/tours/123/reviews` - Reviews for tour 123 (auto-filtered)

---

## Using Factory in Controllers

### Basic Pattern

```javascript
// tourController.js
const factory = require('./handlerFactory');
const Tour = require('../models/tourModel');

// Create handlers from factory
exports.createTour = factory.createOne(Tour);
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// Plus custom handlers (aliasing, aggregations)
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  next();
};

exports.getTourStats = async (req, res, next) => {
  // Custom aggregation logic
};
```

### In Routes

```javascript
// tourRoutes.js
router.get('/top-5-cheap', aliasTopTours, getAllTours);
router.get('/tour-stats', getTourStats);
router.get('/', getAllTours);
router.post('/', protect, restrictTo('admin'), createTour);
router.get('/:id', getTour);
router.patch('/:id', protect, restrictTo('admin'), updateTour);
router.delete('/:id', protect, restrictTo('admin'), deleteTour);
```

---

## When to Use Factory vs Custom

### Use Factory When:

- Standard CRUD operation (Create, Read, Update, Delete)
- No special business logic needed
- Same code would work for multiple models

### Use Custom Handler When:

- Need special processing (calculations, aggregations)
- Complex business logic
- Need to call multiple models
- Special validation or transformation

**Example:**

```javascript
// ✅ Use factory (simple CRUD)
exports.deleteTour = factory.deleteOne(Tour);

// ✅ Custom handler (complex logic)
exports.getTourStats = async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingAverage: { $gte: 4.5 } } },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        avgRating: { $avg: '$ratingAverage' },
      },
    },
    { $sort: { avgPrice: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
};
```

---

## Error Handling

Factory functions throw errors that are caught by global error handler:

```javascript
// Global error handler in app.js
app.use((err, req, res, next) => {
  res.status(err.statusCode).json({
    status: 'fail',
    message: err.message,
  });
});
```

**Common errors from factory:**

| Situation          | Error                            | Status |
| ------------------ | -------------------------------- | ------ |
| Document not found | "No document found with that ID" | 404    |
| Validation fails   | "Validation error message"       | 400    |
| Database error     | Error message                    | 500    |

---

## Benefits of Factory Pattern

### 1. DRY (Don't Repeat Yourself)

```javascript
// One factory, used 3+ times
exports.deleteTour = factory.deleteOne(Tour);
exports.deleteUser = factory.deleteOne(User);
exports.deleteReview = factory.deleteOne(Review);
```

### 2. Consistency

All delete handlers work the same way - same error handling, response format

### 3. Easy to Maintain

Fix bug in factory → fixed in all handlers using it

### 4. Less Code

Instead of 50+ lines per handler × 5 handlers = 250+ lines
With factory: 5 lines total

### 5. Reliable

Well-tested factory code is used everywhere

---

## Comparison: With and Without Factory

### Without Factory (120 lines)

```javascript
// tourController.js

exports.getAllTours = async (req, res, next) => {
  try {
    // Build filter from query
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    const queryObj = { ...req.query };
    excludedFields.forEach((el) => delete queryObj[el]);

    // Apply operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    const filter = JSON.parse(queryStr);

    // Execute query with filter, sort, pagination, field selection
    let query = Tour.find(filter);
    if (req.query.sort) query = query.sort(req.query.sort);
    if (req.query.fields) query = query.select(req.query.fields);

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    const tours = await query;

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: { data: tours },
    });
  } catch (err) {
    next(err);
  }
};

exports.createTour = async (req, res, next) => {
  try {
    const tour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { data: tour },
    });
  } catch (err) {
    next(err);
  }
};

exports.getTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id).populate('reviews');
    if (!tour) throw new Error('No document found');

    res.status(200).json({
      status: 'success',
      data: { data: tour },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTour = async (req, res, next) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tour) throw new Error('No document found');

    res.status(200).json({
      status: 'success',
      data: { data: tour },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTour = async (req, res, next) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) throw new Error('No document found');

    res.status(204).json(null);
  } catch (err) {
    next(err);
  }
};

// ... same for users and reviews = 120 lines of repetitive code
```

### With Factory (5 lines)

```javascript
// tourController.js
const factory = require('./handlerFactory');
const Tour = require('../models/tourModel');

exports.getAllTours = factory.getAll(Tour);
exports.createTour = factory.createOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
```

**Reduction: 120 lines → 5 lines (96% less code!)** ✅

---

## Summary

**Handler Factory:**

- **Eliminates code duplication** for CRUD operations
- **Reusable** across Tour, User, Review, any model
- **Consistent** error handling and response format
- **Flexible** with popOptions for data inclusion
- **Smart** with nested route filtering
- **Easy to maintain** - fix factory once, fixes everywhere

**Key Functions:**

- `deleteOne(Model)` - Delete document
- `updateOne(Model)` - Update document
- `createOne(Model)` - Create document
- `getOne(Model, popOptions)` - Get single (with optional population)
- `getAll(Model)` - Get all (with filtering, sorting, pagination)

**Reference for developers:** When you need CRUD handlers, use factory functions instead of writing custom code.

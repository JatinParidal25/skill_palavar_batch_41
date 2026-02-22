# Review Controller Documentation

## Overview

The `reviewController.js` file contains route handlers for managing tour reviews. It handles creating and retrieving reviews with support for nested routing (reviews under specific tours). The controller integrates with the Review model and uses role-based access control.

---

## Functions

### 1. `getAllReviews(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Retrieves all reviews from the database.

**Parameters:** None (optional: can filter by tour via nested routes)

**Response (200 OK):**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    reviews: [
      {
        _id: ObjectId,
        tourId: ObjectId,
        userId: ObjectId,
        review: String,
        rating: Number,
        createdAt: Date,
        ...
      }
    ]
  }
}
```

**How it works:**

1. Queries the Review collection for all documents
2. Returns array of all reviews with total count
3. Wrapped with `catchAsync` for error handling

**Error Handling:**

- Database connection errors → 500 Server Error
- Any other async errors → caught and passed to error handler

**Request:** `GET /api/v1/reviews` or `GET /api/v1/tours/:tourId/reviews`

**Example Response:**

```javascript
{
  status: 'success',
  results: 5,
  data: {
    reviews: [
      {
        _id: '507f1f77bcf86cd799439011',
        tourId: '507f1f77bcf86cd799439001',
        userId: '507f1f77bcf86cd799439021',
        review: 'Amazing tour experience!',
        rating: 5,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        _id: '507f1f77bcf86cd799439012',
        tourId: '507f1f77bcf86cd799439002',
        userId: '507f1f77bcf86cd799439022',
        review: 'Good but could be better',
        rating: 3,
        createdAt: '2024-01-14T14:20:00Z'
      }
    ]
  }
}
```

**Usage:**

- Get all reviews in the system
- When accessed via nested route `/api/v1/tours/:tourId/reviews`, returns all reviews (note: filtering not yet implemented)
- Useful for admin dashboards, moderation, analytics

**Note:** Currently returns all reviews regardless of nested route parameter. Future enhancement could implement filtering by tourId when accessed via nested route.

---

### 2. `createReview(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Creates a new review for a tour. Handles nested routing to automatically associate review with tour and user.

**Request Body:**

```javascript
{
  tourId: ObjectId (optional - can come from URL parameter),
  userId: ObjectId (optional - automatically set from authenticated user),
  review: String,
  rating: Number,
  // ... other review fields
}
```

**Response (201 Created):**

```javascript
{
  status: 'success',
  data: {
    review: {
      _id: ObjectId,
      tourId: ObjectId,
      userId: ObjectId,
      review: String,
      rating: Number,
      createdAt: Date,
      ...
    }
  }
}
```

**How it works:**

1. **Handle Nested Routes:** Checks if `tourId` is in request body
   - If not provided, uses `tourId` from URL parameters (`req.params.tourId`)
   - Allows flexibility in how review is created
2. **Set User ID:** Checks if `userId` is in request body
   - If not provided, uses the authenticated user's ID from `req.user.id`
   - Ensures user cannot create reviews on behalf of others
3. **Create Review:** Creates new review document with complete data
   - Uses Review.create() which triggers schema validations
   - Validates review content and rating
4. **Return Response:** Returns created review with 201 status code

**Prerequisites:**

- User must be authenticated (requires `protect` middleware)
- User must have 'user' role (requires `restrictTo('user')` middleware)

**Error Handling:**

- User not authenticated → 401 Unauthorized
- User role not 'user' → 403 Forbidden
- Schema validation fails (invalid rating, missing fields) → 400 Bad Request
- Database errors → 500 Server Error

**Route Usage:**

```javascript
// Regular route
POST /api/v1/reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "tourId": "507f1f77bcf86cd799439001",
  "review": "Excellent experience!",
  "rating": 5
}

// Nested route (tourId from URL)
POST /api/v1/tours/507f1f77bcf86cd799439001/reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "review": "Amazing tour!",
  "rating": 5
}
```

**Request Examples:**

Standard Review Creation:

```javascript
POST /api/v1/reviews
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "tourId": "507f1f77bcf86cd799439001",
  "review": "This tour was absolutely fantastic! Great views and excellent guide.",
  "rating": 5
}
```

Nested Route (Recommended):

```javascript
POST /api/v1/tours/507f1f77bcf86cd799439001/reviews
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "review": "Beautiful landscapes and knowledgeable guide!",
  "rating": 4
}
```

**Response Example:**

```javascript
{
  status: 'success',
  data: {
    review: {
      _id: '507f1f77bcf86cd799439050',
      tourId: '507f1f77bcf86cd799439001',
      userId: '507f1f77bcf86cd799439021',
      review: 'Excellent experience!',
      rating: 5,
      createdAt: '2024-01-25T10:30:00Z'
    }
  }
}
```

**Security Features:**

- Requires authentication (protect middleware)
- Restricts to 'user' role only (not admin/guide/lead-guide)
- User ID automatically set from authenticated user (prevents spoofing)
- User cannot specify different userId in request

**Important Notes:**

- User ID is always set from `req.user.id` (authenticated user)
- TourId can come from either request body or URL parameter (nested route)
- Automatic population from URL parameters enables clean nested routing
- Each user can create multiple reviews for same or different tours
- Review content and rating validated by schema

**Nested Route Pattern:**
This endpoint demonstrates RESTful nested routing where:

```
GET  /api/v1/tours/:tourId/reviews      → Get all reviews for a tour
POST /api/v1/tours/:tourId/reviews      → Create review for a tour
```

The `mergeParams: true` option in router configuration allows the nested router to access `tourId` from the parent route.

---

## Dependencies

### Utilities

- **catchAsync:** Wrapper for handling async errors

### Models

- **Review:** Mongoose schema for review documents

### Middleware (from authController)

- **protect:** Verifies JWT token and authenticates user
- **restrictTo:** Restricts access to specific roles

---

## Authentication & Authorization

| Function        | Required Auth | Required Role | Status Code if Denied           |
| --------------- | ------------- | ------------- | ------------------------------- |
| `getAllReviews` | No            | N/A           | Public                          |
| `createReview`  | Yes           | 'user'        | 401 (no auth), 403 (wrong role) |

---

## Error Handling

### Common Errors

| Scenario                   | Status | Response                                            |
| -------------------------- | ------ | --------------------------------------------------- |
| Create review without auth | 401    | "You are not logged in!"                            |
| Create review as non-user  | 403    | "You do not have permission to perform this action" |
| Invalid rating value       | 400    | Schema validation error message                     |
| Missing required fields    | 400    | Schema validation error message                     |
| Invalid tourId reference   | 400    | Foreign key validation error (if enforced)          |

---

## Best Practices

### Creating Reviews

```javascript
// Use nested route (recommended)
POST /api/v1/tours/{tourId}/reviews

{
  "review": "Great experience!",
  "rating": 4
}

// Nested route automatically sets:
// - tourId from URL parameter
// - userId from authenticated user
```

### Retrieving Reviews

```javascript
// Get all reviews in system
GET / api / v1 / reviews;

// Get reviews for specific tour
GET / api / v1 / tours / { tourId } / reviews;
```

---

## Route Integration

### Router Setup (from reviewRoutes.js)

```javascript
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllReviews)
  .post(protect, restrictTo('user'), createReview);
```

### Main App Integration

```javascript
// In app.js
app.use('/api/v1/tours/:tourId/reviews', reviewRoutes);
app.use('/api/v1/reviews', reviewRoutes);
```

---

## Future Enhancements

1. **Filter reviews by tour:** When accessed via nested route, filter results by tourId
2. **Get single review:** Implement `getReview(req, res, next)`
3. **Update review:** Implement `updateReview(req, res, next)` (author only)
4. **Delete review:** Implement `deleteReview(req, res, next)` (author/admin only)
5. **Review statistics:** Calculate average rating and review count per tour
6. **Pagination:** Add pagination to getAllReviews for large datasets
7. **Populate references:** Populate user and tour details in review responses
8. **Sorting & filtering:** Advanced query features for reviews

---

## External Dependencies

- **mongoose:** ODM for MongoDB
- **express:** Web framework

---

## Notes

- Reviews are user-generated content for tours
- Each review is linked to both a tour and a user
- Only authenticated users with 'user' role can create reviews
- The nested routing pattern allows clean API design
- Future implementations may include review moderation, edit/delete, rating aggregation

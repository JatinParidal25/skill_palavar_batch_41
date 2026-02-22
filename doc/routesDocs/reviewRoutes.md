# Review Routes Documentation

## Overview

The `reviewRoutes.js` file defines all HTTP routes for review-related operations. It implements nested routing to allow reviews to be accessed and created under specific tours, following RESTful conventions. The routes are protected with authentication and role-based authorization middleware.

---

## Route Definition

```javascript
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllReviews)
  .post(protect, restrictTo('user'), createReview);

module.exports = router;
```

**Key Configuration:**

- `mergeParams: true` - Allows router to access parameters from parent routes (e.g., `:tourId`)
- Routes use Express chaining pattern with `.route()` method

---

## Routes

### 1. GET `/api/v1/reviews`

**Purpose:** Retrieve all reviews in the system

**Middleware:**

- None (public endpoint)

**Controller:** `getAllReviews`

**Response (200 OK):**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    reviews: [...]
  }
}
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/reviews
```

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
        review: 'Amazing tour!',
        rating: 5
      },
      // ... more reviews
    ]
  }
}
```

---

### 2. POST `/api/v1/reviews`

**Purpose:** Create a new review

**Middleware:**

1. `protect` - Verifies JWT token and authenticates user
2. `restrictTo('user')` - Restricts to users with 'user' role

**Controller:** `createReview`

**Request Body:**

```javascript
{
  tourId: ObjectId,
  review: String,
  rating: Number
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
      createdAt: Date
    }
  }
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/reviews \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "507f1f77bcf86cd799439001",
    "review": "Great tour!",
    "rating": 5
  }'
```

**Error Responses:**

```javascript
// No authentication
{
  status: 'fail',
  message: 'You are not logged in!'
}  // 401

// Wrong role (not 'user')
{
  status: 'fail',
  message: 'You do not have permission to perform this action'
}  // 403

// Invalid data
{
  status: 'fail',
  message: 'Invalid input Data: {validation errors}'
}  // 400
```

---

### 3. GET `/api/v1/tours/:tourId/reviews`

**Purpose:** Retrieve all reviews for a specific tour (nested route)

**Middleware:**

- None (public endpoint)

**Route Parameters:**

- `tourId` - MongoDB ObjectId of the tour

**Controller:** `getAllReviews`

**Response (200 OK):**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    reviews: [
      {
        tourId: ':tourId',  // Filtered by this tour
        // ... review data
      }
    ]
  }
}
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/tours/507f1f77bcf86cd799439001/reviews
```

**Note:** Currently, `getAllReviews` returns all reviews regardless of tourId parameter. Future enhancement should implement filtering by tourId when accessed via nested route.

---

### 4. POST `/api/v1/tours/:tourId/reviews`

**Purpose:** Create a new review for a specific tour (nested route)

**Middleware:**

1. `protect` - Verifies JWT token and authenticates user
2. `restrictTo('user')` - Restricts to users with 'user' role

**Route Parameters:**

- `tourId` - MongoDB ObjectId of the tour

**Controller:** `createReview`

**Request Body:**

```javascript
{
  // tourId is automatically populated from URL
  review: String,
  rating: Number
}
```

**Response (201 Created):**

```javascript
{
  status: 'success',
  data: {
    review: {
      _id: ObjectId,
      tourId: ':tourId',  // Set from URL parameter
      userId: ObjectId,   // Set from authenticated user
      review: String,
      rating: Number,
      createdAt: Date
    }
  }
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/tours/507f1f77bcf86cd799439001/reviews \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "review": "Excellent tour experience!",
    "rating": 5
  }'
```

**Benefits of Nested Route:**

- Cleaner API - URL shows relationship (review belongs to tour)
- Automatic tourId population - No need to specify in request body
- RESTful conventions - Following resource hierarchy
- Better semantics - Intent is clear from URL structure

**Error Cases:**

```javascript
// Invalid tourId format
{
  status: 'fail',
  message: 'Invalid {tourId}: {value}'
}  // 400

// Tour not found (if enforced)
{
  status: 'fail',
  message: 'No tour found with that ID'
}  // 404

// Not authenticated
{
  status: 'fail',
  message: 'You are not logged in!'
}  // 401

// Invalid role
{
  status: 'fail',
  message: 'You do not have permission to perform this action'
}  // 403
```

---

## Middleware Explanation

### `protect` Middleware

**Source:** `authController.js`

**Purpose:** Verifies JWT token and authenticates user

**What it does:**

1. Extracts token from `Authorization: Bearer {token}` header
2. Verifies token signature
3. Checks if user still exists in database
4. Validates user hasn't changed password after token issue
5. Sets `req.user` to authenticated user object

**On Success:** Passes control to next middleware/route handler

**On Failure:** Returns 401 Unauthorized with error message

**Usage:** Applied to all POST requests to prevent unauthenticated review creation

---

### `restrictTo('user')` Middleware

**Source:** `authController.js`

**Purpose:** Restricts access to users with specific roles

**What it does:**

1. Checks if user's role is in allowed roles array
2. Returns 403 Forbidden if role not allowed
3. Calls next() if authorized

**Configuration in reviewRoutes:**

```javascript
.post(protect, restrictTo('user'), createReview)
```

**Effect:** Only users with `role: 'user'` can create reviews

- 'admin' users cannot create reviews
- 'guide' users cannot create reviews
- 'lead-guide' users cannot create reviews

**Reason:** Ensures reviews come from regular users, not staff members

---

## HTTP Methods Summary

| Method | Path                            | Public | Auth | Role | Handler         |
| ------ | ------------------------------- | ------ | ---- | ---- | --------------- |
| GET    | `/api/v1/reviews`               | ✓      | No   | N/A  | `getAllReviews` |
| POST   | `/api/v1/reviews`               | ✗      | Yes  | user | `createReview`  |
| GET    | `/api/v1/tours/:tourId/reviews` | ✓      | No   | N/A  | `getAllReviews` |
| POST   | `/api/v1/tours/:tourId/reviews` | ✗      | Yes  | user | `createReview`  |

---

## Integration with Main App

In `app.js` or main server file, reviewRoutes should be registered:

```javascript
const reviewRoutes = require('./routes/reviewRoutes');

// Nested route
app.use('/api/v1/tours/:tourId/reviews', reviewRoutes);

// Direct route
app.use('/api/v1/reviews', reviewRoutes);
```

This registration allows reviews to be accessed via both:

- Nested context: `/api/v1/tours/{id}/reviews`
- Direct path: `/api/v1/reviews`

---

## RESTful Design Pattern

The review routes follow REST conventions:

```
Resource: Reviews
Nested Resource: Reviews under Tours

Hierarchy:
/tours/:tourId/reviews  ← Reviews for specific tour
  ├── GET              ← Retrieve reviews
  └── POST             ← Create review

/reviews                ← All reviews
  ├── GET              ← List all
  └── POST             ← Create (direct creation)
```

---

## Nested Routing Benefits

### Before (without nested routes)

```javascript
// Client must know tourId and specify it
POST /api/v1/reviews
{
  "tourId": "507f1f77bcf86cd799439001",
  "review": "Great tour!",
  "rating": 5
}
```

### After (with nested routes)

```javascript
// tourId comes from URL, cleaner request body
POST /api/v1/tours/507f1f77bcf86cd799439001/reviews
{
  "review": "Great tour!",
  "rating": 5
}
```

**Advantages:**

1. **Clearer intent** - URL shows review belongs to tour
2. **Smaller payloads** - No need for tourId in body
3. **Better validation** - Invalid tourId immediately evident from URL
4. **RESTful design** - Follows resource hierarchy conventions
5. **Automatic population** - `mergeParams: true` handles parameter passing

---

## Query Parameters (Future Enhancement)

While not currently implemented, these query parameters could enhance the routes:

```javascript
// Pagination
GET /api/v1/reviews?page=1&limit=10

// Sorting
GET /api/v1/reviews?sort=-rating&sort=createdAt

// Filtering
GET /api/v1/reviews?rating[gte]=4&rating[lte]=5

// Field selection
GET /api/v1/reviews?fields=review,rating,createdAt
```

---

## Status Codes Used

| Code | Meaning      | Routes                        |
| ---- | ------------ | ----------------------------- |
| 200  | OK           | GET requests                  |
| 201  | Created      | POST requests                 |
| 400  | Bad Request  | Invalid data or parameters    |
| 401  | Unauthorized | No authentication token       |
| 403  | Forbidden    | Wrong role (not 'user')       |
| 404  | Not Found    | Resource not found            |
| 500  | Server Error | Database or processing errors |

---

## Security Considerations

1. **Authentication Required:** POST requests require valid JWT token
2. **Role-Based Access:** Only 'user' role can create reviews
3. **User Association:** userId automatically set from authenticated user
4. **No Direct IDs:** Users cannot specify userId (prevents spoofing)
5. **Public Reads:** Reviews are public (can be read without auth)
6. **Controlled Writes:** Only authenticated users can create reviews

---

## Possible Future Endpoints

```javascript
// Get single review
GET /api/v1/reviews/:id

// Update review (author only)
PATCH /api/v1/reviews/:id

// Delete review (author/admin only)
DELETE /api/v1/reviews/:id

// Get reviews for specific tour
GET /api/v1/tours/:tourId/reviews
  (with filtering implementation)

// Review statistics
GET /api/v1/tours/:tourId/reviews/stats
```

---

## 🧪 Testing Routes with Postman

Below are practical examples for testing each review route in Postman.

### Setup

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:**

- For POST requests, you need a valid JWT token
- Get token from signup or login
- Role must be 'user'

---

### 1. GET All Reviews

**Request:**

```
GET {{baseURL}}/reviews
```

**Headers:** None required (public endpoint)

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 15,
  "data": {
    "reviews": [
      {
        "_id": "5c8a34ed14eb5c17645c9108",
        "review": "Cras mollis nisi parturient mi nec aliquet suspendisse sagittis eros condimentum scelerisque taciti mattis praesent feugiat eu nascetur a tincidunt",
        "rating": 5,
        "createdAt": "2024-01-15T09:00:00.000Z",
        "tour": {
          "_id": "5c88fa8cf4afda39709c2955",
          "name": "The Sea Explorer"
        },
        "user": {
          "_id": "5c8a1d5b0190b214360dc057",
          "name": "Jonas Schmedtmann",
          "photo": "user-1.jpg"
        }
      }
    ]
  }
}
```

**With Filters:**

```
GET {{baseURL}}/reviews?rating[gte]=4
GET {{baseURL}}/reviews?rating=5&sort=-createdAt
```

---

### 2. POST Create Review (General)

**Request:**

```
POST {{baseURL}}/reviews
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Requirements:**

- Must be logged in
- Role must be 'user'

**Body (JSON):**

```json
{
  "review": "This was an amazing tour! The guides were knowledgeable and the scenery was breathtaking. Highly recommend to anyone visiting the area.",
  "rating": 5,
  "tour": "5c88fa8cf4afda39709c2955"
}
```

**Note:** `user` field is automatically set from authenticated user (req.user)

**Expected Response (201):**

```json
{
  "status": "success",
  "data": {
    "review": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "review": "This was an amazing tour! The guides were knowledgeable and the scenery was breathtaking. Highly recommend to anyone visiting the area.",
      "rating": 5,
      "tour": "5c88fa8cf4afda39709c2955",
      "user": "5c8a1d5b0190b214360dc057",
      "createdAt": "2024-02-05T10:30:00.000Z"
    }
  }
}
```

**After Creating Review:**

- Tour's `ratingsAverage` and `ratingsQuantity` are automatically updated
- Check tour endpoint to see updated ratings

**Common Error (401):**

```json
{
  "status": "fail",
  "message": "You are not logged in! Please log in to get access."
}
```

**Common Error (403):**

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

**Validation Error (400):**

```json
{
  "status": "fail",
  "message": "Invalid input data. Rating must be between 1 and 5"
}
```

---

### 3. GET Reviews for Specific Tour (Nested Route)

**Request:**

```
GET {{baseURL}}/tours/5c88fa8cf4afda39709c2955/reviews
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 7,
  "data": {
    "reviews": [
      {
        "_id": "5c8a34ed14eb5c17645c9108",
        "review": "Amazing experience!",
        "rating": 5,
        "tour": "5c88fa8cf4afda39709c2955",
        "user": {
          "_id": "5c8a1d5b0190b214360dc057",
          "name": "Jonas Schmedtmann",
          "photo": "user-1.jpg"
        }
      }
    ]
  }
}
```

**Note:** Only returns reviews for the specified tour

---

### 4. POST Create Review for Tour (Nested Route)

**Request:**

```
POST {{baseURL}}/tours/5c88fa8cf4afda39709c2955/reviews
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Requirements:**

- Must be logged in
- Role must be 'user'

**Body (JSON):**

```json
{
  "review": "Great tour with excellent guides. Would definitely recommend!",
  "rating": 4
}
```

**Note:** Tour ID comes from URL, so no need to include in body

**Expected Response (201):**

```json
{
  "status": "success",
  "data": {
    "review": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j2",
      "review": "Great tour with excellent guides. Would definitely recommend!",
      "rating": 4,
      "tour": "5c88fa8cf4afda39709c2955",
      "user": "5c8a1d5b0190b214360dc057",
      "createdAt": "2024-02-05T10:35:00.000Z"
    }
  }
}
```

**Automatic Updates Triggered:**

1. Review is saved to database
2. `post('save')` hook runs
3. `calcAverageRatings()` static method called
4. Tour's ratings are recalculated and updated

**Verify Auto-Update:**

```
GET {{baseURL}}/tours/5c88fa8cf4afda39709c2955
```

Check `ratingsAverage` and `ratingsQuantity` fields.

---

### 5. GET Single Review

**Request:**

```
GET {{baseURL}}/reviews/5c8a34ed14eb5c17645c9108
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "review": {
      "_id": "5c8a34ed14eb5c17645c9108",
      "review": "Cras mollis nisi parturient mi nec aliquet suspendisse sagittis",
      "rating": 5,
      "createdAt": "2024-01-15T09:00:00.000Z",
      "tour": {
        "_id": "5c88fa8cf4afda39709c2955",
        "name": "The Sea Explorer"
      },
      "user": {
        "_id": "5c8a1d5b0190b214360dc057",
        "name": "Jonas Schmedtmann",
        "photo": "user-1.jpg"
      }
    }
  }
}
```

**Common Error (404):**

```json
{
  "status": "fail",
  "message": "No review found with that ID"
}
```

---

### 6. PATCH Update Review

**Request:**

```
PATCH {{baseURL}}/reviews/5c8a34ed14eb5c17645c9108
```

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Requirements:**

- Must be logged in
- Must be the review author OR admin

**Body (JSON) - Update what you want:**

```json
{
  "review": "Updated review text with more details about my experience.",
  "rating": 4
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "review": {
      "_id": "5c8a34ed14eb5c17645c9108",
      "review": "Updated review text with more details about my experience.",
      "rating": 4,
      "tour": "5c88fa8cf4afda39709c2955",
      "user": "5c8a1d5b0190b214360dc057"
    }
  }
}
```

**Auto-Update Triggered:**

- Tour ratings are recalculated
- Check tour to see updated `ratingsAverage`

**Common Error (403):**

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action"
}
```

---

### 7. DELETE Review

**Request:**

```
DELETE {{baseURL}}/reviews/5c8a34ed14eb5c17645c9108
```

**Headers:**

```
Authorization: Bearer {{token}}
```

**Requirements:**

- Must be logged in
- Must be the review author OR admin

**Expected Response (204 No Content):**

```
(Empty response body)
```

**Auto-Update Triggered:**

- Review is deleted
- Tour ratings are recalculated (one less review)
- Tour's `ratingsQuantity` decremented
- `ratingsAverage` recalculated

**Verify:**

```
GET {{baseURL}}/tours/5c88fa8cf4afda39709c2955
```

Check updated ratings.

---

### Postman Collection Setup

#### Environment Variables

```
baseURL: http://localhost:5000/api/v1
token: (set after login)
tourId: 5c88fa8cf4afda39709c2955
reviewId: 5c8a34ed14eb5c17645c9108
```

#### Auto-Save Token

In login/signup Tests tab:

```javascript
if (pm.response.json().token) {
  pm.environment.set('token', pm.response.json().token);
}
```

#### Auto-Save IDs

In create review Tests tab:

```javascript
if (pm.response.json().data.review) {
  pm.environment.set('reviewId', pm.response.json().data.review._id);
}
```

---

### Testing Workflow

**1. Setup:**

```
1. Login as user (role: 'user') → saves token
2. Get a tour ID from GET /tours
```

**2. Create Review:**

```
POST /tours/{{tourId}}/reviews
- Include review text and rating
- Check response for review ID
```

**3. Verify Auto-Update:**

```
GET /tours/{{tourId}}
- Check ratingsAverage updated
- Check ratingsQuantity incremented
```

**4. Get Reviews:**

```
GET /tours/{{tourId}}/reviews
- See your review in the list
```

**5. Update Review:**

```
PATCH /reviews/{{reviewId}}
- Change rating or text
```

**6. Verify Update:**

```
GET /tours/{{tourId}}
- Check ratingsAverage recalculated
```

**7. Delete Review:**

```
DELETE /reviews/{{reviewId}}
```

**8. Verify Deletion:**

```
GET /tours/{{tourId}}
- Check ratingsQuantity decreased
- Check ratingsAverage recalculated
```

---

### Postman Tests

Add to Tests tab for validation:

```javascript
// Test status code
pm.test('Status code is successful', function() {
  pm.response.to.have.status.oneOf([200, 201, 204]);
});

// Test review structure
pm.test('Review has required fields', function() {
  const review = pm.response.json().data.review;
  pm.expect(review).to.have.property('rating');
  pm.expect(review).to.have.property('review');
  pm.expect(review).to.have.property('tour');
  pm.expect(review).to.have.property('user');
});

// Test rating range
pm.test('Rating is between 1 and 5', function() {
  const rating = pm.response.json().data.review.rating;
  pm.expect(rating).to.be.within(1, 5);
});
```

---

### Testing Auto-Rating Updates

**Scenario:** Verify reviews automatically update tour ratings

**Step 1:** Get initial tour ratings

```
GET {{baseURL}}/tours/{{tourId}}
```

Save `ratingsAverage` and `ratingsQuantity`.

**Step 2:** Create a 5-star review

```
POST {{baseURL}}/tours/{{tourId}}/reviews
Body: { "review": "Perfect!", "rating": 5 }
```

**Step 3:** Get updated tour ratings

```
GET {{baseURL}}/tours/{{tourId}}
```

**Expected:**

- `ratingsQuantity` increased by 1
- `ratingsAverage` recalculated

**Step 4:** Delete the review

```
DELETE {{baseURL}}/reviews/{{reviewId}}
```

**Step 5:** Verify ratings reverted

```
GET {{baseURL}}/tours/{{tourId}}
```

**Expected:**

- `ratingsQuantity` decreased by 1
- `ratingsAverage` recalculated back

---

### Common Testing Errors

**Error: Cannot create review (401)**

```
Solution: Login first and use Bearer token
```

**Error: Not a 'user' role (403)**

```
Solution: Login with a user account (not guide/admin)
To create test user:
POST {{baseURL}}/users/signup
```

**Error: Duplicate review (400)**

```
Some implementations prevent duplicate reviews per user/tour
Solution: Use different user or different tour
```

**Error: Invalid tour ID (404)**

```
Solution: Get valid tour ID from GET /tours
```

---

### Postman Collection Organization

```
Review Routes/
├── 1. Get All Reviews
├── 2. Create Review (Direct)
├── 3. Nested Routes/
│   ├── Get Tour Reviews
│   └── Create Tour Review
├── 4. Single Review/
│   ├── Get Review
│   ├── Update Review
│   └── Delete Review
└── 5. Testing Auto-Updates/
    ├── Before - Get Tour
    ├── Create 5-star Review
    ├── After - Get Tour (verify)
    ├── Delete Review
    └── Final - Get Tour (verify)
```

---

## Related Controllers & Routes

- **authController:** Provides `protect` and `restrictTo` middleware
- **reviewController:** Contains route handlers
- **Tour routes:** Parent resource for nested reviews
- **User routes:** Creator of reviews (future user profile routes)

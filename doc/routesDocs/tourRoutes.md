# Tour Routes Documentation

## Overview

**File:** `routes/tourRoutes.js`

**Purpose:** Define all HTTP endpoints related to tours

**Key Feature:** Implements nested routing for reviews (e.g., `/tours/123/reviews`)

---

## How Tour Routes Work

### Route Setup

```javascript
const router = express.Router();

// Mount review routes as nested resource
// All review operations go through tour ID
router.use('/:tourId/reviews', reviewRouter);
```

**What this does:**

- Any request to `/api/v1/tours/123/reviews` goes to reviewRouter
- The `:tourId` parameter (123) is available to review handlers
- Allows organization: tour reviews belong under tour routes

---

## All Tour Routes

### 1. **GET /top-5-cheap** - Top 5 Cheapest Tours

```
GET /api/v1/tours/top-5-cheap
```

**Purpose:** Get 5 cheapest, best-rated tours quickly

**Authentication:** Not required (public)

**How it works:**

1. Request arrives
2. `aliasTopTours` middleware pre-sets query parameters:
   - limit: 5 (only 5 results)
   - sort: -ratingAverage,price (best rated, then cheapest)
   - fields: name, price, rating, summary, difficulty (only these fields)
3. Passes to `getAllTours`
4. Returns filtered results

**Response Example:**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "tours": [
      {
        "_id": "...",
        "name": "Beach Paradise",
        "price": 297,
        "ratingAverage": 4.9,
        "summary": "Relaxing beach tour"
      }
      // ... 4 more tours
    ]
  }
}
```

---

### 2. **GET /tour-stats** - Tour Statistics

```
GET /api/v1/tours/tour-stats
```

**Purpose:** Get aggregate statistics about all tours

**Authentication:** Not required (public)

**What it returns:**

- Number of tours by difficulty level
- Number of tours by difficulty with ratings >= 4.5
- Average, min, max price by difficulty
- Average, min, max rating by difficulty

**How it works:**

- Uses MongoDB aggregation pipeline
- Groups tours by difficulty
- Calculates statistics per group

**Response Example:**

```json
{
  "status": "success",
  "data": {
    "stats": [
      {
        "_id": "easy",
        "numTours": 13,
        "numRatings": 220,
        "avgPrice": 1281.67,
        "minPrice": 299,
        "maxPrice": 1997,
        "avgRating": 4.67,
        "minRating": 2.8,
        "maxRating": 5
      }
      // ... other difficulty levels
    ]
  }
}
```

---

### 3. **GET /monthly-plan/:year** - Tour Schedule by Month

```
GET /api/v1/tours/monthly-plan/2024
```

**Purpose:** See which tours start in each month of a year

**Authentication:** Required (login needed)

**Authorization:** admin, lead-guide, guide (these roles plan tours)

**What it returns:**

- List of tours for each month
- How many tours start each month
- Which guides are scheduled

**Response Example:**

```json
{
  "status": "success",
  "data": {
    "plan": [
      {
        "_id": 1, // January
        "numTourStarts": 3,
        "tours": [
          { "name": "Mountain Climb", "difficulty": "difficult" }
          // ...
        ]
      }
      // ... other months
    ]
  }
}
```

---

### 4. **GET /** - Get All Tours (with Filters)

```
GET /api/v1/tours
GET /api/v1/tours?difficulty=easy&price[lte]=1000
GET /api/v1/tours?sort=-price&fields=name,price
```

**Purpose:** Get tours with optional filtering, sorting, and pagination

**Authentication:** Not required (public)

**Features:**

#### Filtering

```javascript
// Get easy tours
GET /api/v1/tours?difficulty=easy

// Get tours under $1000
GET /api/v1/tours?price[lte]=1000

// Combine filters
GET /api/v1/tours?difficulty=easy&price[lte]=1000&ratingsAverage[gte]=4.5
```

#### Sorting

```javascript
// Sort by price (low to high)
GET /api/v1/tours?sort=price

// Sort by price (high to low)
GET /api/v1/tours?sort=-price

// Sort by multiple fields
GET /api/v1/tours?sort=-ratingsAverage,price
```

#### Field Selection

```javascript
// Only return name and price
GET /api/v1/tours?fields=name,price

// Exclude certain fields
GET /api/v1/tours?fields=-description,-startDates
```

#### Pagination

```javascript
// Page 1, 10 results per page
GET /api/v1/tours?page=1&limit=10

// Page 3, 20 results per page
GET /api/v1/tours?page=3&limit=20
```

**Response Example:**

```json
{
  "status": "success",
  "results": 29,
  "data": {
    "tours": [
      {
        "_id": "...",
        "name": "The City Wanderer",
        "duration": 9,
        "price": 1197,
        "difficulty": "easy",
        "ratingAverage": 4.8
      }
      // ... more tours
    ]
  }
}
```

---

### 5. **POST /** - Create New Tour

```
POST /api/v1/tours
Content-Type: application/json

{
  "name": "New Beach Tour",
  "duration": 7,
  "maxGroupSize": 30,
  "difficulty": "easy",
  "price": 1497,
  "summary": "Beautiful beach experience",
  "description": "Detailed description here",
  "imageCover": "/img/tours/tour-1-cover.jpg",
  "images": ["/img/tours/tour-1-1.jpg"],
  "startDates": ["2024-06-01", "2024-07-15"]
}
```

**Purpose:** Create a new tour (admin/lead-guide only)

**Authentication:** Required (login needed)

**Authorization:** admin, lead-guide only

**Required Fields:**

- name (10-40 characters)
- duration (number of days)
- maxGroupSize (max participants)
- difficulty (easy/medium/difficult)
- price (in currency units)
- summary (short description)
- imageCover (image path)

**Response:**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "New Beach Tour",
      "duration": 7,
      "maxGroupSize": 30,
      "difficulty": "easy",
      "price": 1497,
      "ratingAverage": 4.5,
      "ratingQuantity": 0
    }
  }
}
```

---

### 6. **GET /:id** - Get Single Tour with Reviews

```
GET /api/v1/tours/507f1f77bcf86cd799439011
```

**Purpose:** Get complete tour details including all reviews

**Authentication:** Not required (public)

**What it includes:**

- All tour fields (name, price, description, images, etc.)
- All reviews for this tour (auto-populated)
- Each review includes reviewer's name and photo

**How it works:**

- Uses factory function with population:
  ```javascript
  factory.getOne(Tour, { path: 'reviews' });
  ```
- This tells database to include full review data

**Response Example:**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The City Wanderer",
      "duration": 9,
      "maxGroupSize": 20,
      "difficulty": "easy",
      "price": 1197,
      "ratingAverage": 4.8,
      "ratingQuantity": 3,
      "reviews": [
        {
          "_id": "...",
          "review": "Amazing experience!",
          "rating": 5,
          "userId": {
            "_id": "...",
            "name": "John Doe",
            "photo": "/img/users/john.jpg"
          },
          "tourId": "507f1f77bcf86cd799439011",
          "createdAt": "2024-01-15T10:30:00Z"
        }
        // ... more reviews
      ]
    }
  }
}
```

---

### 7. **PATCH /:id** - Update Tour

```
PATCH /api/v1/tours/507f1f77bcf86cd799439011
Authorization: Bearer {token}
Content-Type: application/json

{
  "price": 1997,
  "summary": "Updated summary"
}
```

**Purpose:** Modify existing tour (admin/lead-guide only)

**Authentication:** Required (login needed)

**Authorization:** admin, lead-guide only

**What can be updated:**

- name, duration, maxGroupSize
- difficulty, price, priceDiscount
- summary, description
- imageCover, images
- startDates
- Anything except: ratingsAverage, ratingsQuantity (calculated from reviews)

**Response:**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The City Wanderer",
      "price": 1997,
      "summary": "Updated summary"
      // ... other fields
    }
  }
}
```

---

### 8. **DELETE /:id** - Delete Tour

```
DELETE /api/v1/tours/507f1f77bcf86cd799439011
Authorization: Bearer {token}
```

**Purpose:** Remove a tour (admin/lead-guide only)

**Authentication:** Required (login needed)

**Authorization:** admin, lead-guide only

**What happens:**

- Tour is permanently deleted from database
- All reviews for this tour remain (orphaned)
- Returns 204 No Content (no response body)

**Response:**

```
Status: 204 No Content
(no body returned)
```

---

### 9. **GET /tours-within/:distance/center/:latlng/unit/:unit** - Get Tours Within Radius

```
GET /api/v1/tours/tours-within/233/center/34.111745,-118.113491/unit/mi
```

**Purpose:** Find all tours within a specified distance from a geographic point (geospatial query)

**Authentication:** Not required (public)

**URL Parameters:**

- `:distance` - Radius distance (number)
- `:latlng` - Center latitude and longitude separated by comma (format: `lat,lng`)
- `:unit` - Distance unit: `mi` (miles) or `km` (kilometers)

**How it works:**

1. Accepts starting coordinates (latitude, longitude)
2. Calculates radius based on distance and unit:
   - Miles: distance ÷ 3963.2 (Earth radius in miles)
   - Kilometers: distance ÷ 6378.1 (Earth radius in km)
3. Uses MongoDB geospatial query `$geoWithin` and `$centerSphere`
4. Returns all tours with `startLocation` within the calculated radius
5. Requires `startLocation` to have a geospatial index in the database

**Example Requests:**

```
// Find tours within 233 miles of Los Angeles
GET /api/v1/tours/tours-within/233/center/34.111745,-118.113491/unit/mi

// Find tours within 500 km of a location
GET /api/v1/tours/tours-within/500/center/40.7128,-74.0060/unit/km
```

**Response Example:**

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "California Coastal Tour",
        "difficulty": "easy",
        "price": 1497,
        "startLocation": {
          "type": "Point",
          "coordinates": [-118.2437, 34.0522],
          "address": "Los Angeles, CA"
        }
      }
      // ... more tours
    ]
  }
}
```

**Error Handling:**

```json
{
  "status": "fail",
  "message": "Please provide latitude and longitude in the format lat,lng."
}
```

---

### 10. **GET /distances/:latlng/unit/:unit** - Calculate Distances to All Tours

```
GET /api/v1/tours/distances/34.111745,-118.113491/unit/mi
```

**Purpose:** Calculate distances from a reference point to all tours, sorted by distance

**Authentication:** Not required (public)

**URL Parameters:**

- `:latlng` - Reference point latitude and longitude (format: `lat,lng`)
- `:unit` - Distance unit: `mi` (miles) or `km` (kilometers)

**How it works:**

1. Accepts a reference location (latitude, longitude)
2. Uses MongoDB `$geoNear` aggregation stage
3. Calculates distance from reference point to each tour's `startLocation`
4. Returns all tours sorted by distance (closest first)
5. Results include:
   - Tour name
   - Distance from reference point (in specified unit)

**Example Requests:**

```
// Get distances from Los Angeles to all tours (in miles)
GET /api/v1/tours/distances/34.111745,-118.113491/unit/mi

// Get distances from New York to all tours (in kilometers)
GET /api/v1/tours/distances/40.7128,-74.0060/unit/km
```

**Multiplier used:**

- Miles: 0.000621371 (convert meters to miles)
- Kilometers: 0.001 (convert meters to km)

**Response Example:**

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "distance": 45.2,
        "name": "Nearby Hiking Adventure"
      },
      {
        "distance": 128.7,
        "name": "Mountain Summit Tour"
      },
      {
        "distance": 267.3,
        "name": "Desert Explorer"
      }
    ]
  }
}
```

**Error Handling:**

```json
{
  "status": "fail",
  "message": "Please provide latitude and longitude in the format lat,lng."
}
```

---

## Nested Routes Explained

### What Are Nested Routes?

Nested routes are endpoints that belong to a parent resource:

```
/api/v1/tours/123/reviews
└─────────────┬──────────┘
   Parent ID    Child Resource
```

**Real world example:**

```
/facebook.com/john-doe/posts
└──────────┬─────────┘─────┘
     User        Posts for that user
```

### How It Works

**Route Definition:**

```javascript
// In tourRoutes.js
router.use('/:tourId/reviews', reviewRouter);
```

**Request Flow:**

```
1. User requests: GET /api/v1/tours/123/reviews
2. tourRouter pattern matches: /:tourId/reviews
3. tourRouter sets: req.params.tourId = 123
4. tourRouter passes control to reviewRouter
5. reviewRouter processes with tourId available
```

**In Review Handler:**

```javascript
// reviewController.js
exports.createReview = async (req, res) => {
  // tourId comes from nested URL
  const tourId = req.params.tourId; // 123

  // Create review for that specific tour
  const review = await Review.create({
    review: req.body.review,
    rating: req.body.rating,
    tourId: tourId, // From URL
    userId: req.user.id // From logged-in user
  });

  res.status(201).json({
    status: 'success',
    data: { review }
  });
};
```

### Review Nested Routes

These are handled by reviewRouter when mounted under tours:

```
POST   /api/v1/tours/123/reviews         → Create review for tour 123
GET    /api/v1/tours/123/reviews         → Get all reviews for tour 123
GET    /api/v1/reviews                   → Get all reviews in system
POST   /api/v1/reviews                   → Create review (tourId in body)
```

---

## Using Routes in Your Code

### Import and Mount

```javascript
// In app.js
const tourRouter = require('./routes/tourRoutes');

// Mount at /api/v1/tours
app.use('/api/v1/tours', tourRouter);
```

### Making Requests from Code

```javascript
// From frontend (JavaScript)
const response = await fetch('/api/v1/tours');
const tours = await response.json();

// With filters
const response = await fetch('/api/v1/tours?difficulty=easy&price[lte]=1000');
```

### Using in Other Controllers

```javascript
// Import Tour model
const Tour = require('../models/tourModel');

// Get tour (useful to get data before operations)
const tour = await Tour.findById(tourId).populate('reviews');

// Check tour exists before creating review
if (!tour) {
  throw new Error('Tour not found');
}
```

---

## Reference for Developers

**When building features, reference this table:**

| Task          | Route                 | Method | Auth  | Example URL                       |
| ------------- | --------------------- | ------ | ----- | --------------------------------- |
| Browse tours  | `/`                   | GET    | No    | `/api/v1/tours`                   |
| Find deals    | `/top-5-cheap`        | GET    | No    | `/api/v1/tours/top-5-cheap`       |
| Stats         | `/tour-stats`         | GET    | No    | `/api/v1/tours/tour-stats`        |
| Schedule      | `/monthly-plan/:year` | GET    | Yes   | `/api/v1/tours/monthly-plan/2024` |
| View tour     | `/:id`                | GET    | No    | `/api/v1/tours/123`               |
| Create tour   | `/`                   | POST   | Yes\* | `POST /api/v1/tours`              |
| Update tour   | `/:id`                | PATCH  | Yes\* | `PATCH /api/v1/tours/123`         |
| Delete tour   | `/:id`                | DELETE | Yes\* | `DELETE /api/v1/tours/123`        |
| Get reviews   | `/:tourId/reviews`    | GET    | No    | `/api/v1/tours/123/reviews`       |
| Create review | `/:tourId/reviews`    | POST   | Yes   | `POST /api/v1/tours/123/reviews`  |

\*\*\*Admin or Lead-guide role required

---

## Common Patterns

### Using Factory Functions

Factory functions create reusable handlers:

```javascript
// tourController.js
exports.getAllTours = factory.getAll(Tour); // Get all tours
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour); // Create tour
exports.updateTour = factory.updateOne(Tour); // Update tour
exports.deleteTour = factory.deleteOne(Tour); // Delete tour
```

**Why?** Instead of writing the same code 5 times (for tours, users, reviews), write once, use everywhere.

### How Factory Works

```javascript
// getAll factory returns this middleware:
exports.getAllTours = (req, res, next) => {
  // Apply filters, sorting, pagination
  // Query database
  // Send response
};

// Which is called when route is matched:
router.get('/', getAllTours);
```

---

## Error Handling

All routes use global error handler. Common errors:

| Status | Meaning      | Example               |
| ------ | ------------ | --------------------- |
| 200    | Success      | GET returns data      |
| 201    | Created      | POST creates tour     |
| 400    | Bad request  | Invalid data          |
| 401    | Unauthorized | No login token        |
| 403    | Forbidden    | Wrong role            |
| 404    | Not found    | Tour ID doesn't exist |
| 500    | Server error | Database error        |

**Error Response:**

```json
{
  "status": "fail",
  "message": "No document found with that ID"
}
```

---

## 🧪 Testing Routes with Postman

Below are practical examples for testing each route in Postman.

### Setup

**Base URL:** `http://localhost:5000/api/v1`

**For Protected Routes:**

- Go to Authorization tab
- Select "Bearer Token"
- Paste your JWT token (get from login/signup)

---

### 1. GET Top 5 Cheap Tours

**Request:**

```
GET {{baseURL}}/tours/top-5-cheap
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "tours": [
      {
        "_id": "5c88fa8cf4afda39709c2955",
        "name": "The Sea Explorer",
        "price": 497,
        "ratingsAverage": 4.8,
        "summary": "Exploring the jaw-dropping US east coast by foot and by boat",
        "difficulty": "medium"
      }
    ]
  }
}
```

---

### 2. GET Tour Statistics

**Request:**

```
GET {{baseURL}}/tours/tour-stats
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "stats": [
      {
        "_id": "easy",
        "numTours": 5,
        "numRatings": 125,
        "avgRating": 4.7,
        "avgPrice": 1272,
        "minPrice": 397,
        "maxPrice": 2997
      },
      {
        "_id": "medium",
        "numTours": 6,
        "numRatings": 180,
        "avgRating": 4.8,
        "avgPrice": 1663,
        "minPrice": 497,
        "maxPrice": 2997
      }
    ]
  }
}
```

---

### 3. GET Monthly Plan

**Request:**

```
GET {{baseURL}}/tours/monthly-plan/2021
```

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Requirements:** Must be logged in as guide, lead-guide, or admin

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "plan": [
      {
        "month": 7,
        "numTourStarts": 3,
        "tours": ["The Forest Hiker", "The Sea Explorer"]
      },
      {
        "month": 9,
        "numTourStarts": 2,
        "tours": ["The Wine Taster"]
      }
    ]
  }
}
```

---

### 4. GET All Tours (with filtering)

**Basic Request:**

```
GET {{baseURL}}/tours
```

**With Filters:**

```
GET {{baseURL}}/tours?difficulty=easy&price[lt]=1000
```

**With Sorting:**

```
GET {{baseURL}}/tours?sort=-ratingsAverage,price
```

**With Field Limiting:**

```
GET {{baseURL}}/tours?fields=name,duration,price
```

**With Pagination:**

```
GET {{baseURL}}/tours?page=2&limit=10
```

**Combined Example:**

```
GET {{baseURL}}/tours?difficulty=easy&duration[gte]=5&sort=price&fields=name,price,duration&page=1&limit=5
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 9,
  "data": {
    "tours": [
      {
        "_id": "5c88fa8cf4afda39709c2955",
        "name": "The Sea Explorer",
        "duration": 7,
        "maxGroupSize": 15,
        "difficulty": "medium",
        "price": 497,
        "summary": "Exploring the jaw-dropping US east coast"
      }
    ]
  }
}
```

---

### 5. POST Create Tour

**Request:**

```
POST {{baseURL}}/tours
```

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Requirements:** Must be logged in as admin or lead-guide

**Body (JSON):**

```json
{
  "name": "Test Tour Amazing",
  "duration": 5,
  "maxGroupSize": 15,
  "difficulty": "easy",
  "price": 997,
  "summary": "Test tour summary",
  "description": "Test tour description that is longer and more detailed",
  "imageCover": "tour-1-cover.jpg",
  "startDates": ["2024-06-19T09:00:00.000Z", "2024-07-20T09:00:00.000Z"]
}
```

**Expected Response (201):**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "65a1f2b3c4d5e6f7g8h9i0j1",
      "name": "Test Tour Amazing",
      "duration": 5,
      "maxGroupSize": 15,
      "difficulty": "easy",
      "price": 997,
      "ratingsAverage": 4.5,
      "ratingsQuantity": 0,
      "slug": "test-tour-amazing"
    }
  }
}
```

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

---

### 6. GET Single Tour

**Request:**

```
GET {{baseURL}}/tours/5c88fa8cf4afda39709c2955
```

**Headers:** None required

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "5c88fa8cf4afda39709c2955",
      "name": "The Sea Explorer",
      "duration": 7,
      "maxGroupSize": 15,
      "difficulty": "medium",
      "price": 497,
      "summary": "Exploring the jaw-dropping US east coast by foot and by boat",
      "description": "Full description here...",
      "imageCover": "tour-2-cover.jpg",
      "images": ["tour-2-1.jpg", "tour-2-2.jpg", "tour-2-3.jpg"],
      "startDates": ["2021-06-19T09:00:00.000Z"],
      "reviews": [
        {
          "_id": "5c8a34ed14eb5c17645c9108",
          "review": "Great tour!",
          "rating": 5,
          "user": {
            "_id": "5c8a1d5b0190b214360dc057",
            "name": "Leo Gillespie"
          }
        }
      ]
    }
  }
}
```

**Common Error (404):**

```json
{
  "status": "fail",
  "message": "No tour found with that ID"
}
```

---

### 7. PATCH Update Tour

**Request:**

```
PATCH {{baseURL}}/tours/5c88fa8cf4afda39709c2955
```

**Headers:**

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Requirements:** Must be logged in as admin or lead-guide

**Body (JSON) - Update only what you want:**

```json
{
  "price": 597,
  "difficulty": "easy"
}
```

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "_id": "5c88fa8cf4afda39709c2955",
      "name": "The Sea Explorer",
      "duration": 7,
      "price": 597,
      "difficulty": "easy"
    }
  }
}
```

**Common Error (400):**

```json
{
  "status": "fail",
  "message": "Invalid input data. Price must be above 0"
}
```

---

### 8. DELETE Tour

**Request:**

```
DELETE {{baseURL}}/tours/5c88fa8cf4afda39709c2955
```

**Headers:**

```
Authorization: Bearer <your-jwt-token>
```

**Requirements:** Must be logged in as admin or lead-guide

**Body:** None

**Expected Response (204 No Content):**

```
(Empty response body)
```

**Common Error (404):**

```json
{
  "status": "fail",
  "message": "No tour found with that ID"
}
```

---

### 9. GET Tours Within Radius

**Request:**

```
GET {{baseURL}}/tours/tours-within/233/center/34.111745,-118.113491/unit/mi
```

**Headers:** None required

**URL Parameters:**

- Distance: 233
- Center: latitude=34.111745, longitude=-118.113491
- Unit: mi (or km)

**Expected Response (200):**

```json
{
  "status": "success",
  "results": 3,
  "data": {
    "data": [
      {
        "_id": "5c88fa8cf4afda39709c2955",
        "name": "California Coast Adventure",
        "difficulty": "medium",
        "price": 1497,
        "startLocation": {
          "type": "Point",
          "coordinates": [-118.2437, 34.0522],
          "address": "Los Angeles, California"
        }
      }
    ]
  }
}
```

**Common Error (400):**

```json
{
  "status": "fail",
  "message": "Please provide latitude and longitude in the format lat,lng."
}
```

**Other Examples:**

```
// Find tours within 500 km
GET {{baseURL}}/tours/tours-within/500/center/40.7128,-74.0060/unit/km

// Find tours within 100 miles
GET {{baseURL}}/tours/tours-within/100/center/51.5074,-0.1278/unit/mi
```

---

### 10. GET Distances to Tours

**Request:**

```
GET {{baseURL}}/tours/distances/34.111745,-118.113491/unit/mi
```

**Headers:** None required

**URL Parameters:**

- Reference point: latitude=34.111745, longitude=-118.113491
- Unit: mi (or km)

**Expected Response (200):**

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "distance": 25.3,
        "name": "Beach Paradise"
      },
      {
        "distance": 67.8,
        "name": "Mountain Explorer"
      },
      {
        "distance": 145.2,
        "name": "Desert Oasis"
      }
    ]
  }
}
```

**Note:** Results are sorted by distance (closest first), so you can easily find the nearest tours.

**Common Error (400):**

```json
{
  "status": "fail",
  "message": "Please provide latitude and longitude in the format lat,lng."
}
```

**Other Examples:**

```
// Get distances from New York (in kilometers)
GET {{baseURL}}/tours/distances/40.7128,-74.0060/unit/km

// Get distances from Paris (in miles)
GET {{baseURL}}/tours/distances/48.8566,2.3522/unit/mi
```

---

### Postman Collection Variables

Create these variables in Postman for easier testing:

**Environment Variables:**

```
baseURL: http://localhost:5000/api/v1
token: (will be set automatically after login)
```

**Collection Variables:**

```
tourId: 5c88fa8cf4afda39709c2955
```

---

### Postman Tips

1. **Save Token Automatically:** In login request Tests tab:

   ```javascript
   pm.environment.set('token', pm.response.json().token);
   ```

2. **Use Variables:**

   - `{{baseURL}}/tours`
   - `{{baseURL}}/tours/{{tourId}}`

3. **Test Scripts:** Add to Tests tab:

   ```javascript
   pm.test('Status code is 200', function() {
     pm.response.to.have.status(200);
   });

   pm.test('Response has tours array', function() {
     pm.expect(pm.response.json().data).to.have.property('tours');
   });
   ```

4. **Pre-request Scripts:** For dynamic data:
   ```javascript
   pm.environment.set('timestamp', Date.now());
   ```

---

## Summary

**Tour Routes:**

- Public routes: browse, stats, details
- Protected routes: create, update, delete (admin/lead-guide only)
- Nested routes: manage reviews under tours

**Key Concept:** Routes + Middleware + Controllers + Models work together:

```
Request → Route matched → Middleware (auth, role) → Controller → Model → Response
```

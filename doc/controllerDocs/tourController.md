# Tour Controller Documentation

## Overview

The `tourController.js` file contains all route handlers for managing tour data. It handles CRUD operations, advanced filtering, sorting, pagination, and aggregation operations on tours.

---

## Functions

### 1. `aliasTopTours(req, res, next)`

**Type:** Middleware

**Purpose:** Pre-processes query parameters for a "top tours" endpoint that returns the best-rated, cheapest tours.

**How it works:**

1. Sets predefined query parameters:
   - `limit: '5'` - Limits results to 5 tours
   - `sort: '-ratingAverage,price'` - Sorts by rating (descending) then price (ascending)
   - `fields: 'name,price,ratingAverage,summary,difficulty'` - Returns only essential fields
2. Calls `next()` to pass control to `getAllTours`

**Usage:**

```javascript
router.get('/top-5-cheap', aliasTopTours, getAllTours);
```

**Request:** `GET /api/v1/tours/top-5-cheap`

**Response:** 5 top-rated, cheapest tours with selected fields only

---

### 2. `getAllTours(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Retrieves all tours with advanced filtering, sorting, field limiting, and pagination.

**Query Parameters (Optional):**

```
?filter[key]=value&sort=field&fields=field1,field2&page=1&limit=10
```

**Response:**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    tours: [
      {
        _id, name, duration, maxGroupSize, difficulty,
        ratingsAverage, ratingsQuantity, price, ...
      }
    ]
  }
}
```

**How it works:**

1. **Query Building:** Creates MongoDB query using `APIFeatures` class
2. **Filtering:** Removes pagination/sorting fields and applies remaining filters
   - Example: `?duration[gte]=5&difficulty=easy`
   - Operators: `gte`, `gt`, `lte`, `lt` converted to MongoDB operators
3. **Sorting:** Applies sort order to results
   - Example: `?sort=-price,ratingAverage`
   - Default: `-createdAt` (newest first) if not specified
4. **Field Limiting:** Selects specific fields from documents
   - Example: `?fields=name,price,difficulty`
   - Default: Excludes `__v` field if not specified
5. **Pagination:** Implements page-based pagination
   - Example: `?page=2&limit=10` (skips 10 docs, returns 10)
   - Default: Page 1, limit 100
6. **Execution:** Executes final query and returns results with count

**Query Examples:**

```
?duration[gte]=5&difficulty=easy&sort=-price&page=1&limit=5
?fields=name,price,difficulty&limit=3
```

---

### 3. `createTour(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Creates a new tour document in the database.

**Request Body:**

```javascript
{
  name: String (required),
  duration: Number (required),
  maxGroupSize: Number (required),
  difficulty: String (required),
  ratingAverage: Number,
  ratingsQuantity: Number,
  price: Number (required),
  priceDiscount: Number,
  summary: String,
  description: String,
  imageCover: String,
  images: [String],
  startDates: [Date],
  secretTour: Boolean,
  ...
}
```

**Response (201 Created):**

```javascript
{
  success: 'success',
  data: {
    tour: {
      _id: ObjectId,
      name: String,
      price: Number,
      ...
    }
  }
}
```

**How it works:**

1. Creates a new tour document with the request body data
2. Validates data against Tour schema
3. Saves to database
4. Returns the created tour object with 201 status code

**Error Handling:**

- Schema validation errors → 400 Bad Request
- Duplicate field errors → 400 Bad Request

---

### 4. `getTour(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Retrieves a single tour by its ID.

**Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  data: {
    tour: {
      _id, name, duration, difficulty, price, ...
    }
  }
}
```

**How it works:**

1. Extracts tour ID from request parameters
2. Queries database for tour with matching ID
3. Returns tour if found, returns 404 error if not found

**Error Case:**

- Tour not found → 404 Not Found

**Request:** `GET /api/v1/tours/:id`

---

### 5. `updateTour(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Updates tour information and returns the updated document.

**Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Request Body:**

```javascript
{
  name: String (optional),
  price: Number (optional),
  difficulty: String (optional),
  // ... any other fields to update
}
```

**Response (200 OK):**

```javascript
{
  status: 'success',
  data: {
    tour: {
      _id, name, price, ...updated fields...
    }
  }
}
```

**How it works:**

1. Uses MongoDB `findByIdAndUpdate` with options:
   - `new: true` - Returns updated document instead of original
   - `runValidators: true` - Validates updated data against schema
2. Finds tour by ID and updates with request body
3. Returns updated tour if successful, 404 if not found

**Error Cases:**

- Tour not found → 404 Not Found
- Validation error on updated fields → 400 Bad Request

**Request:** `PATCH /api/v1/tours/:id`

---

### 6. `deleteTour(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Permanently deletes a tour from the database.

**Request Parameters:**

```javascript
{
  id: String (MongoDB ObjectId)
}
```

**Response (204 No Content):**

```javascript
{
  status: 'success',
  data: null
}
```

**How it works:**

1. Uses MongoDB `findByIdAndDelete` to find and remove tour
2. Returns 204 status code with no body if successful
3. Returns 404 if tour not found

**Error Case:**

- Tour not found → 404 Not Found

**Request:** `DELETE /api/v1/tours/:id`

**Important Note:** Returns 204 (No Content) as REST best practice for delete operations

---

### 7. `getTourStats(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Calculates and returns statistics for tours with ratings >= 4.5.

**How it works:**

1. **Aggregation Pipeline Stage 1 - Match:** Filters tours with `ratingsAverage >= 4.5`
2. **Aggregation Pipeline Stage 2 - Group:** Groups all matching tours together and calculates:
   - `numTours` - Count of tours
   - `numRating` - Sum of all ratings quantities
   - `avgRating` - Average rating across all tours
   - `avgPrice` - Average price
   - `minPrice` - Minimum price
   - `maxPrice` - Maximum price

**Response (200 OK):**

```javascript
{
  status: 'success',
  data: {
    stats: [
      {
        numTours: Number,
        numRating: Number,
        avgRating: Number,
        avgPrice: Number,
        minPrice: Number,
        maxPrice: Number
      }
    ]
  }
}
```

**Request:** `GET /api/v1/tours/stats`

**Example Response:**

```javascript
{
  status: 'success',
  data: {
    stats: [
      {
        numTours: 12,
        numRating: 543,
        avgRating: 4.7,
        avgPrice: 1250,
        minPrice: 399,
        maxPrice: 3299
      }
    ]
  }
}
```

**Use Case:** Dashboard metrics, analytics, pricing analysis

---

### 8. `getMonthlyPlan(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Generates a monthly tour schedule for a given year using aggregation.

**Request Parameters:**

```javascript
{
  year: String (e.g., '2023')
}
```

**How it works:**

1. **Unwind:** Breaks down `startDates` array into separate documents (one per date)
2. **Match:** Filters documents to dates within the specified year
3. **Group:** Groups by month and collects:
   - `numTourStarts` - Number of tours starting that month
   - `tours` - Array of tour names starting that month
4. **AddFields:** Adds a `month` field from the grouping ID
5. **Project:** Removes the `_id` field (showing results indexed by month number)
6. **Sort:** Sorts by number of tour starts (descending)
7. **Limit:** Returns only 12 months

**Response (200 OK):**

```javascript
{
  status: 'success',
  data: {
    plan: [
      {
        month: Number (1-12),
        numTourStarts: Number,
        tours: [String, String, ...]
      },
      ...
    ]
  }
}
```

**Example Response:**

```javascript
{
  status: 'success',
  data: {
    plan: [
      {
        month: 3,
        numTourStarts: 5,
        tours: ['The City Wanderer', 'Paris City Tour', 'Alps Adventure']
      },
      {
        month: 1,
        numTourStarts: 3,
        tours: ['Snowboarding in January', 'Winter wonderland']
      }
    ]
  }
}
```

**Request:** `GET /api/v1/tours/monthly-plan/:year`

**Example:** `GET /api/v1/tours/monthly-plan/2023`

**Use Case:** Planning tour operations, staff scheduling, resource allocation

---

### 7. `getToursWithin(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Find all tours within a specified distance from a geographic point using geospatial queries.

**Request Parameters:**

```javascript
{
  distance: Number (radius distance),
  latlng: String (format: 'lat,lng'),
  unit: String ('mi' for miles or 'km' for kilometers)
}
```

**URL Example:**

```
GET /api/v1/tours/tours-within/233/center/34.111745,-118.113491/unit/mi
```

**How it works:**

1. Extracts distance, coordinates, and unit from request parameters
2. Splits `latlng` into latitude and longitude
3. Calculates radius based on unit:
   - Miles: `distance / 3963.2` (Earth radius in miles)
   - Kilometers: `distance / 6378.1` (Earth radius in km)
4. Validates that lat/lng are provided
5. Uses MongoDB geospatial query with `$geoWithin` and `$centerSphere`
6. Returns all tours within the calculated radius

**Response (200 OK):**

```javascript
{
  status: 'success',
  results: Number,
  data: {
    data: [
      {
        _id: ObjectId,
        name: String,
        distance: Number, // (not in this response)
        startLocation: {
          type: 'Point',
          coordinates: [lng, lat],
          address: String
        }
      }
    ]
  }
}
```

**Error Handling:**

- Missing or invalid coordinates → 400 Bad Request
- Database errors → 500 Server Error

**Use Case:** Finding tours near user's location for search features

---

### 8. `getDistances(req, res, next)`

**Type:** Route Handler (Async)

**Purpose:** Calculate distances from a reference point to all tours, sorted by distance (closest first).

**Request Parameters:**

```javascript
{
  latlng: String (format: 'lat,lng'),
  unit: String ('mi' for miles or 'km' for kilometers)
}
```

**URL Example:**

```
GET /api/v1/tours/distances/34.111745,-118.113491/unit/mi
```

**How it works:**

1. Extracts coordinates and unit from request parameters
2. Splits `latlng` into latitude and longitude
3. Determines multiplier to convert MongoDB results (meters):
   - Miles: `0.000621371` (convert meters to miles)
   - Kilometers: `0.001` (convert meters to km)
4. Validates that lat/lng are provided
5. Uses MongoDB `$geoNear` aggregation stage:
   - Calculates distance from reference point to each tour's `startLocation`
   - Applies distance multiplier
   - Sorts by distance (closest first)
6. Projects only distance and name fields

**Response (200 OK):**

```javascript
{
  status: 'success',
  data: {
    data: [
      {
        distance: 45.2,     // In specified unit
        name: 'Nearby Tour'
      },
      {
        distance: 128.7,
        name: 'Mountain Tour'
      }
    ]
  }
}
```

**Error Handling:**

- Missing or invalid coordinates → 400 Bad Request
- Database errors → 500 Server Error

**Use Case:** Sorting tours by distance for location-based search results

---

## Key Dependencies

### Utilities

- **APIFeatures:** Custom class for building complex queries (filtering, sorting, pagination)
- **catchAsync:** Wrapper for handling async errors automatically
- **AppError:** Custom error class for operational errors

### Models

- **Tour:** Mongoose schema defining tour structure and validations

---

## Query Features

### Filtering Example

```
GET /api/v1/tours?difficulty=easy&price[lt]=1500
```

### Sorting Examples

```
GET /api/v1/tours?sort=-price,ratingAverage
GET /api/v1/tours?sort=price (ascending)
```

### Field Selection Example

```
GET /api/v1/tours?fields=name,price,difficulty
```

### Pagination Example

```
GET /api/v1/tours?page=2&limit=10
```

### Combined Example

```
GET /api/v1/tours?duration[gte]=5&price[lte]=2000&sort=-ratingAverage&fields=name,price,rating&page=1&limit=5
```

---

## Response Status Codes

| Code | Meaning              | Used By                                                                                      |
| ---- | -------------------- | -------------------------------------------------------------------------------------------- |
| 200  | Success              | getAllTours, getTour, updateTour, getTourStats, getMonthlyPlan, getToursWithin, getDistances |
| 201  | Created              | createTour                                                                                   |
| 204  | No Content (deleted) | deleteTour                                                                                   |
| 400  | Bad Request          | Validation errors, missing coordinates                                                       |
| 404  | Not Found            | getTour, updateTour, deleteTour                                                              |
| 500  | Server Error         | Database or processing errors                                                                |

---

## Performance Considerations

1. **Aggregation Pipeline:** Uses MongoDB aggregation for efficient statistical calculations
2. **Pagination:** Prevents large result sets by limiting returned documents
3. **Field Selection:** Reduces network payload by returning only needed fields
4. **Indexing:** Relies on indexes for fast filtering and sorting (should be defined in schema)

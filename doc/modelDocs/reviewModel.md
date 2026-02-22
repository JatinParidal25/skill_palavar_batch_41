# Review Model Documentation

## Overview

The `reviewModel.js` file defines the Review schema for user reviews of tours. It manages review content, ratings, and associations between users and tours. The model includes pre-save middleware for automatic user population and validation for review quality.

---

## Schema Definition

### Schema Fields

#### 1. `review` (String)

**Type:** String  
**Required:** Yes  
**Default:** None  
**Trim:** No  
**MaxLength:** None  
**MinLength:** None

**Description:**

- User's written review text for a tour
- The actual review content/comment
- Must be provided when creating a review
- Error message: "Review cannot be empty"

**Example:**

```javascript
review: 'This was an amazing tour! The guide was knowledgeable and the scenery was breathtaking.';
review: 'Good experience but a bit rushed.';
```

**Validation:**

- Required field (must not be empty)
- No length restrictions (future enhancement could add max length)
- String type enforcement

---

#### 2. `rating` (Number)

**Type:** Number  
**Required:** No  
**Default:** None  
**Min:** 1  
**Max:** 5

**Description:**

- Numerical rating score for the tour
- Scale from 1 (poor) to 5 (excellent)
- Used for calculating tour's average rating
- Optional field (review can be written without rating)

**Validation:**

- Must be between 1 and 5 (inclusive)
- Integer values (1, 2, 3, 4, 5)
- Error message: "Rating must be between 1 and 5" (implicit)

**Rating Scale Interpretation:**

- `1` - Poor experience
- `2` - Below average
- `3` - Average/OK
- `4` - Good experience
- `5` - Excellent/Highly recommended

**Example:**

```javascript
rating: 5; // Excellent
rating: 3; // Average
rating: 1; // Poor

// Invalid
rating: 0; // Too low
rating: 6; // Too high
rating: 3.5; // Not enforced but should be integer
```

---

#### 3. `createdAt` (Date)

**Type:** Date  
**Required:** No  
**Default:** Current date/time

**Description:**

- Timestamp of when the review was created
- Automatically set to current time on creation
- Used for sorting reviews chronologically (newest first)
- Allows tracking review publication order

**Example:**

```javascript
createdAt: 2024-01-25T10:30:00.000Z
createdAt: 2024-01-24T14:20:00.000Z
```

**Usage in Queries:**

```javascript
// Get newest reviews first
const reviews = await Review.find().sort('-createdAt');

// Get reviews from last 7 days
const recentReviews = await Review.find({
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
});
```

---

#### 4. `tourId` (ObjectId)

**Type:** mongoose.Schema.ObjectId  
**Required:** Yes  
**Default:** None  
**Ref:** 'Tour'

**Description:**

- Reference to the Tour document this review belongs to
- Establishes one-to-many relationship (one tour has many reviews)
- Used to associate review with specific tour
- Error message: "Review must belong to a tour"

**Important:**

- MongoDB ObjectId reference (not embedded)
- Must be valid tour ID that exists in database
- Allows queries like: `Review.find({ tourId: tourId })`
- Can be populated to get full tour details

**Example:**

```javascript
tourId: ObjectId('507f1f77bcf86cd799439001'); // Valid tour ID

// Query reviews for specific tour
const tourReviews = await Review.find({ tourId: '507f1f77bcf86cd799439001' });

// With population
const reviews = await Review.find().populate('tourId');
// Returns: { tourId: { _id, name, price, ... } }
```

---

#### 5. `userId` (ObjectId)

**Type:** mongoose.Schema.ObjectId  
**Required:** Yes  
**Default:** None  
**Ref:** 'User'

**Description:**

- Reference to the User document who created the review
- Links review to specific user
- Used to track review authorship
- Error message: "Review must belong to a user"

**Important:**

- MongoDB ObjectId reference (not embedded)
- Automatically populated by pre-find middleware
- Can be used for permission checks (user can edit own review)
- Populated with user's name and photo

**Example:**

```javascript
userId: ObjectId('507f1f77bcf86cd799439021'); // Valid user ID

// Query reviews by specific user
const userReviews = await Review.find({ userId: '507f1f77bcf86cd799439021' });

// With population (automatic in pre-find)
const reviews = await Review.find();
// Returns: { userId: { _id, name, photo } }
```

---

## Pre-Find Middleware

### Automatic User Population

```javascript
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'userId',
    select: 'name photo',
  });
  next();
});
```

**Purpose:** Automatically populate user details when finding reviews

**How it works:**

1. Runs before any query that starts with 'find' (find, findById, findOneAndUpdate, etc.)
2. Uses regular expression `/^find/` to match all find operations
3. Populates `userId` field with user document
4. Selects only `name` and `photo` fields from user (excludes password, email, etc.)
5. Attaches user info to each review automatically

**Effect:**

```javascript
// Before (without population)
{
  _id: ObjectId,
  review: "Great tour!",
  rating: 5,
  tourId: ObjectId,
  userId: ObjectId('507f1f77bcf86cd799439021')
}

// After (with population)
{
  _id: ObjectId,
  review: "Great tour!",
  rating: 5,
  tourId: ObjectId,
  userId: {
    _id: ObjectId('507f1f77bcf86cd799439021'),
    name: "John Doe",
    photo: "/img/users/user-1.jpg"
  }
}
```

**Benefits:**

- Automatic user info inclusion (cleaner API responses)
- Limited data exposure (only name and photo)
- Consistent behavior across all queries
- No need for manual population in controllers
- Improves API response quality (shows reviewer info)

**Performance Consideration:**

- Runs on EVERY find query (can impact performance with many reviews)
- Uses database lookup for each review (N+1 problem if many reviews)
- Future optimization: implement lean() or selective population

---

## Current Schema Configuration

```javascript
const reviewSchema = new mongoose.Schema({
  // fields defined above
});
```

**Default Mongoose Options:**

- No additional schema options specified
- Uses default toJSON/toObject behavior
- Virtual properties not enabled by default

---

## Data Validation

### Built-in Validators

| Field    | Validator | Error Message                  |
| -------- | --------- | ------------------------------ |
| `review` | required  | "Review cannot be empty"       |
| `rating` | min: 1    | Implicit: rating >= 1          |
| `rating` | max: 5    | Implicit: rating <= 5          |
| `tourId` | required  | "Review must belong to a tour" |
| `userId` | required  | "Review must belong to a user" |
| `tourId` | ref: Tour | ObjectId format validation     |
| `userId` | ref: User | ObjectId format validation     |

---

## Database Indexes

**Current:** No explicit indexes defined

**Recommended Indexes (for performance):**

| Field               | Type     | Reason                            |
| ------------------- | -------- | --------------------------------- |
| `tourId`            | Standard | Finding reviews for specific tour |
| `userId`            | Standard | Finding reviews by specific user  |
| `createdAt`         | Standard | Sorting reviews chronologically   |
| `tourId, createdAt` | Compound | Get newest reviews for tour       |

**Create Indexes:**

```javascript
reviewSchema.index({ tourId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ tourId: 1, createdAt: -1 }); // Compound index
```

---

## Common Query Patterns

### Get All Reviews

```javascript
const reviews = await Review.find();
// userId automatically populated with name and photo
```

### Get Reviews for Specific Tour

```javascript
const tourReviews = await Review.find({ tourId: tourId });
// Sorted by most recent (with index: { tourId: 1, createdAt: -1 })
```

### Get Reviews by Specific User

```javascript
const userReviews = await Review.find({ userId: userId });
```

### Get Highest Rated Reviews

```javascript
const topReviews = await Review.find().sort('-rating').limit(10);
```

### Get Recent Reviews

```javascript
const recentReviews = await Review.find().sort('-createdAt').limit(5);
```

### Get Reviews with Rating >= 4

```javascript
const goodReviews = await Review.find({ rating: { $gte: 4 } });
```

### Search Reviews

```javascript
// Reviews containing specific text
const results = await Review.find({
  review: { $regex: 'amazing|great', $options: 'i' },
});
```

---

## Aggregation Examples

### Calculate Tour Average Rating

```javascript
const stats = await Review.aggregate([
  {
    $match: { tourId: ObjectId(tourId) },
  },
  {
    $group: {
      _id: '$tourId',
      numRatings: { $sum: 1 },
      avgRating: { $avg: '$rating' },
      minRating: { $min: '$rating' },
      maxRating: { $max: '$rating' },
    },
  },
]);
```

### Reviews per Tour

```javascript
const reviewStats = await Review.aggregate([
  {
    $group: {
      _id: '$tourId',
      count: { $sum: 1 },
      avgRating: { $avg: '$rating' },
    },
  },
  {
    $sort: { count: -1 },
  },
]);
```

### Recent Reviews by User

```javascript
const userActivity = await Review.aggregate([
  {
    $match: { userId: ObjectId(userId) },
  },
  {
    $sort: { createdAt: -1 },
  },
  {
    $limit: 10,
  },
  {
    $lookup: {
      from: 'tours',
      localField: 'tourId',
      foreignField: '_id',
      as: 'tour',
    },
  },
]);
```

---

## Security Considerations

1. **Data Validation:**
   - Rating restricted to 1-5 scale
   - Review text required (prevents empty reviews)
   - Tour and user IDs validated as references

2. **User Association:**
   - userId required (ensures reviews attributed to users)
   - Set automatically from authenticated user (prevents spoofing)

3. **Reference Integrity:**
   - tourId must reference valid tour
   - userId must reference valid user
   - MongoDB enforces reference format (ObjectId)

4. **Privacy:**
   - Only user name and photo exposed (no email, password, etc.)
   - Other user fields excluded from population
   - Sensitive data protected

5. **Review Ownership:**
   - userId identifies review author
   - Can implement edit/delete restrictions (author only)
   - Admin override possible for moderation

---

## Relationships

### One-to-Many: Tour → Reviews

```
Tour (one)
  ↓
Review (many)

Query: Find all reviews for a tour
db.reviews.find({ tourId: <tourId> })

Reverse Population:
db.tours.find().populate('reviews')  // Not defined in schema
```

### One-to-Many: User → Reviews

```
User (one)
  ↓
Review (many)

Query: Find all reviews by a user
db.reviews.find({ userId: <userId> })

Reverse Population:
db.users.find().populate('reviews')  // Not defined in schema
```

### Automatic Population: userId → User Details

```
Review.userId (reference)
  ↓ (populated automatically)
User details (name, photo)
```

---

## Best Practices

### Creating Reviews

```javascript
const newReview = await Review.create({
  review: 'Great tour experience!',
  rating: 5,
  tourId: tourId,
  userId: userId, // Set from req.user.id in controller
});

// User automatically populated on query
```

### Retrieving Reviews

```javascript
// Get tour reviews (user auto-populated)
const reviews = await Review.find({ tourId });

// Get specific review
const review = await Review.findById(reviewId);
// Includes populated user data

// Get newest first
const recent = await Review.find().sort('-createdAt').limit(10);
```

### Updating Reviews

```javascript
const updated = await Review.findByIdAndUpdate(
  reviewId,
  { review: 'Updated review text', rating: 4 },
  { new: true, runValidators: true },
);
```

### Deleting Reviews

```javascript
await Review.findByIdAndDelete(reviewId);
```

---

## Current Limitations & Future Enhancements

### Current Limitations

1. **No User.review reference:** Reverse population from user to reviews not implemented
2. **No Tour.review reference:** Reverse population from tour to reviews not implemented
3. **No indexes:** Performance optimization could be improved
4. **Commented population:** Tour population commented out (lines 13-15)
5. **No compound indexes:** Could benefit from indexed queries
6. **No edit tracking:** No `updatedAt` field for tracking review edits
7. **No moderation fields:** No flags, deleted status, or moderation notes

### Potential Future Enhancements

1. **Add updatedAt field:**

```javascript
updatedAt: {
  type: Date,
  default: Date.now,
  select: false
}
```

2. **Add review moderation:**

```javascript
isModerated: { type: Boolean, default: false },
moderationNotes: String,
isDeleted: { type: Boolean, default: false }
```

3. **Add helpful counter:**

```javascript
helpfulCount: { type: Number, default: 0 }
```

4. **Add reverse populate:**

```javascript
// In Tour or User model
reviews: [
  {
    type: mongoose.Schema.ObjectId,
    ref: 'Review',
  },
];
```

5. **Enable Tour population (currently commented):**

```javascript
.populate({
  path: 'tourId',
  select: 'name'
})
```

6. **Add indexes for performance:**

```javascript
reviewSchema.index({ tourId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ tourId: 1, createdAt: -1 });
```

7. **Add validation for duplicate reviews:**

```javascript
// Prevent user from reviewing same tour twice
reviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });
```

---

## Integration Points

### Controllers Using Review Model

- **reviewController.js**
  - `getAllReviews()` - Query all reviews (auto-populates userId)
  - `createReview()` - Create new review with tourId and userId

### Routes Using Review Model

- **reviewRoutes.js**
  - `GET /api/v1/reviews` - Get all reviews
  - `GET /api/v1/tours/:tourId/reviews` - Get reviews for tour
  - `POST /api/v1/reviews` - Create review
  - `POST /api/v1/tours/:tourId/reviews` - Create review for specific tour

### Related Models

- **tourModel.js** - Tours can have many reviews
- **userModel.js** - Users can have many reviews

---

## Response Examples

### Single Review (populated)

```javascript
{
  _id: ObjectId('507f1f77bcf86cd799439050'),
  review: 'Absolutely fantastic tour! The guide was incredibly knowledgeable.',
  rating: 5,
  tourId: ObjectId('507f1f77bcf86cd799439001'),
  userId: {
    _id: ObjectId('507f1f77bcf86cd799439021'),
    name: 'John Doe',
    photo: '/img/users/user-507f1f77bcf86cd799439021.jpg'
  },
  createdAt: '2024-01-25T10:30:00.000Z',
  __v: 0
}
```

### Multiple Reviews

```javascript
[
  {
    _id: ObjectId('507f1f77bcf86cd799439050'),
    review: 'Great experience!',
    rating: 5,
    tourId: ObjectId('507f1f77bcf86cd799439001'),
    userId: {
      _id: ObjectId('507f1f77bcf86cd799439021'),
      name: 'John Doe',
      photo: '/img/users/user-507f1f77bcf86cd799439021.jpg',
    },
    createdAt: '2024-01-25T10:30:00.000Z',
  },
  {
    _id: ObjectId('507f1f77bcf86cd799439051'),
    review: 'Good but could be better',
    rating: 3,
    tourId: ObjectId('507f1f77bcf86cd799439001'),
    userId: {
      _id: ObjectId('507f1f77bcf86cd799439022'),
      name: 'Jane Smith',
      photo: '/img/users/user-507f1f77bcf86cd799439022.jpg',
    },
    createdAt: '2024-01-24T14:20:00.000Z',
  },
];
```

---

## External Dependencies

- **mongoose:** ODM for MongoDB
  - Schema definition
  - Model methods
  - Query helpers
  - Population/references
  - Middleware hooks

---

## Notes

- Reviews are core user-generated content for the platform
- Automatic user population improves API response quality
- Rating system (1-5) allows tour quality assessment
- User association enables review management and permissions
- Nested routing in reviewRoutes supports intuitive API design
- Future enhancements should focus on performance (indexes) and moderation

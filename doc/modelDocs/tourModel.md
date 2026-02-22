# Tour Model Documentation

## Overview

**File:** `models/tourModel.js`

**Purpose:** Define tour data structure and validation

**Database Collection:** `tours`

---

## What Is This Model?

A model defines:

- What fields a tour has
- What data types they are
- Which fields are required
- Validation rules
- Methods to process tours
- Virtual properties (calculated fields)

---

## Tour Schema Fields

### Basic Information

#### `name` - Tour Name

```javascript
type: String,
required: [true, 'A tour must have a name'],
unique: true,
trim: true,
minlength: [10, 'Name must be 10+ characters'],
maxlength: [40, 'Name must be 40 or less characters']
```

**Example:** "The City Wanderer"

**Validation:**

- Required: Can't create tour without name
- Unique: No two tours can have same name
- Length: 10-40 characters
- Trim: Removes spaces from start/end

---

#### `slug` - URL-Friendly Name

```javascript
type: String;
```

**Example:** "the-city-wanderer"

**Purpose:** Used in URLs like `/tours/the-city-wanderer`

**Auto-generated:** Created from name with spaces replaced by hyphens

---

### Tour Details

#### `duration` - Number of Days

```javascript
type: Number,
required: [true, 'A tour must have a duration']
```

**Example:** 9

**Represents:** How many days the tour lasts

---

#### `maxGroupSize` - Maximum Participants

```javascript
type: Number,
required: [true, 'A tour must have max group size']
```

**Example:** 25

**Represents:** Maximum number of people in one tour group

---

#### `difficulty` - Difficulty Level

```javascript
type: String,
required: [true, 'A tour must have a difficulty'],
enum: ['easy', 'medium', 'difficult']
```

**Valid values:** easy, medium, or difficult

**Example:** "easy"

**Validation:** Only accepts these 3 values - other values rejected

---

### Pricing

#### `price` - Tour Price

```javascript
type: Number,
required: [true, 'A tour must have a price']
```

**Example:** 1197

**Represents:** Price in currency units

---

#### `priceDiscount` - Discount Price

```javascript
type: Number,
validate: {
  validator: function(val) {
    return val < this.price;  // Discount must be less than price
  },
  message: 'Discount price must be less than regular price'
}
```

**Example:** 997

**Represents:** Discounted price (if on sale)

**Validation:** Must be less than regular price

- If price = 1197 and priceDiscount = 997 ✅ Valid
- If price = 1197 and priceDiscount = 1500 ❌ Invalid

---

### Descriptions

#### `summary` - Short Description

```javascript
type: String,
trim: true,
required: [true, 'A tour must have a summary']
```

**Example:** "Breathtaking mountain tour with stunning views"

**Purpose:** Quick description shown in listings

---

#### `description` - Detailed Description

```javascript
type: String,
trim: true
```

**Example:** "Detailed paragraph explaining the tour experience..."

**Purpose:** Full description shown on tour detail page

---

### Images

#### `imageCover` - Main Tour Image

```javascript
type: String,
required: [true, 'A tour must have a cover image']
```

**Example:** "/img/tours/tour-1-cover.jpg"

**Purpose:** Featured image shown in listings

---

#### `images` - Gallery Images

```javascript
type: [String];
```

**Example:** `["/img/tours/tour-1-1.jpg", "/img/tours/tour-1-2.jpg"]`

**Purpose:** Additional photos shown on detail page

---

### Ratings & Reviews

#### `ratingsAverage` - Average Rating

```javascript
type: Number,
default: 4.5,
min: [1, 'Rating must be 1 or higher'],
max: [5, 'Rating must be 5 or lower']
```

**Example:** 4.8

**Range:** 1.0 to 5.0

**Default:** 4.5 (new tours start with 4.5)

**Auto-updated:** When reviews are created/updated/deleted (via hooks)

---

#### `ratingsQuantity` - Number of Ratings

```javascript
type: Number,
default: 0
```

**Example:** 23

**Represents:** How many reviews this tour has

**Auto-updated:** Whenever a review is added/removed

---

### Dates

#### `createdAt` - Creation Timestamp

```javascript
type: Date,
default: Date.now,
select: false  // Hidden by default in queries
```

**Example:** "2024-01-15T10:30:00.000Z"

**Purpose:** When the tour was created

**Hidden:** Not returned in responses (select: false) unless specifically requested

---

#### `startDates` - Available Start Dates

```javascript
type: [Date];
```

**Example:** `["2024-06-01", "2024-07-15", "2024-08-20"]`

**Purpose:** Dates when this tour is available

---

### Special Fields

#### `secretTour` - Hidden from Listing

```javascript
type: Boolean,
default: false
```

**Example:** true (tour is hidden)

**Purpose:** Some tours might be hidden from public listing

**Use Case:** Private tours, VIP tours not shown by default

---

## Virtual Properties (Calculated Fields)

### `durationWeeks` - Duration in Weeks

```javascript
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
```

**What it does:**

- Calculates weeks from days
- NOT stored in database
- Computed when tour is queried

**Example:**

```javascript
const tour = await Tour.findById(tourId);
console.log(tour.duration); // 14 (days)
console.log(tour.durationWeeks); // 2 (calculated)
```

**Why virtual?** Saves database space (don't store calculated value)

---

## Middleware (Automatic Processing)

### Pre-save Middleware

```javascript
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
```

**When:** Before saving a new/updated tour

**What:** Automatically creates slug from name

- Input: "The City Wanderer"
- Output slug: "the-city-wanderer"

**Benefit:** No need to manually create slug - it's automatic

---

## How Rating Updates Work

### The System

Tours have average ratings that **automatically update** when reviews change.

```
Create Review
    ↓
Review Model Hook Triggered
    ↓
Calculate Tour's Average Rating
    ↓
Update Tour.ratingsAverage & ratingsQuantity
    ↓
Done (all automatic!)
```

### Example Flow

**Step 1: Create Review**

```javascript
await Review.create({
  review: 'Amazing tour!',
  rating: 5,
  tourId: tourId,
  userId: userId,
});
```

**Step 2: Review Model Hook Triggers**

```javascript
// In reviewModel.js
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tourId);
});
```

**Step 3: Calculate Average**

```javascript
// reviewModel.calcAverageRatings does:
Review.aggregate([
  { $match: { tourId: this.tourId } },
  {
    $group: {
      _id: '$tourId',
      nRating: { $sum: 1 },
      avgRating: { $avg: '$rating' },
    },
  },
]);
```

**Step 4: Update Tour**

```javascript
await Tour.findByIdAndUpdate(tourId, {
  ratingsQuantity: nRating, // 1, 2, 3...
  ratingsAverage: avgRating, // 4.8, 4.5, 4.2...
});
```

### Result

Tour automatically shows:

```javascript
{
  _id: tourId,
  name: 'The City Wanderer',
  ratingsAverage: 4.8,     // Auto-updated!
  ratingsQuantity: 3       // Auto-updated!
}
```

### What Happens on Update/Delete

Same process happens when reviews are updated or deleted:

```javascript
// User edits review: rating 5 → 4
Review.findByIdAndUpdate(...)
  ↓
Hook triggers
  ↓
Tour ratings recalculated
```

```javascript
// User deletes review
Review.findByIdAndDelete(...)
  ↓
Hook triggers
  ↓
Tour ratings recalculated
```

---

## Relationships

### Tour → Reviews (One-to-Many)

```
One Tour can have Many Reviews
  Tour (1) ───── (Many) Reviews
```

**In Schema:**

```javascript
// Reviews reference tour
reviewSchema.add({
  tourId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Review', // Refers to Review model
    required: true,
  },
});
```

**In Queries:**

```javascript
// Get tour with all its reviews
const tour = await Tour.findById(tourId).populate('reviews');

// Response includes:
{
  _id: tourId,
  name: 'City Tour',
  reviews: [
    { _id, review: 'Great!', rating: 5 },
    { _id, review: 'Good', rating: 4 }
  ]
}
```

---

## Using Tour Model in Controllers

### Creating Tours

```javascript
// tourController.js uses factory
exports.createTour = factory.createOne(Tour);

// When route called: POST /api/v1/tours
// Factory creates tour from request body
// Slug auto-generated
// Returns new tour
```

### Getting Tours

```javascript
// Get all with filters
exports.getAllTours = factory.getAll(Tour);

// Get single with reviews
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
```

### Updating Tours

```javascript
// Update price, name, etc.
exports.updateTour = factory.updateOne(Tour);

// Validates priceDiscount < price
// Updates ratingsAverage NOT allowed (calculated)
```

---

## Field Reference for Developers

**When building features, use this table:**

| Field           | Type     | Required | Purpose               | Auto-Updated       |
| --------------- | -------- | -------- | --------------------- | ------------------ |
| name            | String   | Yes      | Tour name             | No                 |
| slug            | String   | No       | URL name              | Yes (from name)    |
| duration        | Number   | Yes      | Days                  | No                 |
| maxGroupSize    | Number   | Yes      | Max people            | No                 |
| difficulty      | String   | Yes      | easy/medium/difficult | No                 |
| price           | Number   | Yes      | Tour cost             | No                 |
| priceDiscount   | Number   | No       | Discount price        | No                 |
| summary         | String   | Yes      | Short description     | No                 |
| description     | String   | No       | Long description      | No                 |
| imageCover      | String   | Yes      | Main image            | No                 |
| images          | [String] | No       | Gallery images        | No                 |
| ratingsAverage  | Number   | No       | Avg rating 1-5        | Yes (from reviews) |
| ratingsQuantity | Number   | No       | # of ratings          | Yes (from reviews) |
| createdAt       | Date     | No       | Creation time         | Yes (auto)         |
| startDates      | [Date]   | No       | Available dates       | No                 |
| secretTour      | Boolean  | No       | Hidden from list      | No                 |

---

## Common Issues & Solutions

### Issue: ratingsAverage Not Updating

**Problem:** Created review but tour rating didn't change

**Solution:**

- Check review model hooks are configured
- Verify review was actually created (check database)
- Restart server (code changes)

### Issue: Tour Name Not Unique

**Problem:** Can't create two tours with same name

**Solution:**

- This is intentional - unique: true prevents duplicates
- Use different name

### Issue: Slug Not Generated

**Problem:** Tour created but slug is empty

**Solution:**

- Pre-save hook generates it automatically
- Check if slugify is installed
- Make sure hook runs before save

---

## Validation Examples

### Valid Tour Creation

```javascript
{
  name: 'The City Wanderer',        // ✅ 16 chars, unique
  duration: 9,                      // ✅ Required
  maxGroupSize: 25,                 // ✅ Required
  difficulty: 'easy',               // ✅ Valid enum
  price: 1197,                      // ✅ Required
  priceDiscount: 997,               // ✅ < price
  summary: 'Breathtaking city tour' // ✅ Required
  imageCover: '/img/tours/tour-1-cover.jpg', // ✅ Required
  startDates: ['2024-06-01', '2024-07-15']
}
```

### Invalid Tour Creation

```javascript
{
  name: 'Tour',                     // ❌ Too short (< 10)
  duration: 9,
  maxGroupSize: 25,
  difficulty: 'extreme',            // ❌ Not in enum
  price: 1197,
  priceDiscount: 1500,              // ❌ >= price
  // summary: missing!              // ❌ Required
}
```

---

## Summary

**Tour Model:**

- Defines tour data structure with 15+ fields
- Auto-generates slug from name
- Auto-calculates and updates average rating
- Validates prices, difficulty, lengths
- Has one-to-many relationship with reviews
- Used by factory functions for CRUD operations

**Key Concept:** When review is created/updated/deleted, tour's ratingsAverage and ratingsQuantity automatically update (no manual intervention needed).

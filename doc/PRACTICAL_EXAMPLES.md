# Practical Examples - How Things Work Together

This guide shows real-world examples of how different parts of the application work together.

---

## Example 1: User Signs Up

### The Request

```
POST /api/v1/users/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

### Flow Through the System

#### 1. **app.js** - Routes Incoming Request

```javascript
// In app.js, routes are mounted:
app.use('/api/v1/users', userRouter);

// Request matches this and goes to userRouter
```

#### 2. **userRoutes.js** - Match the Route

```javascript
// In userRoutes.js:
router.post('/signup', signup);

// Route matches POST /signup
// Handler: signup (from authController)
```

#### 3. **authController.js** - signup Function

```javascript
exports.signup = catchAsync(async (req, res, next) => {
  // 1. Create user from request body
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 2. Create JWT token
  const token = createSendToken(newUser, 201, req, res);
});
```

#### 4. **userModel.js** - Pre-save Middleware Runs

```javascript
// When User.create() is called, pre-save middleware triggers:

// First middleware: Hash password
pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash the password
  this.password = await bcrypt.hash(this.password, 10);

  // Delete passwordConfirm (not stored in DB)
  this.passwordConfirm = undefined;

  next();
});

// Second middleware: Set passwordChangedAt
pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // New users don't get passwordChangedAt set
  this.passwordChangedAt = Date.now() - 1000;

  next();
});
```

#### 5. **Database** - Data Stored

```javascript
// Saved to MongoDB:
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  password: "$2b$10$abcdef...",  // Hashed!
  photo: "/img/users/default.jpg",  // Default
  role: "user",  // Default
  active: true  // Default
  // passwordConfirm: NOT stored
  // passwordChangedAt: NOT set (new user)
}
```

#### 6. **authController.js** - Create Token

```javascript
// createSendToken() function creates JWT:
const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  expiresIn: '90d',
});
// Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 7. **Response Sent to User**

```javascript
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

### Key Takeaways:

- ✅ Password auto-hashed before storage
- ✅ passwordConfirm only for validation, not stored
- ✅ User auto-given default role "user"
- ✅ Token auto-created and sent
- ✅ No password sent back to frontend

---

## Example 2: User Logs In

### The Request

```
POST /api/v1/users/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Flow

#### 1. **userRoutes.js** - Route Match

```javascript
router.post('/login', login); // Route matches
```

#### 2. **authController.js** - login Function

```javascript
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check email exists
  const user = await User.findOne({ email }).select('+password'); // Include password (normally hidden)

  if (!user) {
    throw new AppError('Incorrect email or password', 401);
  }

  // 2. Check password is correct
  const correct = await user.correctPassword(password, user.password);
  // correctPassword uses bcrypt.compare()
  // Compares: plain text password with stored hash

  if (!correct) {
    throw new AppError('Incorrect email or password', 401);
  }

  // 3. Create token and send
  createSendToken(user, 200, req, res);
});
```

#### 3. **userModel.js** - correctPassword Method

```javascript
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // Compare plain text with bcrypt hash
  return await bcrypt.compare(candidatePassword, userPassword);
  // Returns: true or false
};
```

#### 4. **Response**

```javascript
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Key Takeaways:

- ✅ Password NEVER seen in plain text
- ✅ bcrypt.compare() safely compares
- ✅ Token sent for future requests

---

## Example 3: User Creates a Review (with Tour Rating Update)

### The Request

```
POST /api/v1/tours/507f1f77bcf86cd799439011/reviews
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "review": "Amazing tour!",
  "rating": 5
}
```

### Flow

#### 1. **app.js** - Route Mounting

```javascript
// In app.js:
app.use('/api/v1/tours', tourRouter);

// Request goes to tourRouter
```

#### 2. **tourRoutes.js** - Nested Route

```javascript
// In tourRoutes.js:
router.use('/:tourId/reviews', reviewRouter);

// Pattern matches: /507f1f77bcf86cd799439011/reviews
// Sets: req.params.tourId = "507f1f77bcf86cd799439011"
// Passes control to reviewRouter
```

#### 3. **reviewRoutes.js** - Route Match

```javascript
router.post('/', protect, restrictTo('user'), createReview);

// protect middleware runs first
```

#### 4. **authController.js** - protect Middleware

```javascript
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token from header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Verify token signature
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Get user from database
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    throw new AppError('User no longer exists', 401);
  }

  // 4. Check if password changed after token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError('Password recently changed! Please login again', 401);
  }

  // 5. Set user on request
  req.user = currentUser;
  next();
});
```

#### 5. **authController.js** - restrictTo Middleware

```javascript
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        'You do not have permission to perform this action',
        403,
      );
    }
    next();
  };
};

// restrictTo('user') checks: req.user.role === 'user'
// Only users can post reviews (not admin, guide, etc.)
```

#### 6. **reviewController.js** - createReview Handler

```javascript
exports.createReview = factory.createOne(Review);

// Factory creates review from req.body:
// Plus auto-includes:
// - tourId from req.params.tourId
// - userId from req.user._id
```

#### 7. **handlerFactory.js** - createOne Factory

```javascript
const createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};
```

#### 8. **reviewModel.js** - Pre-hooks Run

```javascript
// Pre-find middleware (on read, not on create)
pre(/^find/, function (next) {
  this.populate({
    path: 'userId',
    select: 'name photo',
  });
  next();
});
```

#### 9. **reviewModel.js** - Post-save Hook Runs!

```javascript
reviewSchema.post('save', function() {
  // THIS IS THE MAGIC! Review saved, now trigger rating update

  this.constructor.calcAverageRatings(this.tourId);
  // Calls static method on Review model
});

// calcAverageRatings does:
static async calcAverageRatings(tourId) {
  const stats = await this.aggregate([
    { $match: { tourId: tourId } },
    {
      $group: {
        _id: '$tourId',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  // Update tour with new ratings
  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating
  });
}
```

#### 10. **tourModel.js** - Tour Updated

```javascript
// Tour in database updated to:
{
  _id: "507f1f77bcf86cd799439011",
  name: "The City Wanderer",
  ratingsAverage: 4.8,  // Auto-updated!
  ratingsQuantity: 3    // Auto-updated!
  // ... other fields
}
```

#### 11. **Response to User**

```javascript
{
  "status": "success",
  "data": {
    "data": {
      "_id": "507f1f77bcf86cd799439012",
      "review": "Amazing tour!",
      "rating": 5,
      "tourId": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "John Doe",
        "photo": "/img/users/john.jpg"
      },
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

### Key Takeaways:

- ✅ Nested routing passes tourId to review handler
- ✅ protect middleware verifies authentication
- ✅ restrictTo middleware checks user role
- ✅ Factory function creates review
- ✅ Post-save hook auto-updates tour rating
- ✅ Everything happens automatically - no manual updates!

---

## Example 4: Admin Updates Tour Price

### The Request

```
PATCH /api/v1/tours/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "price": 1997,
  "priceDiscount": 1497
}
```

### Flow

#### 1. **tourRoutes.js** - Route Match

```javascript
router.patch('/:id', protect, restrictTo('admin', 'lead-guide'), updateTour);
```

#### 2. **authController.js** - Middlewares

```javascript
// protect: Same as before - verify token
// restrictTo('admin', 'lead-guide'): Check role
```

#### 3. **tourController.js** - Handler

```javascript
exports.updateTour = factory.updateOne(Tour);
```

#### 4. **handlerFactory.js** - updateOne

```javascript
const updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, // Re-validate on update!
    });

    if (!doc) {
      return next(new AppError('No document found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};
```

#### 5. **tourModel.js** - Validation

```javascript
// Price discount validator runs:
priceDiscount: {
  type: Number,
  validate: {
    validator: function(val) {
      return val < this.price;  // Must be less than price
    },
    message: 'Discount must be less than regular price'
  }
}

// In this case:
// price: 1997
// priceDiscount: 1497
// 1497 < 1997 ✅ VALID!
```

#### 6. **Response**

```javascript
{
  "status": "success",
  "data": {
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The City Wanderer",
      "price": 1997,
      "priceDiscount": 1497,
      // ... other fields
    }
  }
}
```

### Key Takeaways:

- ✅ Factory function handles update logic
- ✅ runValidators: true re-validates data
- ✅ Price discount validation runs
- ✅ Only admin/lead-guide can update

---

## Example 5: User Updates Own Profile (Field Filtering)

### The Request

```
PATCH /api/v1/users/updateMe
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "role": "admin"  // HACK: User tries to become admin!
}
```

### Flow

#### 1. **userRoutes.js** - Route Match

```javascript
router.patch('/updateMe', updateMe);
// protect middleware already applied globally before this
```

#### 2. **userController.js** - updateMe Handler

```javascript
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Create error if user tries to change password
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password update', 400));
  }

  // 2. FILTER OUT UNWANTED FIELDS!
  // This is security-critical - prevents user from becoming admin
  const allowedFields = ['name', 'email'];
  const filteredBody = {};

  Object.keys(req.body).forEach((el) => {
    if (allowedFields.includes(el)) {
      filteredBody[el] = req.body[el];
    }
  });

  // filteredBody now contains ONLY: name, email
  // role field is removed!

  // 3. Update user with filtered body
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
```

#### 3. **What Actually Gets Sent**

```javascript
// User sent:
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "role": "admin"  // ← Trying to hack!
}

// Filtered to:
{
  "name": "John Smith",
  "email": "john.smith@example.com"
  // role removed!
}

// Sent to database
```

#### 4. **Response**

```javascript
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439010",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "role": "user"  // Still user! Not admin!
      // ... other fields
    }
  }
}
```

### Key Takeaways:

- ✅ User CANNOT update role
- ✅ User CANNOT update password (separate endpoint)
- ✅ Field filtering prevents hacks
- ✅ Only allowed fields updated

---

## Example 6: User Deactivates Account (Soft Delete)

### The Request

```
DELETE /api/v1/users/deleteMe
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Flow

#### 1. **userRoutes.js** - Route Match

```javascript
router.delete('/deleteMe', deleteMe);
```

#### 2. **userController.js** - deleteMe Handler

```javascript
exports.deleteMe = catchAsync(async (req, res, next) => {
  // NOT actually deleting - just deactivating!
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
```

#### 3. **Database - Active Changed**

```javascript
// Before:
{
  _id: "507f1f77bcf86cd799439010",
  name: "John Smith",
  active: true,  // ← Was true
  // ... other fields
}

// After:
{
  _id: "507f1f77bcf86cd799439010",
  name: "John Smith",
  active: false,  // ← Now false
  // ... other fields are unchanged!
}
```

#### 4. **userModel.js** - Pre-find Middleware

```javascript
// ALL future queries automatically exclude this user:
pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  // Excludes users where active: false
  next();
});

// Example:
const users = await User.find();
// Automatically becomes:
const users = await User.find({ active: { $ne: false } });
// John's account NOT included
```

#### 5. **What User Sees**

```javascript
// Account appears deleted to:
const users = await User.find(); // John not here
const user = await User.findById(johnId); // Not found

// But admin can still see if they override:
const allUsers = await User.find({}).select('+active');
// John appears with active: false
```

### Key Takeaways:

- ✅ Soft delete: data preserved in database
- ✅ Active: false marks deactivated
- ✅ Pre-find middleware auto-filters
- ✅ Can be reactivated if needed
- ✅ Accounts appear deleted but aren't actually deleted

---

## Key Patterns Summary

### Pattern 1: Factory Functions Eliminate Code Duplication

```javascript
// Instead of writing for every model:
exports.deleteOne = (Model) => {
  return async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw error;
    res.status(204).json(null);
  };
};

// Use once:
exports.deleteTour = factory.deleteOne(Tour);
exports.deleteUser = factory.deleteOne(User);
exports.deleteReview = factory.deleteOne(Review);
```

### Pattern 2: Middleware Chain for Security

```javascript
// Each middleware ensures something, passes to next
router.post(
  '/',
  protect, // Middleware 1: Verify token
  restrictTo('admin'), // Middleware 2: Check role
  createTour, // Handler: Do the action
);
```

### Pattern 3: Auto-Updates via Hooks

```javascript
// When review saved:
// → Post-save hook triggers
// → Calculates tour ratings
// → Updates tour automatically
// → No manual code needed!
```

### Pattern 4: Soft Deletion

```javascript
// Instead of deleting:
await User.delete(); // ❌ Data lost forever

// Use soft delete:
await User.update({ active: false }); // ✅ Data preserved
// Pre-find automatically hides: { active: { $ne: false } }
```

### Pattern 5: Field Filtering for Security

```javascript
// Allow only specific fields:
const allowedFields = ['name', 'email'];
const filtered = Object.keys(req.body)
  .filter((el) => allowedFields.includes(el))
  .reduce((obj, el) => {
    obj[el] = req.body[el];
    return obj;
  }, {});
// User cannot update role, password, etc.
```

---

## How to Debug Issues

### Issue: "No document found with that ID"

```
Check:
1. Is ID valid MongoDB ObjectId?
2. Does document exist in database?
3. Is active: false? (Pre-find middleware hides it)
4. Check error handling in relevant controller
```

### Issue: "You do not have permission"

```
Check:
1. Is user authenticated? (Check protect middleware)
2. Does user have correct role? (Check restrictTo middleware)
3. What role does user have in database?
4. What roles are required for this route?
```

### Issue: Rating not updating

```
Check:
1. Is review created? (Check database)
2. Does reviewModel have post('save') hook?
3. Is calcAverageRatings static method defined?
4. Does Tour model exist?
5. Try restarting server
```

### Issue: Can't update profile

```
Check:
1. Is field in allowedFields array?
2. Are you sending correct field name?
3. Is user authenticated?
4. Check field validation rules
```

### Issue: User can't login

```
Check:
1. Does user exist? (Check email in database)
2. Is active: true?
3. Is password correct? (Use bcrypt to verify)
4. Is JWT secret correct?
```

---

## Conclusion

The Natour's application uses these powerful patterns:

1. **Factory Functions** - Reusable CRUD handlers
2. **Middleware Chain** - Layered security and processing
3. **Model Hooks** - Automatic data consistency
4. **Soft Delete** - Data preservation
5. **Field Filtering** - Security from user hacks
6. **Nested Routes** - Hierarchical resource structure

Understanding these examples helps you:

- Build features faster (reuse patterns)
- Debug issues more efficiently
- Maintain consistent architecture
- Ensure data security

When adding new features, follow these patterns!

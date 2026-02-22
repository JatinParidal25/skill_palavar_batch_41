# 🎯 MASTER GUIDE - Start Here When Returning to Project

## Quick Orientation

**Last Updated:** January 2026  
**Project:** Natour's - Tour Booking API  
**Tech Stack:** Node.js, Express, MongoDB, Mongoose

---

## 🚀 Immediate Quick Start

### Just Want to Run the Project?

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy and edit config.env)
DATABASE=mongodb+srv://...
DATABASE_PASSWORD=...
JWT_SECRET=...
# See SETUP_AND_MIDDLEWARE.md for full list

# 3. Import sample data (optional)
node dev-data/data/import-dev-data.js --import

# 4. Start server
npm start

# Server runs on http://localhost:5000
```

---

## 📚 Documentation Navigation (19 Files!)

### ⭐ Start Here (Returning After Months)

1. **This file** - Quick orientation
2. **[README.md](README.md)** - Documentation overview
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - How everything connects
4. **[PRACTICAL_EXAMPLES.md](PRACTICAL_EXAMPLES.md)** - See real request flows

### 🔍 Quick Lookups

- **[QUICK_START.md](QUICK_START.md)** - "I want to..." index

### 🎓 Technical Deep Dives (New!)

- **[TECHNICAL_CONCEPTS.md](TECHNICAL_CONCEPTS.md)** - Middleware, JWT, Mongoose, Security, Patterns
- **[SETUP_AND_MIDDLEWARE.md](SETUP_AND_MIDDLEWARE.md)** - server.js, app.js, all middleware
- **[UTILITIES.md](UTILITIES.md)** - APIFeatures, catchAsync, AppError, Email

### 📖 Reference Documentation

- **[INDEX.md](INDEX.md)** - Complete doc index
- **Routes:** [tourRoutes.md](routesDocs/tourRoutes.md), [userRoutes.md](routesDocs/userRoutes.md), [reviewRoutes.md](routesDocs/reviewRoutes.md)
- **Models:** [tourModel.md](modelDocs/tourModel.md), [userModel.md](modelDocs/userModel.md), [reviewModel.md](modelDocs/reviewModel.md)
- **Controllers:** [handlerFactory.md](controllerDocs/handlerFactory.md), [authController.md](controllerDocs/authController.md), [errorController.md](controllerDocs/errorController.md), etc.

---

## 🗺️ Project Structure Overview

```
Natour's Project/
├── server.js              # Entry point, DB connection
├── app.js                 # Express config, middleware, routes
├── config.env             # Environment variables
├── package.json           # Dependencies
│
├── controllers/           # Route handlers
│   ├── authController.js  # Signup, login, JWT
│   ├── tourController.js  # Tour CRUD
│   ├── userController.js  # User management
│   ├── reviewController.js
│   ├── handlerFactory.js  # Reusable CRUD functions ⭐
│   └── errorController.js # Global error handler
│
├── models/                # Data schemas
│   ├── tourModel.js       # Tour schema + validation
│   ├── userModel.js       # User schema + auth
│   └── reviewModel.js     # Review schema + hooks
│
├── routes/                # URL endpoints
│   ├── tourRoutes.js      # 10 tour endpoints (incl. geolocation)
│   ├── userRoutes.js      # 13 user endpoints
│   └── reviewRoutes.js    # 5 review endpoints
│
├── utils/                 # Helper functions
│   ├── apiFeatures.js     # Query builder (filter, sort, paginate) ⭐
│   ├── catchAsync.js      # Async error wrapper ⭐
│   ├── appError.js        # Custom error class ⭐
│   └── email.js           # Email sending
│
└── doc/                   # THIS DOCUMENTATION (19 files!)
```

---

## 💡 Core Concepts (Must Know!)

### 1. Request Flow

```
Client Request
  ↓
app.js (Security Middleware)
  ├─ helmet, rate limiting
  ├─ body parser
  └─ sanitization (NoSQL, XSS)
  ↓
Route Matching
  ├─ /api/v1/tours → tourRouter
  ├─ /api/v1/users → userRouter
  └─ /api/v1/reviews → reviewRouter
  ↓
Middleware Chain
  ├─ protect (check JWT)
  ├─ restrictTo('admin') (check role)
  └─ controller function
  ↓
Response or Error
```

### 2. Authentication Flow

```
1. Signup/Login → Create JWT token
2. Client stores token
3. Client sends token in Authorization header
4. protect middleware verifies token
5. Attach user to req.user
6. Controller has access to req.user
```

**JWT Token:** `Authorization: Bearer eyJhbGci...`

### 3. Error Handling Layers

```
1. try-catch / catchAsync → Catch async errors
2. Express error middleware → Format errors
3. Unhandled rejection → Catch promise errors
4. Uncaught exception → Catch sync errors
```

### 4. Factory Pattern (DRY Code!)

Instead of writing repetitive CRUD:

```javascript
// Use factory functions
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
```

### 5. APIFeatures (Query Processing)

```javascript
const features = new APIFeatures(Tour.find(), req.query)
  .filter() // ?difficulty=easy&price[lt]=1000
  .sort() // ?sort=-price,ratingsAverage
  .limitFields() // ?fields=name,duration,price
  .pagination(); // ?page=2&limit=10

const tours = await features.query;
```

---

## 🔑 Key Files to Remember

### Always Use These Utilities

| Utility       | Usage                      | Why                       |
| ------------- | -------------------------- | ------------------------- |
| `catchAsync`  | Wrap all async controllers | Auto error handling       |
| `AppError`    | Create errors              | Operational error marking |
| `APIFeatures` | Process query strings      | Filter, sort, paginate    |
| `factory`     | CRUD operations            | DRY code                  |

**Example:**

```javascript
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.customFunction = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour }
  });
});
```

---

## 🛠️ Common Tasks

### Adding a New Route

1. **Define route** in `routes/XRoutes.js`

   ```javascript
   router.get('/special', protect, getSpecial);
   ```

2. **Create controller** in `controllers/XController.js`

   ```javascript
   exports.getSpecial = catchAsync(async (req, res, next) => {
     // Your logic
   });
   ```

3. **Or use factory:**

   ```javascript
   exports.getSpecial = factory.getAll(Model);
   ```

4. **Document it** in `doc/routesDocs/XRoutes.md`

### Adding a New Field to Model

1. **Update schema** in `models/XModel.js`

   ```javascript
   newField: {
     type: String,
     required: [true, 'Message'],
     validate: { ... }
   }
   ```

2. **Add validation** if needed

3. **Update documentation** in `doc/modelDocs/XModel.md`

4. **Test** with sample data

### Debugging Issues

1. **Check terminal** for errors
2. **Check PRACTICAL_EXAMPLES.md** - Debugging section
3. **Check specific doc** for the feature
4. **Common issues:**
   - JWT expired → Log in again
   - Validation error → Check model schema
   - Not authorized → Check protect middleware
   - 404 → Check route definition

---

## 🎯 Important Patterns Used

### 1. Middleware Stacking

```javascript
router.post(
  '/tours',
  protect, // Check authentication
  restrictTo('admin'), // Check authorization
  createTour // Execute handler
);
```

### 2. Soft Delete (Users)

Don't actually delete users:

```javascript
// Set active: false instead of deleting
user.active = false;
await user.save();

// Pre-find middleware auto-hides inactive users
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});
```

### 3. Auto-Updates (Reviews → Tours)

When review is created/updated/deleted:

```javascript
// In reviewModel.js
reviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.tour);
});

// Automatically updates tour's ratingsAverage
```

### 4. Password Security

```javascript
// Pre-save middleware auto-hashes passwords
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
  next();
});

// Never stored in plain text!
```

### 5. Field Filtering (Security)

```javascript
// In userController.js - updateMe
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Users can only update name and email
const filteredBody = filterObj(req.body, 'name', 'email');
```

---

## 🔒 Security Features

✅ **Helmet** - Secure HTTP headers  
✅ **Rate Limiting** - Prevent brute force (100 req/hour)  
✅ **Data Sanitization** - NoSQL injection prevention  
✅ **XSS Protection** - Script injection prevention  
✅ **HPP** - Parameter pollution prevention  
✅ **JWT** - Stateless authentication  
✅ **bcrypt** - Password hashing  
✅ **Field Filtering** - Prevent mass assignment  
✅ **Soft Delete** - Data preservation

---

## 📊 API Endpoints Summary

### Tours (10 endpoints)

- `GET /api/v1/tours` - All tours (public)
- `GET /api/v1/tours/:id` - One tour (public)
- `POST /api/v1/tours` - Create (admin, lead-guide)
- `PATCH /api/v1/tours/:id` - Update (admin, lead-guide)
- `DELETE /api/v1/tours/:id` - Delete (admin, lead-guide)
- `GET /api/v1/tours/top-5-cheap` - Top 5 deals (public)
- `GET /api/v1/tours/tour-stats` - Statistics (public)
- `GET /api/v1/tours/monthly-plan/:year` - Schedule (guides)
- `GET /api/v1/tours/tours-within/:distance/center/:latlng/unit/:unit` - Tours by distance (public)
- `GET /api/v1/tours/distances/:latlng/unit/:unit` - Distances to tours (public)

### Users (13 endpoints)

- `POST /api/v1/users/signup` - Register (public)
- `POST /api/v1/users/login` - Login (public)
- `POST /api/v1/users/forgotPassword` - Reset request (public)
- `PATCH /api/v1/users/resetPassword/:token` - Reset (public)
- `PATCH /api/v1/users/updatePassword` - Change password (protected)
- `GET /api/v1/users/me` - Get own profile (protected)
- `PATCH /api/v1/users/updateMe` - Update profile (protected)
- `DELETE /api/v1/users/deleteMe` - Deactivate (protected)
- `GET /api/v1/users` - All users (admin)
- `POST /api/v1/users` - Create user (admin)
- `GET /api/v1/users/:id` - One user (admin)
- `PATCH /api/v1/users/:id` - Update user (admin)
- `DELETE /api/v1/users/:id` - Delete user (admin)

### Reviews (5 endpoints)

- `GET /api/v1/reviews` - All reviews (public)
- `POST /api/v1/reviews` - Create review (protected)
- `GET /api/v1/reviews/:id` - One review (public)
- `PATCH /api/v1/reviews/:id` - Update review (own or admin)
- `DELETE /api/v1/reviews/:id` - Delete review (own or admin)

**Nested Routes:**

- `GET /api/v1/tours/:tourId/reviews` - Tour's reviews
- `POST /api/v1/tours/:tourId/reviews` - Create review for tour

---

## 📝 Quick Reference Tables

### HTTP Status Codes Used

| Code | Meaning      | Usage                       |
| ---- | ------------ | --------------------------- |
| 200  | OK           | Successful GET              |
| 201  | Created      | Successful POST             |
| 204  | No Content   | Successful DELETE           |
| 400  | Bad Request  | Validation error            |
| 401  | Unauthorized | Not logged in               |
| 403  | Forbidden    | Logged in but no permission |
| 404  | Not Found    | Resource doesn't exist      |
| 500  | Server Error | Something went wrong        |

### User Roles

| Role             | Can Do                                 |
| ---------------- | -------------------------------------- |
| `user` (default) | Create reviews, update own profile     |
| `guide`          | View monthly plans                     |
| `lead-guide`     | Create/update/delete tours, view plans |
| `admin`          | Everything                             |

### Protected Routes

| Protection     | Middleware            | What it checks                    |
| -------------- | --------------------- | --------------------------------- |
| Login required | `protect`             | Valid JWT token                   |
| Role required  | `restrictTo('admin')` | User role                         |
| Own resource   | Custom logic          | `req.user.id === resource.userId` |

---

## 🐛 Troubleshooting

### Server won't start

1. Check `config.env` exists
2. Check DATABASE_PASSWORD is correct
3. Check port 5000 is free
4. Check MongoDB connection

### Authentication not working

1. Check JWT_SECRET in config.env
2. Check Authorization header format: `Bearer <token>`
3. Check token hasn't expired
4. Check user still exists and is active

### Data not appearing

1. Check if data is imported: `node dev-data/data/import-dev-data.js --import`
2. Check query filters in URL
3. Check user permissions

### Validation errors

1. Check model schema in `modelDocs/`
2. Check required fields
3. Check field types and constraints

---

## 🎓 Learning Path for New Contributors

### Day 1: Orientation

1. Read this file (MASTER_GUIDE.md)
2. Read [ARCHITECTURE.md](ARCHITECTURE.md)
3. Read [PRACTICAL_EXAMPLES.md](PRACTICAL_EXAMPLES.md) - Example 1 & 2

### Day 2: Technical Concepts

1. Read [TECHNICAL_CONCEPTS.md](TECHNICAL_CONCEPTS.md) - Middleware section
2. Read [SETUP_AND_MIDDLEWARE.md](SETUP_AND_MIDDLEWARE.md)
3. Read [UTILITIES.md](UTILITIES.md)

### Day 3: Routes & Models

1. Read [tourRoutes.md](routesDocs/tourRoutes.md)
2. Read [userRoutes.md](routesDocs/userRoutes.md)
3. Read [tourModel.md](modelDocs/tourModel.md)
4. Read [userModel.md](modelDocs/userModel.md)

### Day 4: Controllers & Patterns

1. Read [handlerFactory.md](controllerDocs/handlerFactory.md)
2. Read [authController.md](controllerDocs/authController.md)
3. Practice: Add a simple route

### Day 5: Advanced

1. Read [errorController.md](controllerDocs/errorController.md)
2. Read [TECHNICAL_CONCEPTS.md](TECHNICAL_CONCEPTS.md) - Security section
3. Read all PRACTICAL_EXAMPLES

---

## ✅ Pre-commit Checklist

Before committing code:

- [ ] Code follows existing patterns (factory, catchAsync, etc.)
- [ ] All async functions wrapped in catchAsync
- [ ] Errors use AppError class
- [ ] Input validated (model schema)
- [ ] Security considered (field filtering, sanitization)
- [ ] Documentation updated (if adding/changing features)
- [ ] Tested with sample data
- [ ] No console.logs left in production code
- [ ] Environment variables used for secrets

---

## 📞 Need Help?

1. **Quick lookup:** Use [QUICK_START.md](QUICK_START.md)
2. **Understanding concept:** Use [TECHNICAL_CONCEPTS.md](TECHNICAL_CONCEPTS.md)
3. **See example:** Use [PRACTICAL_EXAMPLES.md](PRACTICAL_EXAMPLES.md)
4. **Specific feature:** Use respective doc in routesDocs/, modelDocs/, or controllerDocs/
5. **Can't find it:** Check [INDEX.md](INDEX.md)

---

## 🎉 Remember

- **All docs are interconnected** - Follow the links!
- **Examples show real flows** - Use PRACTICAL_EXAMPLES.md
- **Technical concepts explain WHY** - Use TECHNICAL_CONCEPTS.md
- **This is YOUR documentation** - Keep it updated!

**When in doubt, start with [ARCHITECTURE.md](ARCHITECTURE.md) and [PRACTICAL_EXAMPLES.md](PRACTICAL_EXAMPLES.md)!**

---

**Last Updated:** February 2026  
**Total Documentation Files:** 19  
**Total Endpoints Documented:** 28  
**You got this! 🚀**

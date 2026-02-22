# Documentation Index & Quick Reference

## 📚 Complete Documentation Structure

This comprehensive documentation covers all aspects of the Natour's project, organized for easy reference when building features.

---

## Main Documentation Files

### 1. **README.md** - Documentation Overview

**Purpose:** Summary of all documentation with quick navigation

**When to Read:** First-time overview, finding the right doc to read

---

### 2. **QUICK_START.md** - Quick Reference Guide

**Purpose:** "I want to..." guide for quick lookups

**When to Read:** When you know what you need but not where to find it

---

### 3. **ARCHITECTURE.md** - Start Here!

**Purpose:** Complete overview of how the project works

**Contents:**

- Project overview and core entities
- Routes structure explanation
- Models architecture
- Controllers & handlers
- How to use (practical examples)
- Request/response flow
- Security features

**When to Read:**

- First-time understanding the project
- Understanding how components connect
- Learning request flow

---

### 4. **TECHNICAL_CONCEPTS.md** - Deep Technical Dive ⭐ NEW

**Purpose:** Detailed explanations of every technical concept used

**Contents:**

- **Middleware Concept** - What it is, how it works, types, stacking, practical examples
- **Authentication & Authorization** - JWT explained in detail, password security, token lifecycle
- **Mongoose & MongoDB** - Schemas, models, middleware types, virtuals, indexes, validators
- **Error Handling Philosophy** - Operational vs programming errors, error layers, Mongoose errors
- **Security Patterns** - Defense in depth, OWASP mitigations, security checklist
- **API Design Patterns** - RESTful principles, JSend format, query patterns
- **Code Patterns & Best Practices** - Factory pattern, DRY, separation of concerns

**When to Read:**

- Understanding WHY things are done a certain way
- Learning how authentication/JWT works
- Understanding middleware flow
- Learning security implementation
- Understanding factory pattern
- Learning best practices

---

### 5. **SETUP_AND_MIDDLEWARE.md** - Application Startup ⭐ NEW

**Purpose:** Complete guide to server.js, app.js, and all middleware

**Contents:**

- **server.js breakdown** - Entry point, DB connection, error handlers, startup sequence
- **app.js breakdown** - Express configuration, route mounting
- **Middleware Stack Order** - Why order matters, complete middleware explanation
- **Security Middleware** - helmet, rate limiting, sanitization, XSS, HPP explained
- **Request Flow Diagram** - Visual representation of request processing
- **Environment Variables** - Complete config.env explanation
- **Production vs Development** - Differences and considerations
- **Common Issues & Solutions** - Troubleshooting guide

**When to Read:**

- Understanding how app starts
- Learning middleware stack
- Debugging startup issues
- Configuring security
- Setting up environment variables
- Understanding each middleware's purpose

---

### 6. **UTILITIES.md** - Helper Functions ⭐ NEW

**Purpose:** Complete documentation of all utility functions in utils/

**Contents:**

- **AppError** - Custom error class with examples and technical deep dive
- **catchAsync** - Async error handler, how it works, why use it
- **APIFeatures** - Complete query builder guide:
  - filter() - Filtering with operators
  - sort() - Single and multi-field sorting
  - limitFields() - Field projection
  - pagination() - Page-based pagination
  - Method chaining explained
- **Email** - Email sending with Nodemailer

**Each utility includes:**

- Purpose and problem it solves
- Complete code breakdown
- Step-by-step explanations
- Usage examples
- Technical deep dives (closures, promises, etc.)
- Common patterns

**When to Read:**

- Using APIFeatures for filtering/sorting
- Understanding error handling
- Sending emails
- Learning code patterns
- Understanding how query processing works

---

## Routes Documentation

### 7. **routesDocs/tourRoutes.md**

**Purpose:** All tour-related endpoints explained

**Key Topics:**

- How tour routes work
- All 10 tour routes with examples
- Nested route concept explained
- Factory function usage in routes
- Route ordering and middleware
- Geospatial querying for location-based tours
- Common patterns
- Error handling

**Routes Covered:**

- GET /top-5-cheap - Top deals
- GET /tour-stats - Statistics
- GET /monthly-plan/:year - Schedule
- GET / - All tours with filters
- POST / - Create tour
- GET /:id - Tour details with reviews
- PATCH /:id - Update tour
- DELETE /:id - Delete tour
- GET /tours-within/:distance/center/:latlng/unit/:unit - Tours within radius (geolocation)
- GET /distances/:latlng/unit/:unit - Distances to tours (geolocation)

**Reference Table:**
Shows every route, method, auth required, role, and purpose

---

### 8. **routesDocs/userRoutes.md**

**Purpose:** All user and authentication endpoints

**Key Topics:**

- Critical: Route order matters!
- Three phases: public → protected → admin
- Middleware chain explanation
- All 13 user routes with examples
- Field filtering security (updateMe)
- Soft delete pattern (deleteMe)
- Common authorization patterns
- Using routes in your application

**Routes Covered (by phase):**

**Public (No Auth):**

- POST /signup - Register
- POST /login - Login
- POST /forgotPassword - Reset request
- PATCH /resetPassword/:token - Reset with token

**Protected (Login Required):**

- PATCH /updatePassword - Change password
- GET /me - Get own profile
- PATCH /updateMe - Update own profile
- DELETE /deleteMe - Deactivate account

**Admin-Only:**

- GET / - All users
- POST / - Create user
- GET /:id - User details
- PATCH /:id - Update user
- DELETE /:id - Delete user

**Reference Table:**
Shows every route with complete details

---

### 9. **routesDocs/reviewRoutes.md** (Created Previously)

**Purpose:** Review endpoints and nested routing

**Key Topics:**

- How reviews nest under tours
- POST /reviews - Create review
- GET /reviews - All reviews

---

## Models Documentation

### 10. **modelDocs/tourModel.md** (Updated)

**Purpose:** Complete tour data structure

**Key Topics:**

- 15+ fields with validation rules
- Virtual properties (durationWeeks)
- Pre-save middleware (slug generation)
- Auto-rating system explained
- How review creates auto-update tour ratings
- One-to-many relationship with reviews
- Usage in controllers
- Field reference table
- Validation examples

**Critical Concept:**
When a review is created/updated/deleted, tour's ratingsAverage and ratingsQuantity automatically update via hooks

---

### 11. **modelDocs/userModel.md** (Updated)

**Purpose:** Complete user data structure and auth

**Key Topics:**

- 10 fields with validation rules
- Password hashing (bcrypt)
- Authentication methods (correctPassword, changedPasswordAfter)
- Password reset token system
- Soft delete pattern (active field)
- Pre-save middleware (password hashing)
- Pre-find middleware (hide inactive users)
- Field filtering security
- Usage in controllers

**Critical Concepts:**

1. Passwords auto-hashed, never stored plain
2. Soft delete preserves data while hiding
3. createPasswordResetToken() for secure reset
4. Automatic inactive user filtering

---

### 12. **modelDocs/reviewModel.md** (Created Previously)

**Purpose:** Review data structure and auto-rating

**Key Topics:**

- Review fields with validation
- Auto-population of user data
- Static method: calcAverageRatings
- Post-save hook: Update tour ratings
- Pre/post findOneAnd hooks
- How reviews auto-update tour

---

## Controllers Documentation

### 13. **controllerDocs/handlerFactory.md** (New!)

**Purpose:** Reusable CRUD factory functions

**Key Topics:**

- What is a factory function
- How factory pattern eliminates duplication
- 5 available factory functions:
  - deleteOne(Model) - Delete by ID
  - updateOne(Model) - Update by ID
  - createOne(Model) - Create new
  - getOne(Model, popOptions) - Get single with optional population
  - getAll(Model) - Get all with filtering/sorting/pagination
- Special: Nested route filtering in getAll
- When to use factory vs custom
- Error handling
- Benefits of factory pattern
- Code reduction comparison (120 lines → 5 lines)

**Usage Examples:**

```javascript
exports.deleteTour = factory.deleteOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.getAllTours = factory.getAll(Tour);
```

**Important:** Factory functions are used for most CRUD operations. Understanding this pattern is essential.

---

### 14. **controllerDocs/authController.md** (Previously Created)

**Purpose:** Authentication and authorization functions

**Functions Covered:**

- signup - Register user
- login - User login
- protect - JWT verification middleware
- restrictTo - Role-based access middleware
- forgotPassword - Password reset request
- resetPassword - Reset password with token
- updatePassword - Change password (logged in)
- createSendToken - Generate JWT token (helper)

---

### 15. **controllerDocs/tourController.md** (Previously Created)

**Purpose:** Tour-specific handlers

**Functions Covered:**

- aliasTopTours - Middleware for top 5 deals
- getAllTours - Uses factory
- getTour - Uses factory with review population
- createTour - Uses factory
- updateTour - Uses factory
- deleteTour - Uses factory
- getTourStats - Aggregation for statistics
- getMonthlyPlan - Aggregation for schedule

---

### 16. **controllerDocs/userController.md** (Previously Created)

**Purpose:** User-specific handlers

**Functions Covered:**

- updateMe - Update own profile (field filtering)
- getMe - Get own profile (middleware)
- deleteMe - Soft delete (deactivate account)
- getAllUsers - Uses factory
- getUser - Uses factory
- createUser - Uses factory
- updateUser - Uses factory
- deleteUser - Uses factory

---

### 12. **controllerDocs/errorController.md** (Previously Created)

**Purpose:** Global error handling

**Functions Covered:**

- globalErrorHandler - Catches all errors
- AppError class - Custom error creation
- Development vs production error responses

---

### 13. **controllerDocs/reviewController.md** (Previously Created)

**Purpose:** Review-specific handlers

**Functions Covered:**

- getAllReviews - Uses factory (handles nested filtering)
- getReview - Uses factory
- createReview - Uses factory
- updateReview - Uses factory
- deleteReview - Uses factory

---

## How to Use This Documentation

### Scenario 1: Adding a New Feature

```
1. Read ARCHITECTURE.md to understand flow
2. Find relevant route in routesDocs/
3. Check model in modelDocs/
4. Check controller in controllerDocs/
5. Reference factory pattern in handlerFactory.md if needed
```

### Scenario 2: Understanding a Route

```
Example: How does POST /api/v1/tours/123/reviews work?

1. tourRoutes.md → Explains nested routing
2. Nested to reviewRoutes.md → POST /reviews route
3. reviewController.md → createReview function
4. reviewModel.md → How review saves and triggers hook
5. tourModel.md → How tour rating auto-updates
```

### Scenario 3: Creating Similar Functionality

```
Example: Create a new resource like "Bookings"

1. Check handlerFactory.md → Use factory functions
2. Look at tourModel.md → Use similar schema pattern
3. Look at tourController.md → Use factory like this
4. Look at tourRoutes.md → Organize routes like this
5. Check authController.md → Add protect/restrictTo middleware
```

### Scenario 4: Understanding Data Flow

```
Request → Route → Middleware (auth, role) → Controller → Model → Response

Route (tourRoutes.md)
  ↓ (match endpoint)
Middleware (authController.md - protect/restrictTo)
  ↓ (verify auth/role)
Controller (tourController.md)
  ↓ (may use factory)
Model (tourModel.md)
  ↓ (may trigger hooks/middleware)
Database
  ↓
Response to user
```

---

## Quick Reference Tables

### All Routes Summary

| Entity    | Total Routes | Public | Protected | Admin |
| --------- | ------------ | ------ | --------- | ----- |
| Tours     | 8            | 4      | 2         | 2     |
| Users     | 13           | 4      | 4         | 5     |
| Reviews   | 5            | 1      | 1         | -     |
| **Total** | **26**       | **9**  | **7**     | **7** |

### Model Relationships

```
User (1) ───── (Many) Reviews
         ───── (Many) Bookings (future)

Tour (1) ───── (Many) Reviews
      ───── (Many) Bookings (future)

Review (Many) ───── (1) User
       ───── (1) Tour
```

### Factory Function Quick Lookup

| Factory                | Purpose      | Returns                                 |
| ---------------------- | ------------ | --------------------------------------- |
| deleteOne(Model)       | Delete by ID | 204 No Content                          |
| updateOne(Model)       | Update by ID | Updated document                        |
| createOne(Model)       | Create new   | New document, 201                       |
| getOne(Model, options) | Get single   | Document with optional population       |
| getAll(Model)          | Get all      | Array with filtering/sorting/pagination |

### Authentication Status by Route

| Route Category | Needs Auth | Needs Role | Role Options                   |
| -------------- | ---------- | ---------- | ------------------------------ |
| Public         | No         | No         | -                              |
| Protected      | Yes        | No         | user, guide, lead-guide, admin |
| Guide          | Yes        | Yes        | guide, lead-guide, admin       |
| Admin          | Yes        | Yes        | admin only                     |

---

## Development Workflow

### When Adding New Feature:

**1. Design Phase:**

- Read ARCHITECTURE.md
- Understand entities and relationships
- Plan database schema

**2. Model Phase:**

- Read relevant modelDocs
- Create/update model file
- Add validations and middleware

**3. Route Phase:**

- Read routesDocs
- Design route endpoints
- Plan middleware (protect, restrictTo)

**4. Controller Phase:**

- Check handlerFactory.md
- Use factory for CRUD operations
- Add custom logic for special handlers

**5. Integration Phase:**

- Mount routes in app.js
- Test endpoints
- Check error handling

---

## Common Patterns to Follow

### 1. Route Organization

**From userRoutes.md:**

```
Specific routes → Middleware apply → Protected routes → Admin routes
```

### 2. Field Filtering for Updates

**From userController.md updateMe:**

```javascript
const allowedFields = ['name', 'email'];
const filteredBody = {};
Object.keys(req.body).forEach(el => {
  if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
});
```

### 3. Soft Delete Pattern

**From userModel.md:**

```javascript
// Instead of delete, set active: false
active: {
  $ne: false;
} // Auto-filters in pre-find
```

### 4. Auto-Update Relationships

**From reviewModel.md & tourModel.md:**

```javascript
// When review created/updated/deleted
// Post-save hook updates tour ratings automatically
```

### 5. Factory Function Usage

**From handlerFactory.md & tourController.md:**

```javascript
exports.deleteTour = factory.deleteOne(Tour);
// Use factory instead of writing handler
```

---

## Documentation Standards Used

### This documentation explains:

1. **What** - What does this do?
2. **Why** - Why is it done this way?
3. **How** - How do you use it?
4. **Example** - Code examples showing usage
5. **Reference** - Quick lookup tables

### Field Documentation Format:

```javascript
#### `fieldName` - Description
type: Type,
required: true,
default: value
```

### Route Documentation Format:

```
GET /api/v1/endpoint
Auth: required/not-required
Role: admin/guide/user/all
Purpose: What this endpoint does
```

---

## Important Security Concepts

1. **Password Security (userModel.md):**

   - Auto-hashed with bcrypt
   - Never stored plain text
   - Never sent to frontend

2. **Field Filtering (userController.md):**

   - updateMe only allows name/email
   - Prevents users becoming admin

3. **Soft Delete (userModel.md):**

   - active: false marks deleted
   - Data preserved in database
   - Automatically filtered from queries

4. **Route Ordering (userRoutes.md):**

   - Specific routes before general
   - Middleware stacking for auth/role

5. **Model Hooks (reviewModel.md):**
   - Auto-update related documents
   - Keep data consistent

---

## Frequently Asked Questions

### Q: How do I create a new route?

**A:** See routesDocs/ directory. Follow pattern from tourRoutes.md or userRoutes.md

### Q: How do I add CRUD operations?

**A:** Use handlerFactory.md - much faster than custom code

### Q: How does authentication work?

**A:** authController.md protect() middleware + model methods

### Q: How do reviews update tour ratings?

**A:** reviewModel.md hooks trigger tourModel update automatically

### Q: How do I prevent users from becoming admin?

**A:** userController.md updateMe uses allowedFields filter

### Q: What's soft delete?

**A:** userModel.md active: false pattern - preserves data while hiding

---

## Next Steps

1. **To understand the project:**

   - Start with ARCHITECTURE.md
   - Then read relevant modelDocs
   - Then read relevant routesDocs

2. **To add features:**

   - Follow pattern from similar feature
   - Use factory functions for CRUD
   - Add middleware for auth/role

3. **To debug:**
   - Check relevant modelDocs for validation
   - Check routesDocs for endpoint details
   - Check controllerDocs for handler logic
   - Check handlerFactory.md for factory behavior

---

## Document Maintenance

**Last Updated:** [Current]

**Covers:**

- ✅ 10 Tour routes (including geolocation)
- ✅ 13 User routes
- ✅ 5 Review routes
- ✅ 3 Models (Tour, User, Review)
- ✅ 5 Controllers (Auth, Tour, User, Review, Error)
- ✅ Handler Factory pattern
- ✅ All key architectural concepts
- ✅ Security features
- ✅ Geospatial features
- ✅ Common patterns
- ✅ Practical examples

**When updating code, update corresponding documentation!**

# Quick Start Guide - Where to Find What

Use this guide to quickly find the documentation you need.

---

## 📍 I Want To... Find Documentation For

### Understanding the Project

**❓ What does this project do?**
→ `doc/ARCHITECTURE.md` - Project Overview section

**❓ How do all the pieces fit together?**
→ `doc/ARCHITECTURE.md` - How everything connects

**❓ What entities does the project use?**
→ `doc/ARCHITECTURE.md` - Core Entities diagram

**❓ How does the request flow through the system?**
→ `doc/ARCHITECTURE.md` - Request/Response Flow
→ `doc/PRACTICAL_EXAMPLES.md` - See real examples

**❓ How does the app start up?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Complete startup guide

**❓ What is middleware and how does it work?**
→ `doc/TECHNICAL_CONCEPTS.md` - Middleware Concept section
→ `doc/SETUP_AND_MIDDLEWARE.md` - Middleware Stack

**❓ How does authentication work?**
→ `doc/TECHNICAL_CONCEPTS.md` - Authentication & Authorization

**❓ What are all the environment variables?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Environment Variables section

---

### Learning About Routes

**❓ What are all the tour endpoints?**
→ `doc/routesDocs/tourRoutes.md` - Complete route list with table

**❓ How do I create a tour?**
→ `doc/routesDocs/tourRoutes.md` - POST / section

**❓ How do I filter tours?**
→ `doc/routesDocs/tourRoutes.md` - GET / section with examples
→ `doc/UTILITIES.md` - APIFeatures class explained

**❓ How does pagination work?**
→ `doc/UTILITIES.md` - APIFeatures pagination method

**❓ How does sorting work?**
→ `doc/UTILITIES.md` - APIFeatures sort method

**❓ What are all the user endpoints?**
→ `doc/routesDocs/userRoutes.md` - Complete route list

**❓ Why does route order matter?**
→ `doc/routesDocs/userRoutes.md` - Route Order Breakdown section

**❓ How do I sign up?**
→ `doc/routesDocs/userRoutes.md` - POST /signup section

**❓ How does authentication work?**
→ `doc/routesDocs/userRoutes.md` - Phase 2 Protected Routes
→ `doc/TECHNICAL_CONCEPTS.md` - Authentication & Authorization
→ `doc/controllerDocs/authController.md` - Complete auth functions

**❓ What is JWT and how does it work?**
→ `doc/TECHNICAL_CONCEPTS.md` - JWT Explained section

**❓ How are passwords secured?**
→ `doc/TECHNICAL_CONCEPTS.md` - Password Security section
→ `doc/modelDocs/userModel.md` - Password hashing

**❓ How do nested routes work?**
→ `doc/routesDocs/tourRoutes.md` - Nested Routes Explained section

**❓ How do I create a review for a tour?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 3: Create Review

---

### Learning About Models

**❓ What data does a tour have?**
→ `doc/modelDocs/tourModel.md` - Tour Schema Fields

**❓ How is a tour validated?**
→ `doc/modelDocs/tourModel.md` - Validation Examples section

**❓ What data does a user have?**
→ `doc/modelDocs/userModel.md` - User Schema Fields

**❓ How are passwords handled?**
→ `doc/modelDocs/userModel.md` - Password Security section

**❓ What's this soft delete thing?**
→ `doc/modelDocs/userModel.md` - Account Status section
→ `doc/PRACTICAL_EXAMPLES.md` - Example 6: Soft Delete

**❓ How do reviews update tour ratings?**
→ `doc/modelDocs/tourModel.md` - How Rating Updates Work
→ `doc/modelDocs/reviewModel.md` - Auto-updates
→ `doc/PRACTICAL_EXAMPLES.md` - Example 3: Auto-rating

**❓ What fields can users update?**
→ `doc/modelDocs/userModel.md` - Field Reference table

**❓ What's a virtual property?**
→ `doc/modelDocs/tourModel.md` - Virtual Properties section
→ `doc/TECHNICAL_CONCEPTS.md` - Virtual Properties section

**❓ What are Mongoose hooks/middleware?**
→ `doc/TECHNICAL_CONCEPTS.md` - Mongoose & MongoDB section

---

### Learning About Controllers

**❓ What are factory functions?**
→ `doc/controllerDocs/handlerFactory.md` - Complete explanation

**❓ How do I use factory functions?**
→ `doc/controllerDocs/handlerFactory.md` - Using Factory in Controllers

**❓ What are the 5 factory functions?**
→ `doc/controllerDocs/handlerFactory.md` - Available Factory Functions

**❓ How does the delete handler work?**
→ `doc/controllerDocs/handlerFactory.md` - deleteOne section

**❓ How does filtering work?**
→ `doc/controllerDocs/handlerFactory.md` - getAll section

**❓ How does authentication work?**
→ `doc/controllerDocs/authController.md` - protect middleware

**❓ How does role-based access work?**
→ `doc/controllerDocs/authController.md` - restrictTo middleware

**❓ How does password hashing work?**
→ `doc/modelDocs/userModel.md` - Password Security section

**❓ How is updateMe protecting users?**
→ `doc/controllerDocs/userController.md` - updateMe function
→ `doc/PRACTICAL_EXAMPLES.md` - Example 5: Field Filtering

**❓ How does error handling work?**
→ `doc/controllerDocs/errorController.md`
→ `doc/UTILITIES.md` - AppError and catchAsync explained
→ `doc/TECHNICAL_CONCEPTS.md` - Error Handling Philosophy
→ `doc/SETUP_AND_MIDDLEWARE.md` - Error handlers in server.js

---

### Learning About Utilities

**❓ What is AppError?**
→ `doc/UTILITIES.md` - AppError section

**❓ What is catchAsync and why use it?**
→ `doc/UTILITIES.md` - catchAsync section

**❓ How does APIFeatures work?**
→ `doc/UTILITIES.md` - Complete APIFeatures guide with all methods

**❓ How do I send emails?**
→ `doc/UTILITIES.md` - Email section

---

### Understanding Technical Concepts

**❓ What is middleware?**
→ `doc/TECHNICAL_CONCEPTS.md` - Middleware Concept section

**❓ How does JWT authentication work?**
→ `doc/TECHNICAL_CONCEPTS.md` - JWT Explained section

**❓ What's the difference between authentication and authorization?**
→ `doc/TECHNICAL_CONCEPTS.md` - Authentication & Authorization

**❓ How are passwords secured with bcrypt?**
→ `doc/TECHNICAL_CONCEPTS.md` - Password Security section

**❓ What's the factory pattern?**
→ `doc/TECHNICAL_CONCEPTS.md` - Factory Pattern section

**❓ What are Mongoose hooks and middleware?**
→ `doc/TECHNICAL_CONCEPTS.md` - Mongoose & MongoDB section

**❓ What are best practices for this codebase?**
→ `doc/TECHNICAL_CONCEPTS.md` - Code Patterns & Best Practices

---

### Understanding Security & Setup

**❓ How does the app start?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Complete startup guide

**❓ What security measures are in place?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Security Middleware section
→ `doc/TECHNICAL_CONCEPTS.md` - Security Patterns

**❓ How does rate limiting work?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Rate Limiting section

**❓ What is NoSQL injection and how is it prevented?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Data Sanitization section

**❓ How is XSS prevented?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - XSS Protection section

**❓ What are all the middleware doing?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Middleware Stack Explained

**❓ What environment variables do I need?**
→ `doc/SETUP_AND_MIDDLEWARE.md` - Environment Variables section

---

### Learning Real Flows

**❓ How does signing up work step-by-step?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 1: Sign Up

**❓ How does login work?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 2: Login

**❓ How does creating a review work with auto-rating?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 3: Create Review

**❓ How does admin update a tour?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 4: Update Tour

**❓ How does field filtering prevent hacks?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 5: Update Profile

**❓ How does soft delete work?**
→ `doc/PRACTICAL_EXAMPLES.md` - Example 6: Deactivate Account

---

### Building Features

**❓ How do I add a new route?**
→ `doc/routesDocs/tourRoutes.md` or `userRoutes.md` - Check pattern
→ Use factory from `doc/controllerDocs/handlerFactory.md`
→ Follow pattern from `doc/PRACTICAL_EXAMPLES.md`

**❓ How do I add a new model field?**
→ `doc/modelDocs/` - Check existing fields for pattern
→ Read validation section in ARCHITECTURE.md

**❓ How do I protect a route?**
→ `doc/controllerDocs/authController.md` - protect and restrictTo
→ `doc/routesDocs/userRoutes.md` - See middleware examples

**❓ How do I filter fields in an update?**
→ `doc/controllerDocs/userController.md` - updateMe function
→ `doc/PRACTICAL_EXAMPLES.md` - Example 5

**❓ How do I add validation?**
→ `doc/modelDocs/` - Check validation patterns
→ `doc/ARCHITECTURE.md` - Validation section

**❓ How do I add a hook?**
→ `doc/modelDocs/userModel.md` - Middleware section
→ `doc/modelDocs/tourModel.md` - Middleware section

---

### Debugging

**❓ How do I debug a route issue?**
→ `doc/routesDocs/` - Check route definition
→ `doc/PRACTICAL_EXAMPLES.md` - Trace through examples
→ `doc/README.md` - Debugging guide

**❓ How do I debug a validation error?**
→ `doc/modelDocs/` - Check field validation
→ `doc/modelDocs/` - Check Validation Examples

**❓ How do I debug an authentication issue?**
→ `doc/controllerDocs/authController.md` - Check protect flow
→ `doc/PRACTICAL_EXAMPLES.md` - Example 2 (login)

**❓ How do I debug a rating update issue?**
→ `doc/modelDocs/reviewModel.md` - Check hooks
→ `doc/modelDocs/tourModel.md` - Check auto-update section
→ `doc/PRACTICAL_EXAMPLES.md` - Example 3

**❓ How do I fix "No document found"?**
→ `doc/PRACTICAL_EXAMPLES.md` - Debugging section

**❓ How do I fix "Permission denied"?**
→ `doc/PRACTICAL_EXAMPLES.md` - Debugging section

---

## 🗂️ File Organization

### Main Documentation

```
doc/
├── README.md ..................... Summary of all docs
├── ARCHITECTURE.md ............... Complete overview
├── PRACTICAL_EXAMPLES.md ......... Real request flows
├── INDEX.md ...................... Navigation guide
├── QUICK_START.md ................ This file!
```

### Routes Documentation

```
doc/routesDocs/
├── tourRoutes.md ................. 8 tour endpoints
├── userRoutes.md ................. 13 user endpoints
└── reviewRoutes.md ............... 5 review endpoints
```

### Models Documentation

```
doc/modelDocs/
├── tourModel.md .................. Tour data structure
├── userModel.md .................. User data structure
└── reviewModel.md ................ Review data structure
```

### Controllers Documentation

```
doc/controllerDocs/
├── handlerFactory.md ............. CRUD factory functions (IMPORTANT!)
├── authController.md ............. Authentication
├── tourController.md ............. Tour operations
├── userController.md ............. User operations
├── reviewController.md ........... Review operations
└── errorController.md ............ Error handling
```

---

## 🎯 Quick Reference Tables

### Routes by Entity

**Tour Routes (8 total)**
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| /top-5-cheap | GET | No | Deals |
| /tour-stats | GET | No | Stats |
| /monthly-plan/:year | GET | Yes | Schedule |
| / | GET | No | All tours |
| / | POST | Yes* | Create |
| /:id | GET | No | Details |
| /:id | PATCH | Yes* | Update |
| /:id | DELETE | Yes\* | Delete |

**User Routes (13 total)**
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| /signup | POST | No | Register |
| /login | POST | No | Login |
| /forgotPassword | POST | No | Reset request |
| /resetPassword/:token | PATCH | No | Reset |
| /updatePassword | PATCH | Yes | Change password |
| /me | GET | Yes | Own profile |
| /updateMe | PATCH | Yes | Update profile |
| /deleteMe | DELETE | Yes | Deactivate |
| / | GET | Yes† | All users |
| / | POST | Yes† | Create user |
| /:id | GET | Yes† | User details |
| /:id | PATCH | Yes† | Update user |
| /:id | DELETE | Yes† | Delete user |

\*Admin or Lead-guide role required
†Admin only

**Review Routes (5 total)**
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| / | GET | No | All reviews |
| / | POST | Yes | Create review |
| /:id | GET | No | Single review |
| /:id | PATCH | Yes | Update review |
| /:id | DELETE | Yes | Delete review |

### Factory Functions

| Function  | Creates | Returns      | Use For            |
| --------- | ------- | ------------ | ------------------ |
| deleteOne | Handler | 204          | Delete by ID       |
| updateOne | Handler | Updated doc  | Update by ID       |
| createOne | Handler | New doc, 201 | Create new         |
| getOne    | Handler | Document     | Get single         |
| getAll    | Handler | Array        | Get all (filtered) |

### Model Fields by Type

**Tour Fields**

- Text: name, slug, summary, description, imageCover
- Number: duration, maxGroupSize, price, priceDiscount, ratingsAverage, ratingsQuantity
- String: difficulty (enum)
- Array: images, startDates
- Boolean: secretTour
- Date: createdAt

**User Fields**

- Text: name, email, photo, role
- String (hidden): password, passwordResetToken
- Date: passwordChangedAt, passwordResetExpires
- Boolean (hidden): active

**Review Fields**

- Text: review
- Number: rating
- ObjectId: tourId, userId
- Date: createdAt

---

## 💡 Common Scenarios

### "I need to understand how X works"

1. Find X in list above → Links to correct doc
2. Read relevant section
3. Check PRACTICAL_EXAMPLES.md for real flow
4. Reference relevant code section

### "I need to add feature Y"

1. Find similar existing feature
2. Copy-paste pattern from relevant docs
3. Update relevant documentation
4. Test with examples from PRACTICAL_EXAMPLES.md

### "I have error message Z"

1. Identify what part is failing (route, model, controller)
2. Go to relevant doc (routesDocs, modelDocs, controllerDocs)
3. Read the error handling section
4. Check PRACTICAL_EXAMPLES.md Debugging section

---

## 📚 Reading Order by Role

### For Frontend Developer

```
1. ARCHITECTURE.md - Understand entities
2. tourRoutes.md - Learn endpoints to call
3. userRoutes.md - Learn auth endpoints
4. PRACTICAL_EXAMPLES.md - See request/response format
5. Specific routesDocs as needed
```

### For Backend Developer

```
1. ARCHITECTURE.md - Complete picture
2. PRACTICAL_EXAMPLES.md - Real flows
3. handlerFactory.md - Understand patterns
4. Specific modelDocs/controllerDocs as needed
5. routesDocs for context
```

### For New Contributor

```
1. README.md - Overview
2. ARCHITECTURE.md - Big picture
3. PRACTICAL_EXAMPLES.md - See real examples
4. modelDocs - Understand data
5. controllerDocs/routesDocs - See implementation
6. handlerFactory.md - Learn patterns
```

### For DevOps/Infrastructure

```
1. ARCHITECTURE.md - System design
2. Models section - Database schema
3. Routes section - HTTP endpoints
4. Security section - Security considerations
```

---

## ✅ Checklist: What Documentation Covers

- ✅ **26 endpoints** - All routes documented
- ✅ **3 models** - All data structures explained
- ✅ **6 controllers** - All handlers documented
- ✅ **5 factory functions** - CRUD patterns
- ✅ **6 real examples** - Request flows shown
- ✅ **15+ reference tables** - Quick lookup
- ✅ **Security patterns** - Explained throughout
- ✅ **Validation rules** - All documented
- ✅ **Error handling** - Coverage shown
- ✅ **Common issues** - Debugging guide

---

## 🚀 Next Steps

1. **Bookmark this file** - Use for quick navigation
2. **Read ARCHITECTURE.md** - Complete overview
3. **Read PRACTICAL_EXAMPLES.md** - See real flows
4. **Reference specific docs** - As you code
5. **Keep documentation updated** - When you change code

---

## 💬 Need Help?

**Understanding a concept?**
→ Search this file for keywords
→ Go to linked doc
→ Read that section
→ Check PRACTICAL_EXAMPLES.md for real example

**Can't find what you need?**
→ Check INDEX.md for full listing
→ Check README.md for summary
→ Read ARCHITECTURE.md for overview

**Having an issue?**
→ Go to PRACTICAL_EXAMPLES.md Debugging section
→ Or check relevant routesDocs/modelDocs/controllerDocs

---

Good luck with development! The documentation is designed to help you code faster and understand the system better. 🚀

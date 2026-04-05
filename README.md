# Natours - Tour Booking Application

A full-stack tour booking application built with Node.js, Express, and MongoDB. The application provides a complete REST API with server-side rendered views, user authentication, tour management, and reviews system.

## 🚀 Quick Start

### Prerequisites

- Node.js v14+
- MongoDB
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Create a `config.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DATABASE=mongodb://localhost:27017/natours
DATABASE_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=90d
EMAIL_USERNAME=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Running the Project

```bash
# Development mode
npm start

# Production mode
npm run start:prod

# Debug mode
npm run debug

# Run tests
npm test
```

## 📁 Project Structure

```
.
├── controllers/          # Business logic & request handlers
│   ├── authController.js
│   ├── tourController.js
│   ├── userController.js
│   ├── reviewController.js
│   ├── viewsController.js
│   ├── errorController.js
│   └── handlerFactory.js (reusable CRUD operations)
├── models/              # Mongoose schemas
│   ├── tourModel.js
│   ├── userModel.js
│   └── reviewModel.js
├── routes/              # API route definitions
│   ├── tourRoutes.js
│   ├── userRoutes.js
│   ├── reviewRoutes.js
│   └── viewRoutes.js
├── views/               # Pug templates
│   ├── base.pug         # Base layout
│   ├── overview.pug     # Tours listing page
│   ├── tour.pug         # Tour detail page
│   ├── login.pug        # Login page
│   ├── account.pug      # User account page
│   └── error.pug        # Error pages
├── public/              # Static files
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side scripts
│   └── img/             # Images
├── utils/               # Utility functions
├── tests/               # Test files
├── app.js               # Express app configuration
└── server.js            # Server entry point
```

## ⚙️ Key Features

### Authentication & Authorization

- JWT-based authentication
- Password reset via email
- Role-based access control (admin, guide, user)
- Protected routes and endpoints

### Tour Management

- CRUD operations for tours
- Advanced filtering and pagination
- Sorting by price, rating, duration
- Full-text search capabilities

### Reviews System

- Users can review tours
- Rating calculations
- Review pagination
- Admin moderation

### Security

- Helmet - HTTP header security
- Rate limiting - prevent brute-force attacks
- MongoDB injection prevention
- XSS protection
- HPP (HTTP Parameter Pollution) protection
- Password encryption with bcryptjs

### Frontend

- Server-side rendered pages with Pug
- Responsive design
- Form validation
- User profile management
- Tour booking interface

## 📚 Available Scripts

```bash
npm start           # Development server with auto-reload
npm run start:prod  # Production server
npm run debug       # Debug with ndb
npm run watch:js    # Watch and bundle JavaScript
npm run build:js    # Build production JavaScript
npm test            # Run test suite
npm run import-data # Import sample data to MongoDB
npm run delete-data # Delete all data from MongoDB
```

## 🛠️ Technology Stack

**Backend:**

- Node.js
- Express.js
- MongoDB & Mongoose ODM
- JWT for authentication
- Bcryptjs for password hashing
- Nodemailer for emails

**Frontend:**

- Pug template engine
- CSS
- Vanilla JavaScript
- Parcel bundler

**Development:**

- Nodemon (auto-reload during development)
- ESLint (code quality)
- Jest (testing)
- NDB (Node debugger)

**Middleware & Security:**

- Helmet.js
- Express-rate-limit
- Express-mongo-sanitize
- xss-clean
- hpp (HTTP Parameter Pollution protection)
- Morgan (HTTP logging)

## 📝 API Endpoints Summary

### Tours

- `GET /api/v1/tours` - Get all tours
- `GET /api/v1/tours/:id` - Get tour details
- `POST /api/v1/tours` - Create tour (admin)
- `PATCH /api/v1/tours/:id` - Update tour (admin)
- `DELETE /api/v1/tours/:id` - Delete tour (admin)

### Users

- `POST /api/v1/users/signup` - Register new user
- `POST /api/v1/users/login` - Login user
- `POST /api/v1/users/forgotPassword` - Request password reset
- `PATCH /api/v1/users/resetPassword/:token` - Reset password
- `PATCH /api/v1/users/updateMyPassword` - Change password
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/updateMe` - Update user profile

### Reviews

- `GET /api/v1/reviews` - Get all reviews
- `POST /api/v1/reviews` - Create review
- `PATCH /api/v1/reviews/:id` - Update review (admin)
- `DELETE /api/v1/reviews/:id` - Delete review (admin)

## 🎓 Learning Notes

This project demonstrates:

- MVC architecture pattern
- RESTful API design principles
- JWT authentication workflow
- Mongoose ODM best practices
- Factory pattern for reusable handlers
- Error handling and validation
- Security best practices in Node.js
- Server-side rendering with templates

## 📄 License

ISC

## 👤 Author

Jatin Paridal

## 🎯 Key Concepts Emphasized Throughout

### **1. Routes & Middleware**

- Routes match URL patterns
- Middleware stacks (protect → restrictTo → handler)
- Route ordering matters!
- Nested routes pass parent IDs

### **2. Models & Auto-Updates**

- Pre-save hooks hash passwords, generate slugs
- Pre-find hooks hide inactive users
- Post-save hooks auto-update related documents
- Reviews automatically update tour ratings

### **3. Factory Functions**

- Eliminate code duplication
- 5 reusable factory functions
- Used for most CRUD operations
- Special nested route handling

### **4. Security Patterns**

- Password hashing (bcrypt)
- Field filtering (updateMe only allows name/email)
- Soft delete (active: false)
- Middleware chains (protect → restrictTo)
- Token-based authentication (JWT)

### **5. Data Integrity**

- Validation at model level
- Hooks ensure consistency
- Auto-updates prevent manual mistakes
- Cascading updates (review → tour rating)

---

**Happy Coding! 🚀**

---

# User API Test Suite Documentation

This document explains the test suite in [tests/user.test.js](../tests/user.test.js). It covers what the tests do, the tech used, and how the pieces work together.

## Purpose of the test file

The test suite validates user-related API routes. It exercises public auth routes (signup/login/logout), protected user routes (/me, updateMe, updateMyPassword, deleteMe), and admin-only routes (/api/v1/users and /api/v1/users/:id). It uses an in-memory MongoDB instance to avoid touching real data.

## Technologies used

### Jest (test runner)

- Jest discovers and runs tests defined with `describe()` and `it()` blocks.
- Lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`) manage setup and teardown.
- Assertions use `expect()` to validate responses.

Why it is used:

- Provides a clean structure for grouping tests.
- Handles async tests easily with `async/await`.
- Built-in mocking support.

How it works here:

- Each `describe` group targets one route.
- `it` blocks assert on HTTP status codes and response bodies.

### Supertest (HTTP testing)

- Supertest sends HTTP requests to an Express app without starting a real server.

Why it is used:

- Makes API testing fast and simple.
- Works directly with the Express `app` instance.

How it works here:

- `request(app)` builds a client for the Express app.
- Requests are sent with `.get()`, `.post()`, `.patch()`, `.delete()`.
- Headers and bodies are set with `.set()` and `.send()`.

### mongodb-memory-server (ephemeral MongoDB)

- Starts a temporary MongoDB server in memory for tests.

Why it is used:

- Isolates tests from real databases.
- Provides a clean database for each test run.

How it works here:

- `MongoMemoryServer.create()` returns a running instance.
- `mongoServer.getUri()` provides the connection string.
- Mongoose connects to that URI.
- After tests, the server is stopped.

### Mongoose (ODM)

- Mongoose models map MongoDB documents to JS objects.

Why it is used:

- The app already uses Mongoose models.
- Tests can create users directly with `User.create()`.

How it works here:

- The `User` model seeds admin and test users.
- Model methods like `findById` validate deletes.

### dotenv (env loading)

- Loads environment variables from `config.env`.

Why it is used:

- Auth controllers require `JWT_SECRET` and other env vars.

How it works here:

- `dotenv.config()` is called in `beforeAll`.
- That allows JWT creation during login requests.

### Jest module mocking

- `jest.mock('../utils/email', () => jest.fn())` mocks email sending.

Why it is used:

- Prevents real emails from being sent during tests.
- Allows inspection of email content for password reset flow.

How it works here:

- `sendEmail` becomes a mock function.
- Tests read `sendEmail.mock.calls` to extract the reset token.
- `beforeEach` clears mock state with `mockClear()`.

## Test flow overview

### 1) Test setup

- `beforeAll` does the heavy setup:

  - Load env vars.
  - Start in-memory MongoDB.
  - Connect Mongoose.
  - Create an admin user.
  - Log the admin in to get a JWT token.

- `afterAll` cleans up:

  - Disconnect Mongoose.
  - Stop MongoDB.

- `beforeEach` resets email mock state.

### 2) Helper utilities

- `buildUserPayload` creates unique test user data.
  - Uses timestamp + random hex to avoid duplicate emails.
- `createUserAndLogin` seeds a user and logs in to return:
  - `user` (mongoose doc)
  - `token` (JWT)
  - `credentials` (raw payload)

### 3) Route coverage

#### GET /api/v1/users

- Uses admin JWT.
- Asserts status code 200 and JSend envelope.
- Validates list length and user shape.

#### POST /api/v1/users/signup

- Sends a new user payload.
- Expects 201 and a JWT.

#### POST /api/v1/users/login

- Logs in with valid credentials.
- Expects 200 and a JWT.

#### GET /api/v1/users/logout

- Calls logout route.
- Expects 200 and `status: success`.

#### POST /api/v1/users/forgotPassword

- Sends a valid email.
- Expects 200 and a call to `sendEmail`.
- Extracts reset token from the mocked email content.

#### PATCH /api/v1/users/resetPassword/:token

- Uses token from the mocked email.
- Sets a new password.
- Expects 200 and a JWT.
- Verifies login with the new password works.

#### PATCH /api/v1/users/updateMyPassword

- Sends current password and new password.
- Expects 200 and a JWT.
- Verifies login with the new password works.

#### GET /api/v1/users/me

- Fetches the current user profile using a JWT.
- Expects 200 and correct user id.

#### PATCH /api/v1/users/updateMe

- Updates allowed fields only.
- Expects 200 and updated name.
- Rejects password changes with 400.

#### DELETE /api/v1/users/deleteMe

- Soft deletes a user (sets active = false).
- Expects 204.
- Subsequent /me call returns 401 because user is inactive.

#### Admin routes

- POST /api/v1/users returns 500 because createUser is disabled.
- GET /api/v1/users/:id returns correct user.
- PATCH /api/v1/users/:id updates user fields.
- DELETE /api/v1/users/:id removes user document.

## Security and auth behavior

The tests validate auth flows based on JWTs:

- `Authorization: Bearer <token>` is required for protected routes.
- Admin-only routes use the admin token.
- Password reset flow uses a one-time token from the mocked email.

## How to run

- Run all tests:

  - `npm test`

- Run only this file:
  - `npx jest tests/user.test.js`

## Notes and limitations

- Tests mock email sending; no real email is sent.
- The database is in-memory, so all data is wiped after tests.
- The `logout` test only checks response; cookie clearing is not deeply validated.
- The admin create route is intentionally expected to fail (per controller logic).

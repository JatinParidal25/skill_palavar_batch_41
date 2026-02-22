/*eslint-disable*/

const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');
const request = require('supertest');
const app = require('../app');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');

jest.mock('../utils/email', () => jest.fn());

let mongoServer;
let adminToken;
let adminUserId;

const buildUserPayload = (overrides = {}) => ({
  name: 'Test User',
  email: `user_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}@example.com`,
  password: 'pass1234',
  passwordConfirm: 'pass1234',
  role: 'user',
  ...overrides
});

const createUserAndLogin = async overrides => {
  const payload = buildUserPayload(overrides);
  const createdUser = await User.create(payload);

  const loginRes = await request(app)
    .post('/api/v1/users/login')
    .send({ email: payload.email, password: payload.password });

  return {
    user: createdUser,
    token: loginRes.body.token,
    credentials: payload
  };
};

beforeAll(async () => {
  dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const adminPayload = buildUserPayload({
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin'
  });

  const adminUser = await User.create(adminPayload);
  adminUserId = adminUser._id.toString();

  const loginRes = await request(app)
    .post('/api/v1/users/login')
    .send({ email: adminPayload.email, password: adminPayload.password });

  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(() => {
  sendEmail.mockClear();
});

// Test for GET /api/v1/users
describe('GET /api/v1/users', () => {
  // Verifies the admin can list users with JSend response shape.
  it('should return users in the correct JSend format', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`);

    // 1. Test Status Code
    expect(res.statusCode).toBe(200);

    // 2. Test the Envelope structure
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('data');

    // 3. Test the Data Integrity
    const users = res.body.data.data;
    expect(Array.isArray(users)).toBe(true);
    expect(res.body.results).toBe(users.length);

    // 4. Test a specific user object shape (e.g., the first user)
    if (users.length > 0) {
      expect(users[0]).toMatchObject({
        _id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        role: expect.stringMatching(/admin|user|guide|lead-guide/),
        photo: expect.any(String)
      });
    }
  });
});

describe('POST /api/v1/users/signup', () => {
  // Ensures signup creates a new user and returns a token.
  it('should create a user and return a token', async () => {
    const payload = buildUserPayload({
      name: 'Signup User',
      email: `signup_${Date.now()}@example.com`
    });

    const res = await request(app)
      .post('/api/v1/users/signup')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(payload.email);
  });
});

describe('POST /api/v1/users/login', () => {
  // Confirms login returns a JWT for valid credentials.
  it('should login an existing user and return a token', async () => {
    const { credentials } = await createUserAndLogin({
      email: `login_${Date.now()}@example.com`
    });

    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('token');
  });
});

describe('GET /api/v1/users/logout', () => {
  // Checks logout clears auth state and responds successfully.
  it('should clear the jwt cookie and return success', async () => {
    const res = await request(app).get('/api/v1/users/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
  });
});

describe('POST /api/v1/users/forgotPassword', () => {
  // Validates reset token email is sent for an existing user.
  it('should send a reset token email for valid user', async () => {
    const { credentials } = await createUserAndLogin({
      email: `forgot_${Date.now()}@example.com`
    });

    const res = await request(app)
      .post('/api/v1/users/forgotPassword')
      .send({ email: credentials.email });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].message).toContain('/resetPassword/');
  });
});

describe('PATCH /api/v1/users/resetPassword/:token', () => {
  // Uses reset token to set a new password and allow re-login.
  it('should reset password using the reset token', async () => {
    const { credentials } = await createUserAndLogin({
      email: `reset_${Date.now()}@example.com`
    });

    await request(app)
      .post('/api/v1/users/forgotPassword')
      .send({ email: credentials.email });

    const emailMessage = sendEmail.mock.calls[0][0].message;
    const tokenMatch = emailMessage.match(/resetPassword\/(.+)$/);
    expect(tokenMatch).not.toBeNull();

    const resetToken = tokenMatch[1];

    const res = await request(app)
      .patch(`/api/v1/users/resetPassword/${resetToken}`)
      .send({ password: 'newpass123', passwordConfirm: 'newpass123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('token');

    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: credentials.email, password: 'newpass123' });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
  });
});

describe('PATCH /api/v1/users/updateMyPassword', () => {
  // Updates current password and verifies new login succeeds.
  it('should update the current user password', async () => {
    const { credentials, token } = await createUserAndLogin({
      email: `updatepass_${Date.now()}@example.com`
    });

    const res = await request(app)
      .patch('/api/v1/users/updateMyPassword')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordCurrent: credentials.password,
        password: 'pass5678',
        passwordConfirm: 'pass5678'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('token');

    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: credentials.email, password: 'pass5678' });

    expect(loginRes.statusCode).toBe(200);
  });
});

describe('GET /api/v1/users/me', () => {
  // Returns the logged-in user's profile via the /me shortcut.
  it('should return the current user profile', async () => {
    const { user, token } = await createUserAndLogin({
      email: `me_${Date.now()}@example.com`
    });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data.data._id).toBe(user._id.toString());
  });
});

describe('PATCH /api/v1/users/updateMe', () => {
  // Allows updating safe fields like name/email/photo.
  it('should update allowed fields for the current user', async () => {
    const { token } = await createUserAndLogin({
      email: `updateme_${Date.now()}@example.com`
    });

    const res = await request(app)
      .patch('/api/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  // Rejects password changes on the general profile update route.
  it('should reject password updates on updateMe', async () => {
    const { token } = await createUserAndLogin({
      email: `updateblock_${Date.now()}@example.com`
    });

    const res = await request(app)
      .patch('/api/v1/users/updateMe')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'pass9999', passwordConfirm: 'pass9999' });

    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/users/deleteMe', () => {
  // Soft-deletes the user and blocks subsequent authenticated access.
  it('should deactivate the current user', async () => {
    const { token } = await createUserAndLogin({
      email: `deleteme_${Date.now()}@example.com`
    });

    const res = await request(app)
      .delete('/api/v1/users/deleteMe')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(204);

    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(401);
  });
});

describe('Admin user routes', () => {
  // Ensures admin create route is disabled and returns an error.
  it('should reject creating a user with POST /api/v1/users', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        buildUserPayload({ email: `admincreate_${Date.now()}@example.com` })
      );

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('status', 'error');
  });

  // Allows admin to fetch a user by id.
  it('should get a user by id', async () => {
    const target = await User.create(
      buildUserPayload({ email: `adminget_${Date.now()}@example.com` })
    );

    const res = await request(app)
      .get(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data.data._id).toBe(target._id.toString());
  });

  // Allows admin to update a user by id.
  it('should update a user by id', async () => {
    const target = await User.create(
      buildUserPayload({ email: `adminpatch_${Date.now()}@example.com` })
    );

    const res = await request(app)
      .patch(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Updated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.data.name).toBe('Admin Updated');
  });

  // Allows admin to delete a user by id.
  it('should delete a user by id', async () => {
    const target = await User.create(
      buildUserPayload({ email: `admindelete_${Date.now()}@example.com` })
    );

    const res = await request(app)
      .delete(`/api/v1/users/${target._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(204);

    const deleted = await User.findById(target._id);
    expect(deleted).toBeNull();
  });
});

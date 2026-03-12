/**
 * tests/unit/middleware/auth.test.js
 * Unit tests for authentication middleware
 */

const admin = require('firebase-admin');
const { verifyToken, verifyOwnership, requireAdmin, optionalAuth } = require('../../../src/middleware/auth');

describe('Auth Middleware', () => {

  // ==================== verifyToken ====================
  describe('verifyToken', () => {
    it('should call next() with user attached when token is valid', async () => {
      const req = mockReq({
        headers: { authorization: 'Bearer valid-token-123' }
      });
      const res = mockRes();
      const next = mockNext();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'user-abc',
        email: 'user@test.com',
        email_verified: true
      });

      await verifyToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual({
        uid: 'user-abc',
        email: 'user@test.com',
        emailVerified: true
      });
    });

    it('should return 401 when no Authorization header is present', async () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      const next = mockNext();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const req = mockReq({ headers: { authorization: 'Basic some-token' } });
      const res = mockRes();
      const next = mockNext();

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with TOKEN_EXPIRED code when token is expired', async () => {
      const req = mockReq({
        headers: { authorization: 'Bearer expired-token' }
      });
      const res = mockRes();
      const next = mockNext();

      const expiredError = new Error('Token expired');
      expiredError.code = 'auth/id-token-expired';
      mockAuth.verifyIdToken.mockRejectedValue(expiredError);

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TOKEN_EXPIRED' })
      );
    });

    it('should return 401 with INVALID_TOKEN code for malformed token', async () => {
      const req = mockReq({
        headers: { authorization: 'Bearer bad-token' }
      });
      const res = mockRes();
      const next = mockNext();

      const argError = new Error('Bad token');
      argError.code = 'auth/argument-error';
      mockAuth.verifyIdToken.mockRejectedValue(argError);

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' })
      );
    });
  });

  // ==================== verifyOwnership ====================
  describe('verifyOwnership', () => {
    it('should call next() when userId param matches authenticated user', () => {
      const req = mockReq({
        params: { userId: 'test-user-123' },
        user: { uid: 'test-user-123' }
      });
      const res = mockRes();
      const next = mockNext();

      verifyOwnership(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when userId param does not match authenticated user', () => {
      const req = mockReq({
        params: { userId: 'other-user-999' },
        user: { uid: 'test-user-123' }
      });
      const res = mockRes();
      const next = mockNext();

      verifyOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, code: 'FORBIDDEN' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should check body.userId if params.userId is not present', () => {
      const req = mockReq({
        params: {},
        body: { userId: 'test-user-123' },
        user: { uid: 'test-user-123' }
      });
      const res = mockRes();
      const next = mockNext();

      verifyOwnership(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== requireAdmin ====================
describe('requireAdmin', () => {
  it('should call next() when user has admin custom claim', async () => {
    const req = mockReq({ user: { uid: 'admin-123' } });
    const res = mockRes();
    const next = mockNext();

    // Mock getUser to return admin claim
    mockAuth.getUser.mockResolvedValue({
      customClaims: { admin: true }
    });

    await requireAdmin(req, res, next); // async!

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should return 403 when user does not have admin claim', async () => {
    const req = mockReq({ user: { uid: 'regular-user' } });
    const res = mockRes();
    const next = mockNext();

    mockAuth.getUser.mockResolvedValue({
      customClaims: { admin: false }
    });

    await requireAdmin(req, res, next); // async!

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

  // ==================== optionalAuth ====================
  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      const req = mockReq({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = mockRes();
      const next = mockNext();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'user-abc',
        email: 'user@test.com',
        email_verified: true
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should still call next() without user if no token provided', async () => {
      const req = mockReq({ headers: {}, user: undefined }); // ← add user: undefined
      const res = mockRes();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });

    it('should still call next() if token verification fails', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid' }, user: undefined }); // ← add user: undefined
      const res = mockRes();
      const next = mockNext();

      mockAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });
  });

});

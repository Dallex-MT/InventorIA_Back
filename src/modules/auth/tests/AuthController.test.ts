import { AuthController } from '../controllers/AuthController';
import { UsuarioService } from '../services/UsuarioService';
import { EmailService } from '../../../shared/services/EmailService';
import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../../../shared/utils/jwt';
import { hashPassword } from '../../../shared/utils/password';

// Mocks
jest.mock('../services/UsuarioService');
jest.mock('../../../shared/services/EmailService');
jest.mock('../../../shared/utils/jwt');
jest.mock('../../../shared/utils/password');

describe('AuthController - Password Reset', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    authController = new AuthController();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    } as Partial<Response>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should return 400 if email is missing', async () => {
      mockRequest = { body: {} };
      await authController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 200 even if user not found (security)', async () => {
      mockRequest = { body: { email: 'nonexistent@example.com' } };
      (UsuarioService.prototype.findByEmail as jest.Mock).mockResolvedValue(null);

      await authController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(EmailService.prototype.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should generate token and send email if user exists', async () => {
      mockRequest = { body: { email: 'user@example.com' } };
      const mockUser = { id: 1, cedula: '123', nombre_usuario: 'user', rol_id: 2 };
      (UsuarioService.prototype.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('mock_token');

      await authController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(generateToken).toHaveBeenCalled();
      expect(EmailService.prototype.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', 'mock_token');
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should return 400 if token or newPassword missing', async () => {
      mockRequest = { body: { token: 'token' } }; // missing password
      await authController.resetPassword(mockRequest as Request, mockResponse as Response);
      expect(statusMock).toHaveBeenCalledWith(400);

      mockRequest = { body: { newPassword: 'pass' } }; // missing token
      await authController.resetPassword(mockRequest as Request, mockResponse as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 if token is invalid', async () => {
      mockRequest = { body: { token: 'invalid', newPassword: 'pass' } };
      (verifyToken as jest.Mock).mockImplementation(() => { throw new Error('Invalid'); });

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should update password if token is valid', async () => {
      mockRequest = { body: { token: 'valid', newPassword: 'pass' } };
      (verifyToken as jest.Mock).mockReturnValue({ userId: 1 });
      (hashPassword as jest.Mock).mockResolvedValue('hashed_pass');

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(UsuarioService.prototype.updatePassword).toHaveBeenCalledWith(1, 'hashed_pass');
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});

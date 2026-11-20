import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DatabaseError,
  ErrorCode,
  NotFoundError,
  StellarError,
  ValidationError,
} from './app.error';

/**
 * Pins the error-to-status mapping the global exception filter relies on (#1472).
 */
describe('AppError subclasses (#1472)', () => {
  it.each([
    ['ValidationError', new ValidationError('bad'), ErrorCode.VALIDATION_ERROR, 400],
    ['AuthenticationError', new AuthenticationError(), ErrorCode.AUTHENTICATION_ERROR, 401],
    ['AuthorizationError', new AuthorizationError(), ErrorCode.AUTHORIZATION_ERROR, 403],
    ['NotFoundError', new NotFoundError('Course'), ErrorCode.NOT_FOUND, 404],
    ['ConflictError', new ConflictError('duplicate'), ErrorCode.CONFLICT, 409],
    ['StellarError', new StellarError('rpc unavailable'), ErrorCode.STELLAR_ERROR, 500],
    ['DatabaseError', new DatabaseError('db unavailable'), ErrorCode.DATABASE_ERROR, 500],
  ])('%s carries its code and HTTP status', (_name, error, code, status) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(status);
  });

  it('defaults a plain AppError to 500', () => {
    expect(new AppError(ErrorCode.INTERNAL_ERROR, 'unexpected').statusCode).toBe(500);
  });
});

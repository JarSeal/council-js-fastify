import { validatePublicSignup } from './validation';

describe('validation util', () => {
  const validationOptions = {
    minUsernameLength: 2,
    maxUsernameLength: 12,
    minPassLength: 8,
    maxPassLength: 12,
  };

  it('should validate the publicSignUp body successfully', () => {
    const validation = validatePublicSignup(
      {
        username: 'myusername',
        pass: 'somepass',
        email: 'a@a.com',
      },
      null,
      validationOptions
    );
    expect(validation).toBe(null);
  });

  it('should validate the publicSignUp body and return username too long error', () => {
    const validation = validatePublicSignup(
      {
        username: 'myusernameistoolong',
        pass: 'somepass',
        email: 'a@a.com',
      },
      null,
      validationOptions
    );
    expect(validation?.statusCode).toBe(400);
    expect(validation?.code).toBe('COUNCL_ERR_VALIDATE');
    expect(validation?.message).toBe(
      'New user validation failed: Username is too long, maximum is 12 characters.'
    );
  });

  it('should validate the publicSignUp body and return username too short error', () => {
    const validation = validatePublicSignup(
      {
        username: 'm',
        pass: 'somepass',
        email: 'a@a.com',
      },
      null,
      validationOptions
    );
    expect(validation?.statusCode).toBe(400);
    expect(validation?.code).toBe('COUNCL_ERR_VALIDATE');
    expect(validation?.message).toBe(
      'New user validation failed: Username is too short, minimum is 2 characters.'
    );
  });

  it('should validate the publicSignUp body and return password too long error', () => {
    const validation = validatePublicSignup(
      {
        username: 'mysusername',
        pass: 'somepasswordthatistoolong',
        email: 'a@a.com',
      },
      null,
      validationOptions
    );
    expect(validation?.statusCode).toBe(400);
    expect(validation?.code).toBe('COUNCL_ERR_VALIDATE');
    expect(validation?.message).toBe(
      'New user validation failed: Password is too long, maximum is 12 characters.'
    );
  });

  it('should validate the publicSignUp body and return password too short error', () => {
    const validation = validatePublicSignup(
      {
        username: 'mysusername',
        pass: 's',
        email: 'a@a.com',
      },
      null,
      validationOptions
    );
    expect(validation?.statusCode).toBe(400);
    expect(validation?.code).toBe('COUNCL_ERR_VALIDATE');
    expect(validation?.message).toBe(
      'New user validation failed: Password is too short, minimum is 8 characters.'
    );
  });

  it('should validate the publicSignUp body and return username taken error', () => {
    const validation = validatePublicSignup(
      {
        username: 'myusername',
        pass: 'somepass',
        email: 'a@a.com',
      },
      {
        simpleId: 'myusername',
        emails: [
          {
            email: 'a@a.com',
            verified: false,
            token: { token: null, tokenId: null },
            added: new Date(),
          },
        ],
        passwordHash: 'jkfasjkfsajkfs',
        created: {
          user: null,
          publicForm: true,
          date: new Date(),
        },
        edited: [],
      },
      validationOptions
    );
    expect(validation?.statusCode).toBe(400);
    expect(validation?.code).toBe('USERNAME_TAKEN');
    expect(validation?.message).toBe("Username 'myusername' is taken");
  });
});

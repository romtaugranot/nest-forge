import {
  deriveBaseName,
  deriveKebabBase,
  camelToScreamingSnake,
  pascalToKebab,
} from './derive-names';

describe('deriveBaseName', () => {
  it('should strip "Service" suffix from PascalCase name', () => {
    expect(deriveBaseName('user-service')).toBe('User');
  });

  it('should keep name intact when no "Service" suffix exists', () => {
    expect(deriveBaseName('payment-gateway')).toBe('PaymentGateway');
  });

  it('should handle multi-word service names', () => {
    expect(deriveBaseName('ssh-session-service')).toBe('SshSession');
  });

  it('should handle already PascalCase input', () => {
    expect(deriveBaseName('UserService')).toBe('User');
  });

  it('should handle single word without Service suffix', () => {
    expect(deriveBaseName('auth')).toBe('Auth');
  });
});

describe('deriveKebabBase', () => {
  it('should convert service title to kebab-case without "service" suffix', () => {
    expect(deriveKebabBase('user-service')).toBe('user');
  });

  it('should convert multi-word titles to kebab-case', () => {
    expect(deriveKebabBase('payment-gateway')).toBe('payment-gateway');
  });

  it('should handle ssh-style prefixes', () => {
    expect(deriveKebabBase('ssh-session-service')).toBe('ssh-session');
  });
});

describe('camelToScreamingSnake', () => {
  it('should convert camelCase to SCREAMING_SNAKE_CASE', () => {
    expect(camelToScreamingSnake('createSession')).toBe('CREATE_SESSION');
  });

  it('should convert single word', () => {
    expect(camelToScreamingSnake('list')).toBe('LIST');
  });

  it('should handle multiple word boundaries', () => {
    expect(camelToScreamingSnake('getUserById')).toBe('GET_USER_BY_ID');
  });

  it('should handle already uppercase input', () => {
    expect(camelToScreamingSnake('API')).toBe('API');
  });
});

describe('pascalToKebab', () => {
  it('should convert PascalCase to kebab-case', () => {
    expect(pascalToKebab('UserInfo')).toBe('user-info');
  });

  it('should handle consecutive uppercase letters', () => {
    expect(pascalToKebab('SshSession')).toBe('ssh-session');
  });

  it('should handle single word', () => {
    expect(pascalToKebab('User')).toBe('user');
  });

  it('should handle multi-word names', () => {
    expect(pascalToKebab('PaymentGatewayConfig')).toBe('payment-gateway-config');
  });
});

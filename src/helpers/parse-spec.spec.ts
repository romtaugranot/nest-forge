import { parseSpec, isYamlContent } from './parse-spec';

describe('isYamlContent', () => {
  it('should return false for valid JSON', () => {
    const json = JSON.stringify({ openapi: '3.0.0', info: { title: 'Test' } });
    expect(isYamlContent(json)).toBe(false);
  });

  it('should return true for YAML content', () => {
    const yaml = 'openapi: "3.0.0"\ninfo:\n  title: Test\n';
    expect(isYamlContent(yaml)).toBe(true);
  });

  it('should return true for content that is not valid JSON', () => {
    expect(isYamlContent('not json at all')).toBe(true);
  });
});

describe('parseSpec', () => {
  it('should parse valid JSON', () => {
    const input = JSON.stringify({ openapi: '3.0.0', info: { title: 'My API' } });
    const result = parseSpec(input) as Record<string, unknown>;
    expect(result).toEqual({ openapi: '3.0.0', info: { title: 'My API' } });
  });

  it('should parse valid YAML', () => {
    const yaml = 'openapi: "3.0.0"\ninfo:\n  title: My API\n';
    const result = parseSpec(yaml) as Record<string, unknown>;
    expect(result).toEqual({ openapi: '3.0.0', info: { title: 'My API' } });
  });

  it('should prefer JSON parsing when content is valid JSON', () => {
    const json = '{"key": "value"}';
    const result = parseSpec(json);
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse YAML with OpenAPI structures', () => {
    const yaml = [
      'openapi: "3.0.0"',
      'info:',
      '  title: user-service',
      '  version: "1.0.0"',
      'paths:',
      '  /users:',
      '    get:',
      '      operationId: getUsers',
      '      responses:',
      '        "200":',
      '          description: Success',
    ].join('\n');

    const result = parseSpec(yaml) as Record<string, unknown>;
    expect((result.info as Record<string, unknown>).title).toBe('user-service');
  });

  it('should throw for content that is neither valid JSON nor YAML', () => {
    const invalidContent = '{{{{invalid: [[[';
    expect(() => parseSpec(invalidContent)).toThrow(
      'Failed to parse OpenAPI spec: content is neither valid JSON nor valid YAML',
    );
  });
});

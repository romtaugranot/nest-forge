import { extractRouteParams, toMustacheRoute } from './route-params';

describe('extractRouteParams', () => {
  it('should extract colon-style params', () => {
    expect(extractRouteParams('/users/:id')).toEqual(['id']);
  });

  it('should extract multiple colon-style params', () => {
    expect(extractRouteParams('/users/:userId/posts/:postId')).toEqual(['userId', 'postId']);
  });

  it('should extract interpolation-style params', () => {
    expect(extractRouteParams('/users/${id}')).toEqual(['id']);
  });

  it('should extract multiple interpolation-style params', () => {
    expect(extractRouteParams('/users/${userId}/posts/${postId}')).toEqual(['userId', 'postId']);
  });

  it('should return empty array for routes without params', () => {
    expect(extractRouteParams('/users')).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(extractRouteParams('')).toEqual([]);
  });

  it('should return empty array for root route', () => {
    expect(extractRouteParams('/')).toEqual([]);
  });
});

describe('toMustacheRoute', () => {
  it('should convert colon-style params to mustache syntax', () => {
    expect(toMustacheRoute('/users/:id')).toBe('/users/{{id}}');
  });

  it('should convert multiple colon-style params', () => {
    expect(toMustacheRoute('/users/:userId/posts/:postId')).toBe(
      '/users/{{userId}}/posts/{{postId}}',
    );
  });

  it('should convert interpolation-style params to mustache syntax', () => {
    expect(toMustacheRoute('/users/${id}')).toBe('/users/{{id}}');
  });

  it('should convert multiple interpolation-style params', () => {
    expect(toMustacheRoute('/users/${userId}/posts/${postId}')).toBe(
      '/users/{{userId}}/posts/{{postId}}',
    );
  });

  it('should leave routes without params unchanged', () => {
    expect(toMustacheRoute('/users')).toBe('/users');
  });

  it('should leave root route unchanged', () => {
    expect(toMustacheRoute('/')).toBe('/');
  });
});

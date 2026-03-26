export const extractRouteParams = (route: string): string[] => {
  const colonMatches = route.match(/:(\w+)/g);
  if (colonMatches) {
    return colonMatches.map((m) => m.slice(1));
  }
  const interpolationMatches = route.match(/\$\{(\w+)\}/g);
  if (interpolationMatches) {
    return interpolationMatches.map((m) => m.slice(2, -1));
  }
  return [];
};

export const toMustacheRoute = (route: string): string =>
  route.replace(/:(\w+)/g, '{{$1}}').replace(/\$\{(\w+)\}/g, '{{$1}}');

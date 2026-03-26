import { kebab, pascal } from '@orval/core';

export const deriveBaseName = (specTitle: string): string => {
  const pascalName = pascal(specTitle);
  return pascalName.replace(/Service$/, '');
};

export const deriveKebabBase = (specTitle: string): string => kebab(deriveBaseName(specTitle));

export const camelToScreamingSnake = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

export const pascalToKebab = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

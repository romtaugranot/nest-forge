import { parse as yamlParse } from 'yaml';

export const isYamlContent = (content: string): boolean => {
  try {
    JSON.parse(content);
    return false;
  } catch {
    return true;
  }
};

export const parseSpec = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    // Not valid JSON — try YAML
  }

  try {
    return yamlParse(content);
  } catch {
    throw new Error('Failed to parse OpenAPI spec: content is neither valid JSON nor valid YAML');
  }
};

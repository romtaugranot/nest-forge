import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { generate as orvalGenerate } from 'orval';
import type { NestForgeConfig } from './interfaces';
import { deriveKebabBase, parseSpec, isYamlContent } from './helpers';
import { postProcess } from './post-process';
import { log } from './logger';

const isUrl = (input: string): boolean =>
  input.startsWith('http://') || input.startsWith('https://');

const fetchSpec = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch spec from ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
};

const BUILDER_IMPORT_PATH = require.resolve('./builder/nestjs-client-builder');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractSpecTitle = (parsed: unknown): string => {
  if (!isRecord(parsed)) {
    return 'api';
  }
  const { info } = parsed;
  if (!isRecord(info)) {
    return 'api';
  }
  return typeof info.title === 'string' ? info.title : 'api';
};

const extractSpecTags = (parsed: unknown): string[] => {
  if (!isRecord(parsed)) {
    return [];
  }
  const { paths } = parsed;
  if (!isRecord(paths)) {
    return [];
  }
  const tagSet = new Set<string>();
  for (const pathItem of Object.values(paths)) {
    if (!isRecord(pathItem)) {
      continue;
    }
    for (const operation of Object.values(pathItem)) {
      if (!isRecord(operation)) {
        continue;
      }
      const tags = operation.tags;
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === 'string') {
            tagSet.add(tag);
          }
        }
      }
    }
  }
  return [...tagSet];
};

const noopWrite: typeof process.stdout.write = (): boolean => true;

const suppressConsole = async <T>(fn: () => Promise<T>): Promise<T> => {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = noopWrite;
  process.stderr.write = noopWrite;

  try {
    return await fn();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
};

interface OrvalFilters {
  readonly mode: 'include' | 'exclude';
  readonly tags: string[];
}

const writeTemporaryOrvalConfig = (
  configPath: string,
  inputPath: string,
  serviceTarget: string,
  modelDir: string,
  filters?: OrvalFilters,
): void => {
  const filtersStr = filters
    ? `\n      filters: { mode: '${filters.mode}', tags: [${filters.tags.map((t) => `'${t}'`).join(', ')}] },`
    : '';
  const content = `const { nestjsBuilder } = require('${BUILDER_IMPORT_PATH.replace(/\\/g, '/')}');

module.exports = {
  api: {
    input: {
      target: '${inputPath.replace(/\\/g, '/')}',${filtersStr}
    },
    output: {
      target: '${serviceTarget.replace(/\\/g, '/')}',
      schemas: { type: 'zod', path: '${modelDir.replace(/\\/g, '/')}' },
      client: nestjsBuilder,
      mode: 'single',
      clean: true,
      override: {
        operationName: (operation, route, verb) => {
          const operationId = operation.operationId ?? '';
          if (operationId) {
            const parts = operationId.split('_');
            return parts.length > 1 ? parts[parts.length - 1] : operationId;
          }
          const segments = route
            .split('/')
            .filter(Boolean)
            .map((segment) => {
              const paramMatch = segment.match(/^\\$\\{(.+)\\}$/) || segment.match(/^\\{(.+)\\}$/);
              if (paramMatch) {
                const paramName = paramMatch[1];
                return 'by' + paramName[0].toUpperCase() + paramName.slice(1);
              }
              return segment;
            });
          const raw = [verb, ...segments].join('-');
          return raw
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
            .replace(/^./, (char) => char.toLowerCase());
        },
      },
    },
  },
};
`;
  writeFileSync(configPath, content);
};

export const generate = async (config: NestForgeConfig): Promise<void> => {
  const cwd = process.cwd();
  const outputBase = resolve(cwd, config.outputDir ?? '.');

  // Resolve input: fetch from URL or read from file
  let inputPath: string;
  let tempSpecPath: string | undefined;

  if (isUrl(config.input)) {
    log.info(`Fetching spec from ${config.input}...`);
    const specContent = await fetchSpec(config.input);
    mkdirSync(outputBase, { recursive: true });
    const specExtension = isYamlContent(specContent) ? '.yaml' : '.json';
    tempSpecPath = join(outputBase, `.nest-forge.spec${specExtension}`);
    writeFileSync(tempSpecPath, specContent);
    inputPath = tempSpecPath;
  } else {
    inputPath = resolve(cwd, config.input);
  }

  try {
    // Read spec to derive names
    const parsed: unknown = parseSpec(readFileSync(inputPath, 'utf-8'));
    const specTitle = extractSpecTitle(parsed);
    const kebabBase = deriveKebabBase(specTitle);

    const outputDir = join(outputBase, kebabBase);
    const modelDir = join(outputBase, 'model');
    const serviceTarget = join(outputDir, `${kebabBase}.service.ts`);

    const startTime = Date.now();

    log.info(`Generating NestJS client for "${specTitle}"...`);
    log.info(`  Input:  ${config.input}`);
    log.info(`  Output: ${outputDir}`);

    // Ensure output base directory exists
    mkdirSync(outputBase, { recursive: true });

    // Compute Orval tag filters from config
    let filters: OrvalFilters | undefined;
    if (config.tags) {
      filters = { mode: 'include', tags: config.tags };
      log.info(`  Tags (include): ${config.tags.join(', ')}`);
    } else if (config.excludeTags) {
      filters = { mode: 'exclude', tags: config.excludeTags };
      log.info(`  Tags (exclude): ${config.excludeTags.join(', ')}`);
    }

    // Write temporary orval config and run orval
    const tempConfigPath = join(outputBase, '.nest-forge.orval.cjs');
    writeTemporaryOrvalConfig(tempConfigPath, inputPath, serviceTarget, modelDir, filters);

    try {
      await suppressConsole(() => orvalGenerate(tempConfigPath));
    } finally {
      unlinkSync(tempConfigPath);
    }

    log.info(`Orval generation completed in ${Date.now() - startTime}ms`);

    // Post-process: split model files into schemas/types, fix imports
    const specTags = extractSpecTags(parsed);
    postProcess(modelDir, outputDir, specTags);

    log.info(`Total generation completed in ${Date.now() - startTime}ms`);
  } finally {
    if (tempSpecPath) {
      try {
        unlinkSync(tempSpecPath);
      } catch {
        /* already cleaned up */
      }
    }
  }
};

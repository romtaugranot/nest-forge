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

const writeTemporaryOrvalConfig = (
  configPath: string,
  inputPath: string,
  serviceTarget: string,
  modelDir: string,
): void => {
  const content = `const { nestjsBuilder } = require('${BUILDER_IMPORT_PATH.replace(/\\/g, '/')}');

module.exports = {
  api: {
    input: {
      target: '${inputPath.replace(/\\/g, '/')}',
    },
    output: {
      target: '${serviceTarget.replace(/\\/g, '/')}',
      schemas: { type: 'zod', path: '${modelDir.replace(/\\/g, '/')}' },
      client: nestjsBuilder,
      mode: 'single',
      clean: true,
      override: {
        operationName: (operation) => {
          const operationId = operation.operationId ?? '';
          const parts = operationId.split('_');
          return parts.length > 1 ? parts[parts.length - 1] : operationId;
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

    // Write temporary orval config and run orval
    const tempConfigPath = join(outputBase, '.nest-forge.orval.cjs');
    writeTemporaryOrvalConfig(tempConfigPath, inputPath, serviceTarget, modelDir);

    try {
      await suppressConsole(() => orvalGenerate(tempConfigPath));
    } finally {
      unlinkSync(tempConfigPath);
    }

    log.info(`Orval generation completed in ${Date.now() - startTime}ms`);

    // Post-process: split model files into schemas/types, fix imports
    postProcess(modelDir, outputDir);

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

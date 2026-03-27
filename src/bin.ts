#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { generate } from './generate';
import { log } from './logger';

interface ParsedArguments {
  readonly input?: string;
  readonly outputDir?: string;
  readonly tags?: string[];
  readonly excludeTags?: string[];
  readonly help: boolean;
  readonly version: boolean;
}

const parseCsvArg = (value: string): string[] =>
  value.split(',').map((tag) => tag.trim()).filter(Boolean);

const parseArgs = (argv: string[]): ParsedArguments => {
  let input: string | undefined;
  let outputDir: string | undefined;
  let tags: string[] | undefined;
  let excludeTags: string[] | undefined;
  let help = false;
  let version = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--version' || arg === '-v') {
      version = true;
    } else if (arg === '--input' || arg === '-i') {
      input = argv[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = argv[++i];
    } else if (arg === '--tags' || arg === '-t') {
      tags = parseCsvArg(argv[++i]);
    } else if (arg === '--exclude-tags') {
      excludeTags = parseCsvArg(argv[++i]);
    } else if (!input) {
      input = arg;
    }
  }

  return { input, outputDir, tags, excludeTags, help, version };
};

const getVersion = (): string => {
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const content = readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content) as { version: string };
  return packageJson.version;
};

const printUsage = (): void => {
  console.log(`
  nest-forge-sdk - Generate NestJS client SDK modules from OpenAPI specs

  Usage:
    nest-forge-sdk <openapi-spec>  [options]
    nest-forge-sdk --input <path|url>  [options]

  Options:
    -i, --input <path|url>    Path or URL to the OpenAPI spec (JSON/YAML)
    -o, --output <dir>        Output directory (default: current directory)
    -t, --tags <tags>         Comma-separated tags to include (e.g. endpoint,user)
        --exclude-tags <tags> Comma-separated tags to exclude
    -v, --version             Show version number
    -h, --help                Show this help message

  Examples:
    nest-forge-sdk ./openapi.json
    nest-forge-sdk ./openapi.yaml
    nest-forge-sdk --input ./api/spec.yml --output ./sdk
    nest-forge-sdk https://api.example.com/docs-json --output ./sdk
    nest-forge-sdk ./spec.yaml --tags endpoint,user --output ./sdk
    nest-forge-sdk ./spec.yaml --exclude-tags admin,internal
`);
};

const run = async (): Promise<void> => {
  const { input, outputDir, tags, excludeTags, help, version } = parseArgs(process.argv);

  if (version) {
    console.log(getVersion());
    process.exit(0);
  }

  if (help || !input) {
    printUsage();
    process.exit(help ? 0 : 1);
  }

  if (tags && excludeTags) {
    log.error('Cannot use --tags and --exclude-tags together.');
    process.exit(1);
  }

  try {
    await generate({ input, outputDir, tags, excludeTags });
    log.info('Done.');
  } catch (error) {
    log.error('Generation failed:', error);
    process.exit(1);
  }
};

run();

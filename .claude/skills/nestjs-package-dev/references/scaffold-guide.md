# Scaffold Guide

Step-by-step process for creating a new NestJS npm package from scratch.

## Prerequisites

Gather from the user:
- **Package name** — check availability with `npm view <name>`
- **Description** — one sentence explaining what it does
- **What it does** — the core problem it solves
- **Target audience** — who will use this and how

## Directory Structure

Generate this skeleton (adapt based on whether the package needs a CLI, multiple modules, etc.):

```
<package-name>/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── index.ts                  # Barrel file — public API only
│   ├── <name>.module.ts          # Root NestJS module
│   ├── <name>.service.ts         # Core service
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── <name>-options.interface.ts
│   ├── types/
│   │   └── index.ts
│   ├── exceptions/
│   │   └── index.ts
│   ├── data/
│   │   └── index.ts
│   └── bin.ts                    # (only if CLI is needed)
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── eslint.config.mjs
├── jest.config.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── LICENSE
├── README.md
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## File Templates

### package.json

```json
{
  "name": "<package-name>",
  "version": "0.1.0",
  "description": "<description>",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "LICENSE",
    "README.md"
  ],
  "scripts": {
    "clean": "rimraf dist",
    "build": "npm run clean && tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm run lint && npm run test && npm run build"
  },
  "keywords": ["nestjs", "<domain-keywords>"],
  "author": "<author-name> <<author-email>>",
  "license": "MIT",
  "type": "commonjs",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/<repo>.git"
  },
  "homepage": "https://github.com/<owner>/<repo>#readme",
  "bugs": {
    "url": "https://github.com/<owner>/<repo>/issues"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.4.0",
    "rimraf": "^6.0.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "@nestjs/common": ">=10.0.0"
  },
  "peerDependenciesMeta": {
    "@nestjs/common": {
      "optional": false
    }
  }
}
```

Adjust peer dependencies based on what the package actually needs from its consumers.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "src/__mocks__"
  ]
}
```

### jest.config.json

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.ts", "!**/index.ts", "!**/bin.ts"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

### .prettierrc.json

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### .prettierignore

```
dist
coverage
node_modules
```

### .gitignore

```
node_modules
dist
coverage
*.tgz
*.log
.DS_Store
Thumbs.db
```

### CI Workflow (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
      - run: npm run build
```

### Release Workflow (.github/workflows/release.yml)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add a second publish step for GitHub Packages if needed (see the CI/CD section in the main skill).

### NestJS Module Template

For a standard configurable NestJS module:

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { <Name>Service } from './<name>.service';
import { <Name>Options } from './interfaces';

const <NAME>_OPTIONS_TOKEN = Symbol('<NAME>_OPTIONS');

@Module({})
export class <Name>Module {
  static forRoot(options: <Name>Options): DynamicModule {
    return {
      module: <Name>Module,
      providers: [
        {
          provide: <NAME>_OPTIONS_TOKEN,
          useValue: options,
        },
        <Name>Service,
      ],
      exports: [<Name>Service],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: ReadonlyArray<unknown>) => Promise<<Name>Options> | <Name>Options;
    inject?: ReadonlyArray<unknown>;
    imports?: ReadonlyArray<unknown>;
  }): DynamicModule {
    return {
      module: <Name>Module,
      imports: options.imports ?? [],
      providers: [
        {
          provide: <NAME>_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        <Name>Service,
      ],
      exports: [<Name>Service],
    };
  }
}
```

### CHANGELOG.md Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - <date>

### Added
- Initial release
- <list key features>
```

### CONTRIBUTING.md Template

```markdown
# Contributing to <Package Name>

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run tests: `npm test`

## Available Scripts

| Script | Description |
|---|---|
| `npm run build` | Clean and compile TypeScript |
| `npm run dev` | Watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm test` | Run tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage |

## Code Style

This project follows strict TypeScript and NestJS conventions documented in `CLAUDE.md`.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass: `npm run lint && npm run format:check && npm test && npm run build`
4. Open a pull request against `main`
```

## After Scaffolding

1. Run `npm install` to install dependencies
2. Run `npm run build` to verify the skeleton compiles
3. Run `npm test` to verify the test setup works
4. Run the pre-publish checklist to verify completeness
5. Initialize git and make the first commit

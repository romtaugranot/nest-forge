# Pre-Publish Checklist

Work through every item. For each one, check the current state and report pass/fail. Offer to fix failures.

## Table of Contents

1. [Package Identity](#1-package-identity)
2. [Package Exports](#2-package-exports)
3. [Scripts & Build](#3-scripts--build)
4. [TypeScript Configuration](#4-typescript-configuration)
5. [Code Quality Tools](#5-code-quality-tools)
6. [Testing](#6-testing)
7. [Dependencies](#7-dependencies)
8. [Documentation](#8-documentation)
9. [CI/CD](#9-cicd)
10. [Security & Hygiene](#10-security--hygiene)
11. [NestJS-Specific](#11-nestjs-specific)
12. [Project Conventions](#12-project-conventions)

---

## 1. Package Identity

Check `package.json` for:

- [ ] `name` — set, follows npm naming rules, available on the registry (run `npm view <name>`)
- [ ] `version` — follows semver (start at `1.0.0` for first stable release, `0.x.y` for pre-release)
- [ ] `description` — clear, concise, tells a developer what this package does in one sentence
- [ ] `keywords` — at least 5-10 relevant search terms (include "nestjs", "typescript", and domain terms)
- [ ] `author` — name and email: `"Name <email>"`
- [ ] `license` — set to a recognized SPDX identifier (MIT, Apache-2.0, etc.)
- [ ] `repository` — `{ "type": "git", "url": "git+https://github.com/..." }`
- [ ] `homepage` — points to the repo or docs site
- [ ] `bugs` — `{ "url": "https://github.com/.../issues" }`
- [ ] `engines` — specifies minimum Node.js version (align with NestJS requirements, currently `>=18.0.0`)

## 2. Package Exports

- [ ] `main` — points to the compiled CJS entry point (e.g., `"./dist/index.js"`)
- [ ] `types` — points to the declaration entry point (e.g., `"./dist/index.d.ts"`)
- [ ] `exports` map — configured with conditional exports:
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js"
    }
  }
  ```
  Add `"import"` if the package supports ESM.
- [ ] `type` field — set to `"commonjs"` or `"module"` matching the actual output
- [ ] `bin` — if the package has a CLI, points to the compiled entry with `#!/usr/bin/env node` shebang
- [ ] `files` array — explicitly lists what gets published (typically `["dist", "LICENSE", "README.md"]`). Run `npm pack --dry-run` to verify only intended files are included.

## 3. Scripts & Build

- [ ] `build` — compiles TypeScript, cleans output directory first
- [ ] `clean` — removes the dist directory
- [ ] `dev` or `watch` — TypeScript watch mode for development
- [ ] `lint` — runs ESLint on source
- [ ] `lint:fix` — ESLint with auto-fix
- [ ] `format` — Prettier write mode
- [ ] `format:check` — Prettier check mode (used in CI)
- [ ] `test` — runs the test suite
- [ ] `test:watch` — test watch mode
- [ ] `test:coverage` — tests with coverage report
- [ ] `prepublishOnly` — gates publishing behind lint + test + build (e.g., `"npm run lint && npm run test && npm run build"`)
- [ ] Build actually succeeds — run `npm run build` and verify no errors
- [ ] Output directory matches `main`/`types` paths in package.json

## 4. TypeScript Configuration

Check `tsconfig.json`:

- [ ] `strict: true` — enables all strict checks
- [ ] `declaration: true` — emits `.d.ts` files
- [ ] `declarationMap: true` — enables Go-to-Definition for consumers
- [ ] `sourceMap: true` — enables debugging
- [ ] `esModuleInterop: true` — allows default imports from CJS modules
- [ ] `forceConsistentCasingInFileNames: true`
- [ ] `resolveJsonModule: true` — if JSON imports are used
- [ ] `skipLibCheck: true` — avoids type-checking node_modules
- [ ] Target is appropriate (ES2022 or later for modern Node.js)
- [ ] Module system matches the `type` field in package.json

Check `tsconfig.build.json`:

- [ ] Extends the base `tsconfig.json`
- [ ] Excludes: `node_modules`, `dist`, test files (`**/*.spec.ts`), mock directories
- [ ] Output directory matches the `main` path in package.json

## 5. Code Quality Tools

ESLint:

- [ ] ESLint is configured (eslint.config.mjs or .eslintrc.*)
- [ ] TypeScript parser and plugin are configured
- [ ] Prettier integration (eslint-config-prettier) to avoid rule conflicts
- [ ] `npm run lint` passes with no errors

Prettier:

- [ ] `.prettierrc.json` exists with explicit settings (singleQuote, trailingComma, printWidth, tabWidth)
- [ ] `.prettierignore` exists if needed (dist, coverage, node_modules)
- [ ] `npm run format:check` passes

## 6. Testing

- [ ] Test framework is set up (Jest recommended for NestJS)
- [ ] Jest config exists (`jest.config.json` or `jest.config.ts`)
- [ ] ts-jest or equivalent TypeScript support is configured
- [ ] Tests exist for core functionality
- [ ] `npm test` passes with no failures
- [ ] Test coverage is reasonable for a library (aim for >80% on core logic)
- [ ] Mock directory exists if external dependencies need mocking
- [ ] Tests are excluded from the published package (via `files` field or `.npmignore`)

## 7. Dependencies

- [ ] `dependencies` — only packages required at runtime by consumers
- [ ] `devDependencies` — build tools, test frameworks, linters (never in `dependencies`)
- [ ] `peerDependencies` — framework packages the consumer must provide (NestJS core, Zod, etc.)
- [ ] `peerDependenciesMeta` — marks truly optional peers as `{ "optional": true }`
- [ ] Peer dependency ranges are wide enough to not conflict with consumer projects (use `>=` ranges)
- [ ] No duplicate packages across dependency types
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] `npm outdated` — no severely outdated dependencies
- [ ] No unnecessary dependencies — each one must be justified

## 8. Documentation

- [ ] `README.md` — comprehensive, follows the README structure from the skill's main guide
- [ ] `LICENSE` file — matches the `license` field in package.json
- [ ] `CONTRIBUTING.md` — development setup, scripts, code style reference, PR workflow
- [ ] `CHANGELOG.md` — tracks changes per version, follows Keep a Changelog format
- [ ] `.gitignore` — excludes node_modules, dist, coverage, OS files, .tgz archives, logs

## 9. CI/CD

GitHub Actions CI:

- [ ] Workflow file exists (`.github/workflows/ci.yml`)
- [ ] Triggers on push to main and pull requests
- [ ] Tests across supported Node.js versions (match `engines` field)
- [ ] Pipeline: `npm ci` -> lint -> format:check -> test -> build

GitHub Actions Release:

- [ ] Workflow file exists (`.github/workflows/release.yml`)
- [ ] Triggers on `v*` tag push
- [ ] Runs full CI pipeline before publishing
- [ ] Publishes to npm registry with `NPM_TOKEN` secret
- [ ] (Optional) Also publishes to GitHub Packages with `GITHUB_TOKEN`
- [ ] **Never publish to npm until all CI workflows have passed** — do not push a version tag until the CI workflow on the corresponding commit is green

## 10. Security & Hygiene

- [ ] No secrets, tokens, API keys, or credentials anywhere in source code
- [ ] No `.env` files committed to git
- [ ] `.gitignore` covers sensitive file patterns
- [ ] `files` in package.json ensures only dist + docs are published (verify with `npm pack --dry-run`)
- [ ] No large binary files in the repository
- [ ] No `postinstall` scripts that run arbitrary code (consumers will be wary)
- [ ] License is compatible with the intended use case

## 11. NestJS-Specific

- [ ] Package exports a NestJS Module class
- [ ] Module uses `forRoot()` for synchronous configuration where appropriate
- [ ] Module uses `forRootAsync()` for async/factory-based configuration
- [ ] `forRootAsync` supports `useFactory`, `useClass`, and `useExisting` patterns
- [ ] Services that consumers inject are listed in the module's `exports` array
- [ ] Peer dependencies include `@nestjs/common` (and `@nestjs/core` if needed)
- [ ] Does not import from `@nestjs/core` internals or rely on private APIs
- [ ] Custom exceptions extend NestJS HttpException subclasses
- [ ] Module is `@Global()` only if there is a strong reason (most modules should not be global)
- [ ] Provider tokens are symbols or class references, not magic strings

## 12. Project Conventions

Read the project's CLAUDE.md and verify:

- [ ] Barrel files (`index.ts`) exist in every module/folder
- [ ] All exports are named (no default exports)
- [ ] Folder structure follows convention (interfaces/, types/, exceptions/, schemas/, data/, etc.)
- [ ] TypeScript strict rules followed (explicit return types, no `any`, no `as`, no `!`)
- [ ] Code style rules followed (arrow functions, const, no abbreviations, SCREAMING_SNAKE_CASE enums)
- [ ] Validation patterns followed (Zod safeParse, constants in data/ files)
- [ ] NestJS patterns followed (private readonly injections, getters for config access)

---

## Summary Report Template

After running the checklist, present results like this:

```
## Audit Summary

| Section | Status | Issues |
|---|---|---|
| Package Identity | PASS | — |
| Package Exports | FAIL | Missing `exports` map |
| Scripts & Build | PASS | — |
| TypeScript Config | PASS | — |
| Code Quality | FAIL | Prettier check fails |
| Testing | PASS | — |
| Dependencies | PASS | — |
| Documentation | FAIL | No CHANGELOG.md |
| CI/CD | PASS | — |
| Security | PASS | — |
| NestJS-Specific | PASS | — |
| Conventions | FAIL | 2 barrel files missing |

### Action Items
1. Add `exports` map to package.json
2. Run `npm run format` to fix formatting
3. Create CHANGELOG.md
4. Add barrel files to helpers/ and post-process/
```

---
name: nestjs-package-dev
description: Guides development, auditing, and publishing of NestJS npm packages. Enforces project conventions from CLAUDE.md, runs pre-publish and version-release checklists, reviews API usability from a consumer's perspective, generates README files, scaffolds new packages, and handles npm/GitHub Packages publishing with CI/CD. Use this skill whenever working on a NestJS npm package — whether scaffolding a new one, preparing for first publish, cutting a new version, reviewing API design, or generating documentation. Also trigger when the user mentions npm publish, package release, version bump, package audit, API review, README generation, or "is this ready to publish" in the context of a NestJS library. Trigger on package.json questions for libraries too.
---

# NestJS Package Developer

This skill helps you take a NestJS npm package from idea to published, production-quality library — and keep it there across releases. It covers the full lifecycle: scaffolding, development, auditing, API review, documentation, CI/CD, and publishing.

## First Steps

Before doing anything else:

1. **Read the project's CLAUDE.md** if one exists. It contains the coding conventions that all code in this project must follow. Every suggestion, scaffold, and review you perform must conform to these conventions.
2. **Read `package.json`** to understand the current state of the package.
3. **Determine what the user needs** — then jump to the appropriate section below.

## Choosing a Workflow

| User wants to... | Go to |
|---|---|
| Start a new NestJS package from scratch | [Scaffold](#scaffold-a-new-package) |
| Check if a package is ready to publish | [Audit](#audit-an-existing-package) |
| Review the API from a consumer's perspective | [API Review](#api-usability-review) |
| Generate or update the README | [README Generation](#generate-the-readme) |
| Prepare and publish a new version | [Release](#release-a-new-version) |
| Set up or fix CI/CD | [CI/CD Setup](#cicd-setup) |

If the user's intent spans multiple workflows (e.g., "get this package ready to publish"), run them in sequence: Audit first to identify gaps, then fix what's missing, then API Review, then README, then Release.

---

## Scaffold a New Package

Read `references/scaffold-guide.md` for the full scaffold template and step-by-step process.

High-level flow:

1. Ask the user for: package name, description, what the package does, target audience
2. Check npm registry availability: `npm view <name>` — if taken, suggest alternatives
3. Generate the project skeleton following the conventions in CLAUDE.md
4. Set up package.json with proper exports, peer dependencies, scripts
5. Configure TypeScript (strict mode, declarations, build config)
6. Set up ESLint, Prettier, Jest
7. Create the initial module structure (NestJS module with `forRoot`/`forRootAsync` if appropriate)
8. Set up CI/CD workflows
9. Create LICENSE, CONTRIBUTING.md, CHANGELOG.md
10. Run the pre-publish checklist to verify completeness

The scaffold should produce a package that passes the full audit on day one.

---

## Audit an Existing Package

Read `references/pre-publish-checklist.md` for the complete checklist.

The audit walks through every aspect of the package systematically. For each item:
- Check the current state
- Report whether it passes or fails
- If it fails, explain what needs to change and offer to fix it

### Running the Audit

1. Read the full checklist from `references/pre-publish-checklist.md`
2. Work through each section, reading the relevant files
3. Search for latest NestJS best practices online when checking NestJS-specific patterns — the ecosystem evolves and the checklist may not cover the newest recommendations
4. Present a summary table showing pass/fail for each section
5. Offer to fix all failures automatically

### Quick Checks via CLI

Run these commands to gather audit data efficiently:

```bash
# Check if package name is available (or already yours)
npm view <package-name> version

# Audit dependencies for vulnerabilities
npm audit

# Dry-run publish to see what would be included
npm pack --dry-run

# Check for outdated dependencies
npm outdated

# Verify the build works
npm run build

# Run the test suite
npm test

# Check lint
npm run lint

# Check formatting
npm run format:check
```

---

## API Usability Review

This is where you think like a developer who just discovered this package on npm and wants to use it. Read `references/api-review-guide.md` for the full review framework.

The core question: **If I were a NestJS developer who needed what this package offers, would I enjoy using it?**

### Review Process

1. **Read the package's public API** — everything exported from `index.ts` (the barrel file). This is what consumers see.
2. **Read the README** — is the getting-started experience smooth?
3. **Trace a typical usage flow** — import the module, configure it, call the service methods. Is it intuitive?
4. **Check for missing features** that a consumer would reasonably expect
5. **Check for sharp edges** — confusing naming, unclear error messages, missing types, too many required config options
6. **Search online** for how similar NestJS packages handle the same problems — are we missing patterns that users expect?
7. **Write up findings** organized by severity (blocking, should-fix, nice-to-have)

### What to Look For

- **Import experience**: Can users import everything they need from one path?
- **Configuration**: Is `forRoot`/`forRootAsync` straightforward? Are defaults sensible?
- **Type safety**: Are all public types exported? Do consumers get good autocomplete?
- **Error messages**: When things go wrong, do errors explain what happened and what to do?
- **Documentation**: Does every public method have a clear purpose from its name + types?
- **Peer dependencies**: Are they reasonable? Not pulling in things the consumer wouldn't expect?

---

## Generate the README

A good README is the difference between a package with 10 downloads and 10,000. Generate it by actually understanding the code, not by filling a template with guesses.

### Process

1. **Read the full source code** — understand what the package does, how it works, what problems it solves
2. **Read package.json** — extract name, description, dependencies, peer deps, scripts, bin entries
3. **Identify the target audience** — who would use this package and why?
4. **Trace the main usage paths** — what does a consumer do from install to first successful use?
5. **Search online for similar packages** — how do their READMEs structure the information? What do users expect to find?
6. **Write the README** using the structure below

### README Structure

```markdown
# Package Name

One-line description of what the package does and why it matters.

## Features

Bullet list of key capabilities — focus on what the user gets, not implementation details.

## Installation

npm install command with peer dependency notes.

## Quick Start

Minimal working example — from import to working result in under 20 lines.

## Usage

### Basic Usage
### Advanced Configuration
### [Feature-specific sections as needed]

## API Reference

Document every exported class, method, interface, and type.
For services: method signature, parameters, return type, what it does, example.
For modules: forRoot/forRootAsync options, what each option controls.

## CLI (if applicable)

Command, flags, examples.

## Configuration

All configuration options in a table: name, type, default, description.

## Error Handling

What exceptions can be thrown, when, and how to handle them.

## Contributing

Link to CONTRIBUTING.md.

## License

License type with link to LICENSE file.
```

### Quality Standards

- Every code example must actually work — trace it through the source to verify
- Show imports in every example
- Use TypeScript in all examples
- Include output/result comments where it helps understanding
- Link to relevant NestJS docs for patterns the user might not know (e.g., dynamic modules)
- Keep examples realistic — use domain-appropriate names, not `foo`/`bar`

---

## Release a New Version

Read `references/version-release-checklist.md` for the full release process.

High-level flow:

1. Determine the version bump type (major/minor/patch) based on changes since last release
2. Run the pre-publish checklist to catch any regressions
3. Update CHANGELOG.md with the new version's changes
4. Bump the version in package.json
5. Create a git commit and tag
6. Push the commit and **wait for all CI workflows to pass** before pushing the tag
7. Push the tag to trigger the release workflow only after CI is green
8. Verify the package published successfully

### Semver Decision Guide

- **Patch** (1.0.0 -> 1.0.1): Bug fixes, documentation updates, internal refactors with no API changes
- **Minor** (1.0.0 -> 1.1.0): New features, new exports, new optional configuration — nothing breaks existing consumers
- **Major** (1.0.0 -> 2.0.0): Breaking changes — removed/renamed exports, changed method signatures, dropped Node versions, changed peer dep ranges

When in doubt, ask the user. Breaking changes are easy to miss (e.g., changing a default value can break consumers who relied on the old default).

---

## CI/CD Setup

### GitHub Actions CI (test on push/PR)

The CI workflow should:
- Run on push to main and on pull requests
- Test across the Node.js versions specified in `engines` (typically the active LTS versions)
- Run: `npm ci` -> lint -> format check -> test -> build

### GitHub Actions Release (publish on tag)

The release workflow should:
- Trigger on `v*` tags
- Run the full CI pipeline first (lint, test, build)
- Publish to npm using `NPM_TOKEN` secret
- Optionally also publish to GitHub Packages

**Never publish to npm until all CI workflows succeed.** When releasing, push the commit to `main` first and verify all CI workflows pass before pushing the version tag. This ensures broken code never reaches the registry.

### Publishing to GitHub Packages

To publish to both npm and GitHub Packages, the release workflow needs a second publish step:

```yaml
- uses: actions/setup-node@v4
  with:
    registry-url: https://npm.pkg.github.com
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The package.json needs a `publishConfig` field if the default registry should be npm:
```json
"publishConfig": {
  "registry": "https://registry.npmjs.org"
}
```

### Required Secrets

- `NPM_TOKEN`: Generate at npmjs.com -> Access Tokens -> Granular Access Token (recommended) or Automation token
- `GITHUB_TOKEN`: Automatically available in GitHub Actions for GitHub Packages

---

## Research & Staying Current

Whenever auditing, reviewing, or scaffolding, search the web for:
- Latest NestJS release notes and migration guides
- Current best practices for npm package publishing
- How popular NestJS packages (e.g., `@nestjs/config`, `@nestjs/throttler`, `nestjs-zod`) structure their exports, modules, and configuration
- npm packaging gotchas (dual CJS/ESM, conditional exports, `type` field)

The NestJS ecosystem moves fast. What was best practice six months ago may have better alternatives now. Always verify recommendations against the latest documentation.

---

## Conventions Enforcement

Every piece of code this skill produces or reviews must follow the project's CLAUDE.md conventions. The key ones for package development:

- **Barrel files** (`index.ts`) in every module, exporting only the public API
- **Named exports only** — no default exports
- **Folder structure**: interfaces/, types/, exceptions/, schemas/, data/, utils/ etc.
- **TypeScript strict mode** with explicit return types, no `any`, no `as`, no `!`
- **Arrow functions only** — no `function` keyword
- **`const` by default** — `let` only when reassignment is needed
- **No abbreviations** — spell out all identifiers
- **Custom exceptions** that extend NestJS HttpException subclasses
- **Zod for validation** — `safeParse` only, constants in data/ files, schemas in schemas/ files
- **`private readonly`** for all constructor injections

Read the full CLAUDE.md for the complete list. When writing code, cross-reference it. When reviewing code, flag violations.

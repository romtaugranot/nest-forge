# Contributing to nest-forge

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/romtaugranot/nest-forge.git
cd nest-forge
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Clean and compile TypeScript |
| `npm run dev` | Watch mode compilation |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Code Style

This project follows strict TypeScript conventions documented in `CLAUDE.md`. Key rules:

- Explicit return types on all functions
- No `any`, no type assertions (`as`), no non-null assertions (`!`)
- Arrow functions only (no `function` keyword)
- Named exports only (no default exports)
- One entity per file

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Write tests for new functionality
3. Ensure `npm run lint`, `npm run format:check`, and `npm test` all pass
4. Keep PRs focused -- one feature or fix per PR

## Publishing

Only maintainers publish to npm. A new version must **never** be published until all CI workflows have passed on the commit being released. If any workflow is failing, fix the issue and wait for a clean CI run before publishing.

## Reporting Issues

Use [GitHub Issues](https://github.com/romtaugranot/nest-forge/issues) with a clear title and description.

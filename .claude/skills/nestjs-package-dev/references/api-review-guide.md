# API Usability Review Guide

Think like a developer who just found this package on npm. You have a NestJS app, you need what this package offers, and you want to get it working in 10 minutes. Walk through the experience and identify friction.

## Review Framework

### 1. First Impressions (the README)

Read the README as if you have never seen this package before:

- Can you understand what it does in 30 seconds?
- Is the installation command clear? Are peer dependencies listed upfront?
- Is there a Quick Start example you can copy-paste and run immediately?
- Do the examples use realistic, domain-appropriate code (not `foo`/`bar`)?
- After reading the README, do you know enough to start using the package?

If the answer to any of these is "no", that is a finding.

### 2. Import Experience

Check the barrel file (`src/index.ts` or the `main` entry):

- Can the consumer import everything they need from one path? e.g., `import { MyModule, MyService, MyOptions } from '<package>'`
- Are types, interfaces, and enums exported alongside the classes that use them?
- Is the export list clean — no internal utilities, no implementation details leaking out?
- Are there any confusing or ambiguous export names? Would a consumer know what `ProcessResult` means without reading the source?

### 3. Module Configuration

Trace the setup path:

- **forRoot()**: Is the options interface clear? Can a consumer look at the type and know exactly what to pass?
- **forRootAsync()**: Does it support `useFactory` with dependency injection? This is the most common async pattern and consumers expect it.
- **Defaults**: Are sensible defaults provided so the consumer only has to specify what differs from the common case?
- **Validation**: Does the module validate its configuration and throw clear errors for invalid input?
- **Required vs optional**: Is it obvious which config fields are required and which are optional?

### 4. Service API

For each public service method:

- **Naming**: Does the method name clearly describe what it does? Can you guess what `process()` or `execute()` does without reading the docs?
- **Parameters**: Are there too many? Would an options object be cleaner than positional args?
- **Return type**: Is it clear what comes back? Is the type exported so the consumer can reference it?
- **Errors**: What happens when things go wrong? Are the error types documented? Do error messages explain the problem and suggest a fix?
- **Async**: Is the async behavior clear? Are all async operations properly typed with `Promise<T>`?

### 5. Type Safety

Check from the consumer's perspective:

- Does the consumer get good autocomplete and IntelliSense?
- Are generic types constrained properly?
- Can the consumer narrow types safely (discriminated unions, type guards)?
- Are all type parameters documented or self-evident?

### 6. Missing Features

Compare against what similar packages offer and what consumers would reasonably expect:

- Search npm for packages that solve similar problems — what features do they have that this one doesn't?
- Search GitHub issues of similar packages — what do users frequently request?
- Think about edge cases: what happens with empty input? Large input? Concurrent calls? Configuration changes at runtime?
- Does the package handle cleanup (e.g., `onModuleDestroy` for connection pools, timers)?

### 7. Peer Dependencies

Review peer dependencies from a consumer's perspective:

- Are all peer deps necessary? Each one is friction for the consumer.
- Are the version ranges wide enough? A range like `"zod": ">=3.0.0"` is friendlier than `"zod": "^3.22.0"`.
- Would any peer dep surprise the consumer? If your package is about logging, requiring `axios` would be unexpected.
- Are there packages listed as `dependencies` that should be `peerDependencies` (or vice versa)?

### 8. Error Experience

Deliberately try to use the package wrong and see what happens:

- Pass invalid configuration to `forRoot()`
- Call a service method with bad input
- Simulate a dependency failure (network error, timeout)
- Forget a required config field

For each: Is the error clear? Does it point to the problem? Does it suggest a fix?

## Severity Classification

Organize findings by impact:

| Severity | Definition | Example |
|---|---|---|
| **Blocking** | Prevents adoption or causes runtime failures | Missing type exports, broken `forRootAsync`, incorrect peer dep range |
| **Should-fix** | Makes the package harder to use than it needs to be | Confusing method names, unclear error messages, missing defaults |
| **Nice-to-have** | Would improve the experience but isn't critical | Better examples in README, additional utility methods, JSDoc on public methods |

## Output Format

Present findings as an ordered list grouped by severity:

```markdown
## API Review Findings

### Blocking
1. **[Types] `ProcessResult` type is not exported** — consumers can't reference the return type of `process()`. Add it to the barrel file.

### Should-Fix
2. **[Config] `forRoot()` accepts 6 required fields** — most have obvious defaults. Make `timeout`, `retries`, and `logLevel` optional with sensible defaults.
3. **[Naming] `run()` method is ambiguous** — rename to `generateClient()` to match the domain.

### Nice-to-Have
4. **[Docs] No JSDoc on `MyService.configure()`** — consumers see the method in autocomplete but don't know what it does without reading the source.
```

## Cross-Reference

After the review, compare findings against:
- The project's CLAUDE.md conventions (are convention violations also usability issues?)
- The pre-publish checklist (any overlapping gaps?)
- Similar packages on npm (what do they do differently that works well?)

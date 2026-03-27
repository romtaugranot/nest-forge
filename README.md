# nest-forge

[![npm version](https://img.shields.io/npm/v/nest-forge-sdk.svg)](https://www.npmjs.com/package/nest-forge-sdk)
[![license](https://img.shields.io/npm/l/nest-forge-sdk.svg)](https://github.com/romtaugranot/nest-forge/blob/main/LICENSE)

Generate fully-structured NestJS client SDK modules from OpenAPI specs (JSON or YAML). Point it at a spec, get a production-ready NestJS module with typed service, Zod validation, injectable routes, and dynamic module configuration.

Built on top of [orval](https://orval.dev) with a custom NestJS builder and post-processing pipeline.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [What Gets Generated](#what-gets-generated)
- [Using the Generated Module](#using-the-generated-module)
- [How It Works](#how-it-works)
- [CLI Reference](#cli-reference)
- [Programmatic API](#programmatic-api)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Full NestJS module** with `forRoot` / `forRootAsync` dynamic configuration
- **Zod schema validation** on every response via `safeParse`
- **Typed route map** with Mustache templates for parameterized URLs, injectable and overridable through the module
- **Split file structure** following NestJS conventions: `schemas/`, `types/`, `exceptions/`, `interfaces/`, `data/`, `utils/`
- **Kebab-case file naming** derived automatically from the OpenAPI spec title
- **Controller prefix stripping** from operation names (`SessionController_createSession` becomes `createSession`)
- **Custom exception classes** extending NestJS `HttpException` with proper Axios error wrapping
- **Zero hardcoded URLs** in the service -- all routes come from an injectable route map

## Installation

```bash
npm install -D nest-forge-sdk
```

The generated code requires these peer dependencies in your project:

```bash
npm install @nestjs/common axios zod mustache
```

## Quick Start

### CLI

```bash
# Minimal -- output goes to current directory
npx nest-forge-sdk ./openapi.json

# YAML support
npx nest-forge-sdk ./openapi.yaml

# Specify output directory
npx nest-forge-sdk --input ./openapi.yml --output ./libs
```

### Programmatic

```typescript
import { generate } from 'nest-forge-sdk';

await generate({
  input: './openapi.json', // JSON and YAML both supported
  outputDir: './libs',
});
```

## What Gets Generated

Given an OpenAPI spec with `info.title: "user-service"`, nest-forge produces:

```
libs/
  user/
    user.service.ts              # Injectable HTTP client service
    user.module.ts               # Dynamic NestJS module (forRoot / forRootAsync)
    index.ts                     # Barrel re-exporting everything
    data/
      axios-instance-token.data.ts
      route-map-token.data.ts
      options-token.data.ts
      default-routes.data.ts     # Default route map from the spec
      index.ts
    exceptions/
      user-http.exception.ts     # Wraps AxiosError into HttpException
      user-validation.exception.ts  # Wraps ZodError for failed response validation
      index.ts
    interfaces/
      user-route-map.interface.ts   # Typed route map interface
      user-module-options.interface.ts  # forRoot / forRootAsync option types
      index.ts
    schemas/                     # Zod schemas (one per OpenAPI component)
      create-user.schema.ts
      user-info.schema.ts
      ...
      index.ts
    types/                       # Inferred TypeScript types from schemas
      create-user.type.ts
      user-info.type.ts
      ...
      index.ts
    utils/
      merge-route-map.util.ts    # Merges default routes with overrides
      index.ts
```

## Using the Generated Module

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { UserModule } from './libs/user';

@Module({
  imports: [
    UserModule.forRoot({
      baseUrl: 'https://api.example.com',
    }),
  ],
})
export class AppModule {}
```

### With Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModule } from './libs/user';

@Module({
  imports: [
    UserModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        baseUrl: configService.getOrThrow('USER_SERVICE_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### With Custom Routes

Override specific routes when the API is behind a gateway or uses a different path structure:

```typescript
UserModule.forRoot({
  baseUrl: 'https://gateway.example.com',
  routes: {
    createSession: '/v2/sessions',
    getSession: '/v2/sessions/{{id}}',
  },
});
```

Only the routes you specify are overridden -- all others keep their defaults from the OpenAPI spec.

### With Axios Configuration

Pass any Axios request config (timeouts, headers, interceptors setup, etc.):

```typescript
UserModule.forRoot({
  baseUrl: 'https://api.example.com',
  axiosConfig: {
    timeout: 5000,
    headers: { 'X-Api-Key': 'my-key' },
  },
});
```

### Injecting the Service

```typescript
import { Injectable } from '@nestjs/common';
import { UserService } from './libs/user';

@Injectable()
export class MyService {
  constructor(private readonly userService: UserService) {}

  async doSomething(): Promise<void> {
    const user = await this.userService.getUser('user-123');
    console.log(user.name);
  }
}
```

## How It Works

### Pipeline

1. **Orval generation** -- Runs orval with a custom NestJS builder that produces:
   - An `@Injectable()` service class with typed methods for each API operation
   - A dynamic `@Module` with `forRoot` / `forRootAsync`
   - Exception classes, interfaces, data constants, and utility files

2. **Post-processing** -- Transforms orval's flat Zod model output:
   - Splits each `.zod.ts` file into separate `schemas/` and `types/` directories
   - Renames schema constants (`UserDto` becomes `UserSchema`)
   - Strips `Dto` suffix from type names (`UserDto` becomes `User`)
   - Rewrites all imports in the service file to point to the new locations
   - Generates barrel `index.ts` files for each directory

### Naming Conventions

All names are derived from the OpenAPI spec's `info.title`:

| Spec Title | Module Folder | Service Class | Module Class |
|---|---|---|---|
| `user-service` | `user/` | `UserService` | `UserModule` |
| `payment-gateway` | `payment-gateway/` | `PaymentGatewayService` | `PaymentGatewayModule` |
| `ssh-session-service` | `ssh-session/` | `SshSessionService` | `SshSessionModule` |

Operation names have their controller prefix stripped automatically:
- `UserController_getUser` becomes `getUser`
- `HealthController_live` becomes `live`

### Route Map

Routes are extracted from the OpenAPI spec into a typed route map with Mustache templates for parameters:

```typescript
// Generated: data/default-routes.data.ts
export const DEFAULT_ROUTES: UserRouteMap = {
  getUser: '/users/{{id}}',
  listUsers: '/users',
  createUser: '/users',
};
```

The service resolves parameterized routes at runtime using [Mustache](https://github.com/janl/mustache.js):

```typescript
// Static route -- used directly
await this.axiosInstance.get(this.routeMap.listUsers, options);

// Parameterized route -- resolved via Mustache
await this.axiosInstance.get(renderRoute(this.routeMap.getUser, { id }), options);
```

### Response Validation

Every non-void response is validated through Zod's `safeParse`:

```typescript
private validateResponse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new UserValidationException(result.error);
  }
  return result.data;
}
```

If validation fails, a `UserValidationException` (extending `HttpException` with status `502 Bad Gateway`) is thrown with the `ZodError` as the cause.

### Error Handling

All Axios errors are caught and wrapped in a typed `UserHttpException` that preserves the original status code and message:

```typescript
private handleError(error: unknown): never {
  if (error instanceof HttpException) { throw error; }
  if (!isAxiosError(error)) { throw error; }
  throw new UserHttpException(error);
}
```

## CLI Reference

```
nest-forge-sdk <openapi-spec> [options]

Options:
  -i, --input <path>    Path or URL to the OpenAPI spec (JSON/YAML)
  -o, --output <dir>    Output directory (default: current directory)
  -v, --version         Show version number
  -h, --help            Show help
```

> The `nest-forge` command is also available as an alias for backward compatibility.

## Programmatic API

### `generate(config)`

Runs the full generation pipeline.

```typescript
import { generate } from 'nest-forge-sdk';

await generate({
  input: './openapi.json',   // Path to OpenAPI spec, JSON or YAML (required)
  outputDir: './libs',       // Output directory (optional, defaults to '.')
});
```

### `nestjsBuilder`

The raw orval custom client builder, exported for advanced use cases where you want to run orval directly with your own config:

```typescript
import { defineConfig } from 'orval';
import { nestjsBuilder } from 'nest-forge-sdk';

export default defineConfig({
  api: {
    input: { target: './openapi.json' },
    output: {
      target: './my-client/my-client.service.ts',
      schemas: { type: 'zod', path: './model' },
      client: nestjsBuilder,
      mode: 'single',
    },
  },
});
```

### `postProcess(modelDir, outputDir)`

The post-processing step as a standalone function, for use with custom orval configs:

```typescript
import { postProcess } from 'nest-forge-sdk';

// After running orval...
postProcess('./model', './my-client');
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.0
- The target project must have `@nestjs/common`, `axios`, `zod`, and `mustache` installed

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

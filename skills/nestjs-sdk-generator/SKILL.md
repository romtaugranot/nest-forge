---
name: nestjs-sdk-generator
description: Generates a fully-typed NestJS client SDK module from an OpenAPI specification using nest-forge-sdk, then wires it into the user's NestJS application. Use this skill whenever the user wants to integrate with an external API or third-party service, generate an API client, create an SDK wrapper, or build a NestJS module that communicates with another service — even if they don't say "SDK" or "generate". Also trigger when the user mentions OpenAPI, Swagger specs, API integration, REST client generation, service-to-service communication, or asks how to call an external REST API from NestJS. If the user is discussing a new service integration, proactively ask whether an API spec is available.
---

# NestJS SDK Generator

Generate production-ready NestJS client SDK modules from OpenAPI specifications using `nest-forge-sdk`, then integrate them into the user's application.

## What nest-forge-sdk produces

From a single OpenAPI spec (JSON or YAML, local file or URL), `nest-forge-sdk` generates a complete NestJS module:

```
{kebab-name}/
├── {kebab-name}.service.ts       # @Injectable() service — one async method per operation
├── {kebab-name}.module.ts        # @Module with forRoot() and forRootAsync()
├── index.ts                      # Barrel: service, module, data, exceptions, types
├── data/                         # Injection tokens + default route map
├── exceptions/                   # {Name}HttpException, {Name}ValidationException
├── interfaces/                   # RouteMap, ModuleOptions, ModuleAsyncOptions
├── schemas/                      # Zod schemas (batched by OpenAPI tag)
├── types/                        # z.infer<> TypeScript types
└── utils/                        # renderRoute, mergeRouteMap
```

Every response is validated through Zod `safeParse`. Routes use `{{param}}` Mustache templates resolved at runtime. Custom exceptions extend NestJS `HttpException`.

## Workflow

Follow these phases in order. Each one builds on the previous.

### Phase 1 — Obtain the OpenAPI spec

Ask the user: **"Do you have an OpenAPI (Swagger) spec for this API?"**

**If yes:** accept a local file path (`.json`, `.yaml`, `.yml`) or an HTTP URL. Verify the file exists and is parseable — read the first few lines to confirm it has an `openapi` or `swagger` version field and at least one path under `paths`.

**If no:** help them get one:
- Many services publish a spec. Check the service's documentation site — common locations include `/docs`, `/swagger`, `/api-docs`, `/openapi.json`, `/v3/api-docs`, or a link in their developer docs.
- If the service has human-readable API docs but no downloadable spec, offer to build a minimal OpenAPI 3.0 spec covering only the endpoints the user needs. Ask them which endpoints matter and what the request/response shapes look like.
- If the API docs are behind auth or unclear, ask the user to describe the endpoints (method, path, request body, response shape) and construct the spec from that.

**For large specs:** after loading, list the available tags. If there are many (say, 8+), ask the user which ones they actually need — generating everything creates a lot of code they may never use.

### Phase 2 — Install dependencies

Check the user's `package.json` before installing anything — only add what is missing.

| Package | Type | Install command |
|---------|------|-----------------|
| `nest-forge-sdk` | devDependency | `npm install -D nest-forge-sdk` |
| `axios` | dependency | `npm install axios` |
| `zod` | dependency | `npm install zod` |

`@nestjs/common` is almost certainly already present in a NestJS project. If it is not, the user likely has a non-standard setup — ask before installing.

### Phase 3 — Generate the SDK

**Pick the output directory:**
1. Look at the project structure for an existing convention (`libs/`, `src/modules/`, `src/integrations/`)
2. If no clear convention, default to the project root — `nest-forge-sdk` creates a subfolder named after the API's `info.title`
3. Confirm with the user if you're unsure

**Pick tag filters (if applicable):**
- Use `--tags tag1,tag2` to include only certain tags
- Use `--exclude-tags tag1,tag2` to exclude certain tags
- You cannot combine both — it is one or the other
- Skip filtering entirely if the spec is small or the user wants all endpoints

**Run the generator:**
```bash
npx nest-forge-sdk <spec-path-or-url> --output <output-dir> [--tags <tags>] [--exclude-tags <tags>]
```

**After generation:** read the generated `index.ts` barrel to confirm the module, service, and types were created. Show the user the generated file tree so they know what they got.

### Phase 4 — Wire up the module

This phase connects the generated SDK into the user's NestJS app. The generated module supports two configuration patterns: `forRoot` (static) and `forRootAsync` (dynamic/factory-based).

**Ask the user how they manage configuration.** Adapt your wiring to their pattern:

#### Pattern A — ConfigModule + ConfigService (recommended for most apps)

This is the cleanest approach when config values come from a JSON file or environment loaded via `@nestjs/config`.

1. Add the base URL to the user's configuration source (e.g., `config.json`, `.env`, or a config factory):
   ```json
   {
     "someApi": {
       "baseUrl": "https://api.example.com"
     }
   }
   ```

2. Wire up with `forRootAsync`:
   ```typescript
   import { ConfigModule, ConfigService } from '@nestjs/config';
   import { SomeApiModule } from './some-api';

   @Module({
     imports: [
       SomeApiModule.forRootAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (configService: ConfigService) => ({
           baseUrl: configService.getOrThrow<string>('someApi.baseUrl'),
         }),
       }),
     ],
   })
   export class AppModule {}
   ```

3. If the user follows a key-path-as-constant convention (like the nest-forge project itself does), create a constant:
   ```typescript
   // data/some-api-config-keys.data.ts
   export const SOME_API_CONFIG_PATH = 'someApi';
   export const SOME_API_BASE_URL_CONFIG_KEY = `${SOME_API_CONFIG_PATH}.baseUrl`;
   ```

#### Pattern B — Environment variables

```typescript
SomeApiModule.forRoot({
  baseUrl: process.env.SOME_API_BASE_URL ?? 'http://localhost:3000',
})
```

#### Pattern C — Hardcoded (dev/testing only)

```typescript
SomeApiModule.forRoot({
  baseUrl: 'https://api.example.com',
})
```

#### Optional: custom Axios configuration

If the user needs auth headers, timeouts, or interceptors:

```typescript
SomeApiModule.forRoot({
  baseUrl: 'https://api.example.com',
  axiosConfig: {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  },
})
```

#### Optional: route overrides

If certain endpoints are proxied or versioned differently:

```typescript
SomeApiModule.forRoot({
  baseUrl: 'https://api.example.com',
  routes: {
    getUser: '/v2/users/{{id}}',
  },
})
```

### Phase 5 — Verify and demonstrate

1. Run the project's build or type-check command (`npx tsc --noEmit` or equivalent) to verify the module compiles
2. Show the user a concrete usage example — inject the service into one of their existing services or controllers:
   ```typescript
   import { SomeApiService } from './some-api';

   @Injectable()
   export class MyService {
     constructor(private readonly someApiService: SomeApiService) {}

     async fetchData(): Promise<SomeType> {
       return await this.someApiService.getSomething({ id: '123' });
     }
   }
   ```
3. Briefly explain the error handling model: Axios errors become `{Name}HttpException` (preserving the upstream status code), and unexpected response shapes become `{Name}ValidationException` (502 Bad Gateway) — so the consumer gets clear, typed errors without extra try/catch boilerplate

## Reference: CLI flags

| Flag | Short | Description |
|------|-------|-------------|
| `--input <path\|url>` | `-i` | Path or URL to the OpenAPI spec |
| `--output <dir>` | `-o` | Output directory (default: current directory) |
| `--tags <csv>` | `-t` | Comma-separated tags to include |
| `--exclude-tags <csv>` | | Comma-separated tags to exclude |
| `--version` | `-v` | Print version |
| `--help` | `-h` | Print help |

The first positional argument is treated as `--input`, so `npx nest-forge-sdk ./spec.json` works without the flag.

## Reference: naming conventions

| OpenAPI `info.title` | Module folder | Service class | Module class |
|----------------------|---------------|---------------|--------------|
| `user-service` | `user/` | `UserService` | `UserModule` |
| `Payment Gateway` | `payment-gateway/` | `PaymentGatewayService` | `PaymentGatewayModule` |
| `SSH Session Service` | `ssh-session/` | `SshSessionService` | `SshSessionModule` |

Operation names come from `operationId` (with controller prefixes like `UserController_` stripped). If no `operationId` exists, they are derived from the HTTP verb and path (e.g., `GET /users/{id}` becomes `getUsersById`).

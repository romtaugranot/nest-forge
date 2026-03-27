import type {
  ClientBuilder,
  ClientDependenciesBuilder,
  ClientExtraFilesBuilder,
  ClientFileBuilder,
  ClientFooterBuilder,
  ClientGeneratorsBuilder,
  ClientHeaderBuilder,
  ClientTitleBuilder,
  GeneratorClient,
  GeneratorDependency,
  GeneratorImport,
  GeneratorOptions,
  GeneratorVerbOptions,
  OutputClientFunc,
} from '@orval/core';
import {
  generateFormDataAndUrlEncodedFunction,
  generateOptions,
  generateVerbImports,
  getFileInfo,
  kebab,
  toObjectString,
  upath,
} from '@orval/core';
import type { RouteInfo } from '../interfaces';
import {
  deriveBaseName,
  camelToScreamingSnake,
  extractRouteParams,
  toMustacheRoute,
} from '../helpers';

// ── Collected route info (populated during implementation, consumed by extraFiles) ──

const collectedRoutes: RouteInfo[] = [];

// ── Title ───────────────────────────────────────────────────────────

const generateNestjsTitle: ClientTitleBuilder = (title: string): string => {
  const baseName = deriveBaseName(title);
  return `${baseName}Service`;
};

// ── Dependencies ────────────────────────────────────────────────────

const NESTJS_DEPENDENCIES: GeneratorDependency[] = [
  {
    exports: [
      { name: 'AxiosInstance' },
      { name: 'AxiosRequestConfig' },
      { name: 'isAxiosError', values: true },
    ],
    dependency: 'axios',
  },
  {
    exports: [
      { name: 'Injectable', values: true },
      { name: 'Inject', values: true },
      { name: 'HttpException', values: true },
    ],
    dependency: '@nestjs/common',
  },
  {
    exports: [{ name: 'ZodType' }],
    dependency: 'zod',
  },
];

const getNestjsDependencies: ClientDependenciesBuilder = (): GeneratorDependency[] => [
  ...NESTJS_DEPENDENCIES,
];

// ── Header ──────────────────────────────────────────────────────────

const generateNestjsHeader: ClientHeaderBuilder = ({ title }): string => {
  const baseName = title.replace(/Service$/, '');
  const httpExceptionName = `${baseName}HttpException`;
  const validationExceptionName = `${baseName}ValidationException`;
  const routeMapName = `${baseName}RouteMap`;

  return `
import { ${httpExceptionName}, ${validationExceptionName} } from './exceptions';
import { AXIOS_INSTANCE_TOKEN, ROUTE_MAP_TOKEN } from './data';
import type { ${routeMapName} } from './interfaces';
import { renderRoute } from './utils';

@Injectable()
export class ${title} {
  constructor(
    @Inject(AXIOS_INSTANCE_TOKEN)
    private readonly axiosInstance: AxiosInstance,
    @Inject(ROUTE_MAP_TOKEN)
    private readonly routeMap: ${routeMapName},
  ) {}

  private validateResponse<T>(schema: ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ${validationExceptionName}(result.error);
    }
    return result.data;
  }

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (!isAxiosError(error)) {
      throw error;
    }
    throw new ${httpExceptionName}(error);
  }
`;
};

// ── Implementation (per verb) ───────────────────────────────────────

const generateNestjsImplementation = (
  verbOptions: GeneratorVerbOptions,
  options: GeneratorOptions,
): string => {
  const {
    headers,
    queryParams,
    operationName,
    response,
    body,
    props,
    verb,
    override,
    formData,
    formUrlEncoded,
    paramsSerializer,
  } = verbOptions;
  const { route, context } = options;

  const isRequestOptions = override.requestOptions !== false;
  const isFormData = !override.formData.disabled;
  const isFormUrlEncoded = override.formUrlEncoded !== false;
  const isExactOptionalPropertyTypes =
    !!context.output.tsconfig?.compilerOptions?.exactOptionalPropertyTypes;

  const bodyForm = generateFormDataAndUrlEncodedFunction({
    formData,
    formUrlEncoded,
    body,
    isFormData,
    isFormUrlEncoded,
  });

  const dataType = response.definition.success || 'unknown';
  const isVoid = dataType === 'void';
  const returnType = isVoid ? 'void' : dataType;

  // Extract the primary (non-primitive) type for validateResponse schema argument.
  // Union types like "FooResponse | string" are valid TS annotations but not valid
  // JS expressions — only the schema identifier can be passed to validateResponse.
  const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'void', 'unknown', 'null', 'undefined']);
  const primaryType = dataType.includes('|')
    ? dataType.split('|').map((t) => t.trim()).find((t) => !PRIMITIVE_TYPES.has(t)) ?? dataType
    : dataType;

  const axiosOptions = generateOptions({
    route,
    body,
    headers,
    queryParams,
    response,
    verb,
    requestOptions: override.requestOptions,
    isFormData,
    isFormUrlEncoded,
    paramsSerializer,
    paramsSerializerOptions: override.paramsSerializerOptions,
    isExactOptionalPropertyTypes,
    hasSignal: false,
  });

  // Collect route info for JSON generation in extraFiles
  const params = extractRouteParams(route);
  const constantName = `${camelToScreamingSnake(operationName)}_ROUTE`;
  const mustacheRoute = toMustacheRoute(route);
  collectedRoutes.push({ operationName, constantName, mustacheRoute, params });

  // Build the route expression for the axios call
  let routeRef: string;
  if (params.length > 0) {
    const paramsObj = params.join(', ');
    routeRef = `renderRoute(this.routeMap.${operationName}, { ${paramsObj} })`;
  } else {
    routeRef = `this.routeMap.${operationName}`;
  }
  const axiosOptionsWithRoute = axiosOptions.replace(/`[^`]*`/, routeRef);

  const propsStr = toObjectString(props, 'implementation');
  const optionsParam = isRequestOptions ? `options?: AxiosRequestConfig\n` : '';

  if (isVoid) {
    return `  async ${operationName}(
    ${propsStr} ${optionsParam}): Promise<void> {
    try {${bodyForm}
      await this.axiosInstance.${verb}(${axiosOptionsWithRoute});
    } catch (error) {
      this.handleError(error);
    }
  }
`;
  }

  return `  async ${operationName}(
    ${propsStr} ${optionsParam}): Promise<${returnType}> {
    try {${bodyForm}
      const { data: responseData } = await this.axiosInstance.${verb}<${returnType}>(${axiosOptionsWithRoute});
      return this.validateResponse(${primaryType}, responseData);
    } catch (error) {
      this.handleError(error);
    }
  }
`;
};

// ── Client builder ──────────────────────────────────────────────────

const generateNestjsClient: ClientBuilder = (
  verbOptions: GeneratorVerbOptions,
  options: GeneratorOptions,
): GeneratorClient => {
  const imports = generateVerbImports(verbOptions);

  const responseType = verbOptions.response.definition.success;
  const valueImports: GeneratorImport[] = [];

  if (responseType && responseType !== 'void') {
    // For union types like "FooResponse | string", import only the primary
    // (non-primitive) type as a value — primitives don't need importing.
    const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'void', 'unknown', 'null', 'undefined']);
    const primaryImportType = responseType.includes('|')
      ? responseType.split('|').map((t) => t.trim()).find((t) => !PRIMITIVE_TYPES.has(t))
      : responseType;
    if (primaryImportType) {
      valueImports.push({ name: primaryImportType, values: true });
    }
  }

  const implementation = generateNestjsImplementation(verbOptions, options);

  return { implementation, imports: [...imports, ...valueImports] };
};

// ── Footer ──────────────────────────────────────────────────────────

const generateNestjsFooter: ClientFooterBuilder = ({ operationNames: _operationNames }): string =>
  '}\n';

// ── Extra files ─────────────────────────────────────────────────────

const generateNestjsExtraFiles: ClientExtraFilesBuilder = (
  _verbOptions,
  output,
  context,
): Promise<ClientFileBuilder[]> => {
  const specTitle = context.spec.info?.title ?? 'Api';
  const baseName = deriveBaseName(specTitle);
  const serviceTitle = generateNestjsTitle(specTitle);

  const { dirname, extension } = getFileInfo(output.target);

  const kebabBase = kebab(baseName);
  const serviceFilename = `${kebabBase}.service`;
  const moduleClassName = `${baseName}Module`;
  const httpExceptionName = `${baseName}HttpException`;
  const validationExceptionName = `${baseName}ValidationException`;
  const routeMapName = `${baseName}RouteMap`;
  const optionsTokenName = `${baseName.toUpperCase()}_MODULE_OPTIONS`;

  const files: ClientFileBuilder[] = [];

  // --- Data: injection tokens ---

  files.push({
    path: upath.join(dirname, `data/axios-instance-token.data${extension}`),
    content: `export const AXIOS_INSTANCE_TOKEN = 'AXIOS_INSTANCE';\n`,
  });

  files.push({
    path: upath.join(dirname, `data/route-map-token.data${extension}`),
    content: `export const ROUTE_MAP_TOKEN = 'ROUTE_MAP';\n`,
  });

  files.push({
    path: upath.join(dirname, `data/options-token.data${extension}`),
    content: `export const OPTIONS_TOKEN = '${optionsTokenName}';\n`,
  });

  // --- Data: default routes ---

  const routeEntries = collectedRoutes
    .map(({ operationName, mustacheRoute }) => `  ${operationName}: '${mustacheRoute}',`)
    .join('\n');

  files.push({
    path: upath.join(dirname, `data/default-routes.data${extension}`),
    content: `import type { ${routeMapName} } from '../interfaces';\n\nexport const DEFAULT_ROUTES: ${routeMapName} = {\n${routeEntries}\n};\n`,
  });

  // --- Data: barrel ---

  files.push({
    path: upath.join(dirname, `data/index${extension}`),
    content: `export { AXIOS_INSTANCE_TOKEN } from './axios-instance-token.data';
export { ROUTE_MAP_TOKEN } from './route-map-token.data';
export { OPTIONS_TOKEN } from './options-token.data';
export { DEFAULT_ROUTES } from './default-routes.data';
`,
  });

  // --- Exception files ---

  files.push({
    path: upath.join(dirname, `exceptions/${kebabBase}-http.exception${extension}`),
    content: `import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';

export class ${httpExceptionName} extends HttpException {
  constructor(error: AxiosError) {
    const status = error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const data: unknown = error.response?.data;
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String(data.message)
        : error.message;
    super(message, status, { cause: error });
  }
}
`,
  });

  files.push({
    path: upath.join(dirname, `exceptions/${kebabBase}-validation.exception${extension}`),
    content: `import { HttpException, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';

export class ${validationExceptionName} extends HttpException {
  constructor(error: ZodError) {
    super('Response validation failed', HttpStatus.BAD_GATEWAY, {
      cause: error,
    });
  }
}
`,
  });

  files.push({
    path: upath.join(dirname, `exceptions/index${extension}`),
    content: `export { ${httpExceptionName} } from './${kebabBase}-http.exception';
export { ${validationExceptionName} } from './${kebabBase}-validation.exception';
`,
  });

  // --- Interfaces ---

  const routeMapFields = collectedRoutes
    .map(({ operationName }) => `  readonly ${operationName}: string;`)
    .join('\n');

  files.push({
    path: upath.join(dirname, `interfaces/${kebabBase}-route-map.interface${extension}`),
    content: `export interface ${routeMapName} {\n${routeMapFields}\n}\n`,
  });

  files.push({
    path: upath.join(dirname, `interfaces/${kebabBase}-module-options.interface${extension}`),
    content: `import type { AxiosRequestConfig } from 'axios';
import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
} from '@nestjs/common';
import type { ${routeMapName} } from './${kebabBase}-route-map.interface';

export interface ${baseName}ModuleOptions {
  readonly baseUrl: string;
  readonly routes?: Partial<${routeMapName}>;
  readonly axiosConfig?: AxiosRequestConfig;
}

export interface ${baseName}ModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  readonly useFactory: (
    ...arguments_: unknown[]
  ) => ${baseName}ModuleOptions | Promise<${baseName}ModuleOptions>;
  readonly inject?: Array<InjectionToken | OptionalFactoryDependency>;
}
`,
  });

  files.push({
    path: upath.join(dirname, `interfaces/index${extension}`),
    content: `export type { ${routeMapName} } from './${kebabBase}-route-map.interface';
export type {
  ${baseName}ModuleOptions,
  ${baseName}ModuleAsyncOptions,
} from './${kebabBase}-module-options.interface';
`,
  });

  // --- Utils ---

  files.push({
    path: upath.join(dirname, `utils/merge-route-map.util${extension}`),
    content: `import type { ${routeMapName} } from '../interfaces';

export const mergeRouteMap = (
  defaults: ${routeMapName},
  overrides?: Partial<${routeMapName}>,
): ${routeMapName} => {
  if (!overrides) {
    return defaults;
  }
  const filtered = Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  return Object.assign({}, defaults, filtered);
};
`,
  });

  files.push({
    path: upath.join(dirname, `utils/render-route.util${extension}`),
    content: `export const renderRoute = (
  template: string,
  params: Record<string, string>,
): string =>
  template.replace(/\\{\\{(\\w+)\\}\\}/g, (_: string, key: string) => params[key] ?? '');
`,
  });

  files.push({
    path: upath.join(dirname, `utils/index${extension}`),
    content: `export { mergeRouteMap } from './merge-route-map.util';
export { renderRoute } from './render-route.util';
`,
  });

  // --- Module ---

  files.push({
    path: upath.join(dirname, `${kebabBase}.module${extension}`),
    content: `/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { ${serviceTitle} } from './${serviceFilename}';
import {
  AXIOS_INSTANCE_TOKEN,
  DEFAULT_ROUTES,
  OPTIONS_TOKEN,
  ROUTE_MAP_TOKEN,
} from './data';
import type {
  ${routeMapName},
  ${baseName}ModuleOptions,
  ${baseName}ModuleAsyncOptions,
} from './interfaces';
import { mergeRouteMap } from './utils';

@Module({})
export class ${moduleClassName} {
  static forRoot({
    baseUrl,
    routes,
    axiosConfig,
  }: ${baseName}ModuleOptions): DynamicModule {
    return {
      module: ${moduleClassName},
      providers: [
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useValue: axios.create({ ...axiosConfig, baseURL: baseUrl }),
        },
        {
          provide: ROUTE_MAP_TOKEN,
          useValue: mergeRouteMap(DEFAULT_ROUTES, routes),
        },
        ${serviceTitle},
      ],
      exports: [${serviceTitle}],
    };
  }

  static forRootAsync({
    useFactory,
    inject,
    imports,
  }: ${baseName}ModuleAsyncOptions): DynamicModule {
    return {
      module: ${moduleClassName},
      imports: imports ?? [],
      providers: [
        {
          provide: OPTIONS_TOKEN,
          useFactory,
          inject: inject ?? [],
        },
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useFactory: (options: ${baseName}ModuleOptions): AxiosInstance =>
            axios.create({ ...options.axiosConfig, baseURL: options.baseUrl }),
          inject: [OPTIONS_TOKEN],
        },
        {
          provide: ROUTE_MAP_TOKEN,
          useFactory: (options: ${baseName}ModuleOptions): ${routeMapName} =>
            mergeRouteMap(DEFAULT_ROUTES, options.routes),
          inject: [OPTIONS_TOKEN],
        },
        ${serviceTitle},
      ],
      exports: [${serviceTitle}],
    };
  }
}
`,
  });

  // --- Main barrel ---

  files.push({
    path: upath.join(dirname, `index${extension}`),
    content: `export { ${serviceTitle} } from './${serviceFilename}';
export { ${moduleClassName} } from './${kebabBase}.module';
export * from './data';
export * from './exceptions';
export type {
  ${routeMapName},
  ${baseName}ModuleOptions,
  ${baseName}ModuleAsyncOptions,
} from './interfaces';
`,
  });

  // Clear collected routes for potential subsequent runs
  collectedRoutes.length = 0;

  return Promise.resolve(files);
};

// ── Assemble ────────────────────────────────────────────────────────

const nestjsClientBuilder: ClientGeneratorsBuilder = {
  client: generateNestjsClient,
  header: generateNestjsHeader,
  footer: generateNestjsFooter,
  title: generateNestjsTitle,
  dependencies: getNestjsDependencies,
  extraFiles: generateNestjsExtraFiles,
};

export const nestjsBuilder: OutputClientFunc = () => nestjsClientBuilder;

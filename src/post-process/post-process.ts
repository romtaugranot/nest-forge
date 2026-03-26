import {
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import type { ParsedModel, TransformedNames } from '../interfaces';
import { pascalToKebab } from '../helpers';
import { log } from '../logger';

// ── Utilities ──────────────────────────────────────────────────────

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripOrvalHeader = (content: string): string =>
  content.replace(/\/\*\*\s*\n(?:\s*\*[^\n]*\n)*?\s*\*\/\s*\n/, '');

const stripOrvalHeadersRecursive = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      stripOrvalHeadersRecursive(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      const content = readFileSync(fullPath, 'utf-8');
      const stripped = stripOrvalHeader(content);
      if (stripped !== content) {
        writeFileSync(fullPath, stripped);
      }
    }
  }
};

const ensureDir = (dirPath: string): void => {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
  mkdirSync(dirPath, { recursive: true });
};

// ── Parse a single .zod.ts model file ──────────────────────────────

const parseModelFile = (filePath: string): ParsedModel | null => {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let schemaStartIndex = -1;
  let firstTypeIndex = -1;
  let originalName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^export const [A-Z]/.test(line) && schemaStartIndex === -1) {
      schemaStartIndex = i;
      const match = line.match(/^export const (\w+)/);
      if (match) {
        originalName = match[1];
      }
    }
    if (/^export type /.test(line) && firstTypeIndex === -1) {
      firstTypeIndex = i;
    }
  }

  if (schemaStartIndex === -1 || firstTypeIndex === -1 || !originalName) {
    return null;
  }

  const constantLines: string[] = [];
  for (let i = 0; i < schemaStartIndex; i++) {
    if (/^export const [a-z]/.test(lines[i])) {
      constantLines.push(lines[i]);
    }
  }

  const schemaBody = lines.slice(schemaStartIndex, firstTypeIndex).join('\n').trimEnd();
  const typeExports = lines.slice(firstTypeIndex).filter((l) => l.startsWith('export type'));

  return { originalName, constantLines, schemaBody, typeExports };
};

// ── Name transformation ────────────────────────────────────────────

const transformNames = (originalName: string): TransformedNames => {
  const endsWithDto = originalName.endsWith('Dto');

  const schemaName = endsWithDto ? originalName.replace(/Dto$/, 'Schema') : `${originalName}Schema`;

  const typeName = endsWithDto ? originalName.replace(/Dto$/, '') : originalName;

  const outputTypeName = endsWithDto
    ? originalName.replace(/Dto$/, 'Output')
    : `${originalName}Output`;

  const kebabBase = pascalToKebab(typeName);

  return { schemaName, typeName, outputTypeName, kebabBase };
};

// ── Generate file contents ─────────────────────────────────────────

const generateSchemaFile = (parsed: ParsedModel, names: TransformedNames): string => {
  const renamedBody = parsed.schemaBody.replace(
    `export const ${parsed.originalName}`,
    `export const ${names.schemaName}`,
  );

  const hasEscapedStrings = renamedBody.includes('\\"') || renamedBody.includes('\\*');
  const parts: string[] = [];
  if (hasEscapedStrings) {
    parts.push('/* eslint-disable no-useless-escape */');
  }
  parts.push("import { z as zod } from 'zod';", '');

  if (parsed.constantLines.length > 0) {
    parts.push(...parsed.constantLines, '');
  }

  parts.push(renamedBody, '');

  return parts.join('\n');
};

const generateTypeFile = (names: TransformedNames): string =>
  `import type { z } from 'zod';
import { ${names.schemaName} } from '../schemas/${names.kebabBase}.schema';

export type ${names.typeName} = z.input<typeof ${names.schemaName}>;
export type ${names.outputTypeName} = z.output<typeof ${names.schemaName}>;
`;

const generateBarrel = (entries: string[]): string =>
  entries.map((entry) => `export * from './${entry}';`).join('\n') + '\n';

// ── Process all model files ────────────────────────────────────────

const processModelFiles = (
  modelDir: string,
  schemasDir: string,
  typesDir: string,
): Map<string, TransformedNames> => {
  const modelFiles = readdirSync(modelDir).filter(
    (f) => f.endsWith('.zod.ts') && f !== 'index.zod.ts',
  );

  ensureDir(schemasDir);
  ensureDir(typesDir);

  const schemaBarrelEntries: string[] = [];
  const typeBarrelEntries: string[] = [];
  const nameMap = new Map<string, TransformedNames>();

  for (const file of modelFiles) {
    const filePath = join(modelDir, file);
    const parsed = parseModelFile(filePath);

    if (!parsed) {
      log.warn('Could not parse model file, skipping:', file);
      continue;
    }

    const names = transformNames(parsed.originalName);
    nameMap.set(parsed.originalName, names);

    const schemaContent = generateSchemaFile(parsed, names);
    writeFileSync(join(schemasDir, `${names.kebabBase}.schema.ts`), schemaContent);
    schemaBarrelEntries.push(`${names.kebabBase}.schema`);

    const typeContent = generateTypeFile(names);
    writeFileSync(join(typesDir, `${names.kebabBase}.type.ts`), typeContent);
    typeBarrelEntries.push(`${names.kebabBase}.type`);
  }

  writeFileSync(join(schemasDir, 'index.ts'), generateBarrel(schemaBarrelEntries));
  writeFileSync(join(typesDir, 'index.ts'), generateBarrel(typeBarrelEntries));

  return nameMap;
};

// ── Update the service file imports and references ─────────────────

const findLastImportIndex = (content: string): number => {
  const lines = content.split('\n');
  let lastImportIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) {
      lastImportIndex = i;
    }
    if (/^\s*\}.*from\s/.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  return lastImportIndex;
};

const updateServiceFile = (outputDir: string, nameMap: Map<string, TransformedNames>): void => {
  const serviceFiles = readdirSync(outputDir).filter((f) => f.endsWith('.service.ts'));

  for (const serviceFile of serviceFiles) {
    const filePath = join(outputDir, serviceFile);
    let content = readFileSync(filePath, 'utf-8');

    const valueImportRegex = /import\s*\{([^}]+)\}\s*from\s*'\.\.\/model\/index\.zod';/s;
    const typeImportRegex = /import\s+type\s*\{([^}]+)\}\s*from\s*'\.\.\/model\/index\.zod';/s;

    const valueMatch = content.match(valueImportRegex);
    const typeMatch = content.match(typeImportRegex);

    const parseImportNames = (importStr: string | null): string[] => {
      if (!importStr) {
        return [];
      }
      return importStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const valueImportNames = parseImportNames(valueMatch ? valueMatch[1] : null);
    const typeImportNames = parseImportNames(typeMatch ? typeMatch[1] : null);

    const schemaImports: string[] = [];
    const typeImports = new Set<string>();

    for (const name of valueImportNames) {
      const names = nameMap.get(name);
      if (names) {
        schemaImports.push(names.schemaName);
        typeImports.add(names.typeName);
      }
    }

    for (const name of typeImportNames) {
      const names = nameMap.get(name);
      if (names) {
        typeImports.add(names.typeName);
      }
    }

    content = content.replace(valueImportRegex, '');
    content = content.replace(typeImportRegex, '');

    // Replace value usages (validateResponse arg + direct .safeParse)
    for (const name of valueImportNames) {
      const names = nameMap.get(name);
      if (!names) {
        continue;
      }
      content = content.replace(
        new RegExp(`this\\.validateResponse\\(${escapeRegex(name)}\\b`, 'g'),
        `this.validateResponse(${names.schemaName}`,
      );
      content = content.replace(
        new RegExp(`\\b${escapeRegex(name)}\\.safeParse`, 'g'),
        `${names.schemaName}.safeParse`,
      );
    }

    // Replace remaining type-position references
    for (const name of valueImportNames) {
      const names = nameMap.get(name);
      if (!names) {
        continue;
      }
      content = content.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'), names.typeName);
    }

    for (const name of typeImportNames) {
      const names = nameMap.get(name);
      if (!names) {
        continue;
      }
      content = content.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'), names.typeName);
    }

    // Build new import blocks (schemas/ and types/ are sibling dirs)
    const newImports: string[] = [];

    if (schemaImports.length > 0) {
      newImports.push(`import {\n  ${schemaImports.join(',\n  ')},\n} from './schemas';`);
    }

    if (typeImports.size > 0) {
      const sortedTypes = [...typeImports].sort();
      newImports.push(`import type {\n  ${sortedTypes.join(',\n  ')},\n} from './types';`);
    }

    const importInsertionPoint = findLastImportIndex(content);
    const lines = content.split('\n');
    lines.splice(importInsertionPoint + 1, 0, ...newImports);
    content = lines.join('\n');

    content = content.replace(/\n{3,}/g, '\n\n');

    // Strip the "Generated by orval" header and add eslint-disable
    content = stripOrvalHeader(content);
    content =
      '/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */\n' +
      content;

    writeFileSync(filePath, content);
    log.info('Updated service file:', serviceFile);
  }
};

// ── Update the main barrel to include schema/type re-exports ───────

const updateMainBarrel = (outputDir: string): void => {
  const barrelPath = join(outputDir, 'index.ts');

  if (!existsSync(barrelPath)) {
    log.warn('Main barrel not found:', barrelPath);
    return;
  }

  let content = readFileSync(barrelPath, 'utf-8');

  const reExports = ["export * from './schemas';", "export * from './types';"];

  content = content.trimEnd() + '\n' + reExports.join('\n') + '\n';

  writeFileSync(barrelPath, content);
  log.info('Updated main barrel with schema/type re-exports');
};

// ── Cleanup ────────────────────────────────────────────────────────

const cleanup = (modelDir: string, outputDir: string): void => {
  if (existsSync(modelDir)) {
    rmSync(modelDir, { recursive: true, force: true });
    log.info('Deleted model/ directory');
  }

  // Delete stale module files that don't match the expected kebab-case naming
  const serviceFiles = readdirSync(outputDir).filter((f) => f.endsWith('.service.ts'));
  const expectedModuleBases = new Set(serviceFiles.map((f) => f.replace('.service.ts', '')));

  const outputFiles = readdirSync(outputDir);
  for (const file of outputFiles) {
    if (!file.endsWith('.module.ts')) {
      continue;
    }
    const moduleBase = file.replace('.module.ts', '');
    if (!expectedModuleBases.has(moduleBase)) {
      unlinkSync(join(outputDir, file));
      log.info('Deleted stale module file:', file);
    }
  }
};

// ── Public API ─────────────────────────────────────────────────────

export const postProcess = (modelDir: string, outputDir: string): void => {
  log.info('Post-processing Orval output...');

  if (!existsSync(modelDir)) {
    throw new Error(`Model directory not found: ${modelDir}`);
  }

  // Strip "Generated by orval" headers from all generated files
  stripOrvalHeadersRecursive(outputDir);

  const schemasDir = join(outputDir, 'schemas');
  const typesDir = join(outputDir, 'types');

  const nameMap = processModelFiles(modelDir, schemasDir, typesDir);
  log.info(`Processed ${nameMap.size} model files`);

  updateServiceFile(outputDir, nameMap);
  updateMainBarrel(outputDir);
  cleanup(modelDir, outputDir);

  log.info('Post-processing complete.');
};

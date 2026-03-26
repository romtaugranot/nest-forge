export interface ParsedModel {
  readonly originalName: string;
  readonly constantLines: string[];
  readonly schemaBody: string;
  readonly typeExports: string[];
}

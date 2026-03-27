export interface NestForgeConfig {
  readonly input: string;
  readonly outputDir?: string;
  readonly tags?: string[];
  readonly excludeTags?: string[];
}

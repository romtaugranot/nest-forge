# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-03-27

### Added
- Claude Code plugin with SDK generator skill for AI-assisted API integration
- Plugin structure (`.claude-plugin/plugin.json`, `skills/nestjs-sdk-generator/SKILL.md`)
- Claude Code Integration section in README

## [1.2.2] - 2026-03-27

### Added
- Publishing gate rule: never publish to npm until all CI workflows succeed
- NestJS package development skill with pre-publish and version-release checklists

### Changed
- CONTRIBUTING.md now includes a publishing section with CI gate requirement

## [1.1.0] - 2026-03-27

### Added
- YAML (.yaml/.yml) OpenAPI spec support for both local files and URL inputs
- `nest-forge-sdk` as primary CLI binary name (alongside `nest-forge` alias for backward compatibility)

## [1.0.0] - 2026-03-26

### Added
- CLI tool (`nest-forge` command) for generating NestJS client SDK modules from OpenAPI specs
- Programmatic API (`generate`, `nestjsBuilder`, `postProcess`)
- Custom Orval builder for NestJS with Zod validation
- Post-processing pipeline: model splitting, import rewriting, barrel generation
- Dynamic module generation with `forRoot` / `forRootAsync`
- Route map with Mustache template support
- Exception classes wrapping Axios and Zod errors
- `--version` / `-v` flag for CLI

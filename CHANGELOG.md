# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

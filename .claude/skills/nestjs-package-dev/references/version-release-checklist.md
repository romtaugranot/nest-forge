# Version Release Checklist

Follow this process when cutting a new version of the package.

## Before the Release

### 1. Determine Version Bump

Review all changes since the last release:

```bash
# See commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# See file changes
git diff $(git describe --tags --abbrev=0)..HEAD --stat
```

Apply semver:

| Change type | Bump | Example |
|---|---|---|
| Bug fix, typo, internal refactor | Patch | 1.0.0 -> 1.0.1 |
| New feature, new export, new optional config | Minor | 1.0.0 -> 1.1.0 |
| Removed export, renamed method, changed signature, dropped Node version, narrowed peer dep range | Major | 1.0.0 -> 2.0.0 |

**Watch for hidden breaking changes:**
- Changing a default value is breaking (consumers rely on defaults)
- Narrowing a type (e.g., `string` to `string literal union`) is breaking
- Adding a required field to a config interface is breaking
- Changing error types thrown by a method is breaking

### 2. Run the Full Pre-Publish Checklist

Read `pre-publish-checklist.md` and run through every section. A release should never go out with checklist failures.

### 3. Search for Latest Best Practices

Before releasing, check online:
- Are there new NestJS versions that affect compatibility?
- Have any peer dependency packages released breaking versions?
- Are there deprecation notices for APIs you use?

### 4. Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit

# Update if needed (be careful with major bumps)
npm update
```

### 5. Run All Quality Gates

```bash
npm run lint
npm run format:check
npm test
npm run build
```

All must pass. No exceptions.

## Preparing the Release

### 6. Update CHANGELOG.md

Add an entry for the new version at the top of the changelog. Follow the Keep a Changelog format:

```markdown
## [1.1.0] - 2026-03-26

### Added
- New `configure()` method for runtime reconfiguration
- Support for custom error handlers via `forRootAsync`

### Changed
- Improved error messages for invalid configuration

### Fixed
- Route parameter extraction for nested paths

### Deprecated
- `legacyInit()` method — use `forRoot()` instead (will be removed in 2.0.0)
```

Categories: Added, Changed, Deprecated, Removed, Fixed, Security. Only include categories that have entries.

### 7. Bump the Version

```bash
# For patch (1.0.0 -> 1.0.1)
npm version patch

# For minor (1.0.0 -> 1.1.0)
npm version minor

# For major (1.0.0 -> 2.0.0)
npm version major
```

`npm version` automatically:
- Updates `version` in package.json
- Creates a git commit with message `v1.1.0`
- Creates a git tag `v1.1.0`

If you prefer to do it manually:
1. Edit `version` in package.json
2. `git add package.json package-lock.json`
3. `git commit -m "Bump version to 1.1.0"`
4. `git tag v1.1.0`

### 8. Update README if Needed

If the release includes new features or API changes, update the README to reflect them. Every example in the README should work with the new version.

## Publishing

### 9. Push and Wait for CI

If the project has a release workflow (`.github/workflows/release.yml`):

```bash
git push origin main
```

**Do NOT push the tag until all CI workflows pass on the pushed commit.** Check workflow status:

```bash
gh run list --branch main --limit 5
```

Only after every CI workflow shows a green/success status:

```bash
git push origin v1.1.0
```

The tag push triggers the release workflow which handles publishing. **Never publish to npm until all CI workflows succeed — no exceptions.**

### 10. Manual Publishing (if no CI/CD)

Before publishing manually, verify that all quality gates pass locally:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

**Do not publish if any of the above fail.** Only after all pass:

```bash
# Dry run first — always
npm publish --dry-run

# If everything looks right
npm publish
```

For scoped packages that should be public:
```bash
npm publish --access public
```

### 11. Publish to GitHub Packages (if configured)

If publishing to both npm and GitHub Packages, the release workflow handles this. For manual publishing:

```bash
# Temporarily switch registry
npm config set registry https://npm.pkg.github.com
npm publish
# Switch back
npm config set registry https://registry.npmjs.org
```

## After the Release

### 12. Verify the Published Package

```bash
# Check the package is on npm
npm view <package-name> version

# Check the published files
npm pack <package-name> --dry-run

# Test install in a fresh directory
mkdir /tmp/test-install && cd /tmp/test-install
npm init -y
npm install <package-name>
```

### 13. Create a GitHub Release (optional but recommended)

```bash
gh release create v1.1.0 \
  --title "v1.1.0" \
  --notes "$(cat CHANGELOG.md | sed -n '/## \[1.1.0\]/,/## \[/p' | head -n -1)"
```

Or create the release manually on GitHub with the changelog entry as the body.

### 14. Announce (if the package has users)

- Update any related documentation sites
- Post in relevant channels if the release includes notable changes
- If it's a major version with breaking changes, provide a migration guide

# Changelog

All notable changes to `@fjell/lib-firestore` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Align `@google-cloud/firestore` peerDependency to `^8` to match the SDK major used in development and CI
- Clarify QueryBuilder error messaging: OR compound conditions are not implemented (no longer references SDK v7/v10 skew)
- Bump vitest/eslint toolchain within current majors (vitest 4.1.x, eslint 9.39.x, typescript-eslint 8.63.x)

### Added
- Explicit `package.json` `files` whitelist for npm publish (`dist`, README, LICENSE, CHANGELOG, guide)

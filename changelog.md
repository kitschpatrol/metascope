# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Maintenance

- Integrate chagent into release preparation, update the release-changelog action, and adjust lint and dependency-analysis configuration.
- Update the certifi pin in a Python parsing fixture to remove distrusted eMudhra root certificates.

## [0.13.9] - 2026-11-01

### Documentation

- Remove the unreliable bundle-size badge from the README.

### Maintenance

- Update lognow, string-ts, updates, and tsdown requirements and refresh dependency-release-age exceptions.

## [0.13.8] - 2026-10-29

### Changed

- Reduce extraction overhead through concurrent Git plumbing commands, lazy shared file-tree construction, and GitHub credential lookup only when selected online sources need it.

### Fixed

- Include tracked files with non-ASCII names in tracked-size calculations.
- Select the highest dotted tag version correctly when major-only tags are also present.
- Count registered submodules even when an unregistered gitlink is staged.
- Detect Git LFS through tracked-file attributes without requiring the git-lfs executable.
- Make partial console-like loggers passed to `setLogger()` receive messages without requiring a trace method or unexpectedly enabling stderr debug output.

### Maintenance

- Remove simple-git and refresh runtime dependencies, build and test tools, and pnpm.
- Expand Git-statistics and extraction regression coverage, allow slower temporary-repository tests, and refresh the performance baseline.

## [0.13.7] - 2026-10-28

### Fixed

- Preserve empty arrays and objects inside raw source records so serialized metadata remains valid input to built-in templates.

### Documentation

- Clarify that raw output removes undefined values and unavailable sources while template output also removes empty collections.

## [0.13.6] - 2026-10-27

### Added

- Report `upstreamBranch`, `upstreamAhead`, and `upstreamBehind` in Git statistics, omitting counts when the tracked ref is unavailable locally.

### Maintenance

- Update shared configuration and pnpm, build before linting or fixing, and remove contributor skill synchronization and its dependency.

## [0.13.5] - 2026-10-19

### Fixed

- Discover target-prefixed and nested Info.plist files, skip Firebase configuration plists, and ignore template bundle identifiers.
- Extract plist copyright holders correctly from notices containing year ranges.
- Retain CodeMeta dependency authors, including authors attached to matching package-manager requirements and development dependencies.
- Fall back to normalized Git remote URLs for `codeRepository`, preferring origin and supporting offline and non-GitHub repositories while removing credentials and Git transport details.

### Documentation

- Document target-prefixed Info.plist discovery at the root and one directory below it.

## [0.13.4] - 2026-10-19

### Fixed

- Recognize standalone GNU license supplements accurately, preserve wrapped copyright prose, normalize typographic quotes, and prefer LGPL records when GPL text is bundled alongside them.
- Respect declared CodeMeta creation dates and licenses ahead of inferred Git dates and detected licenses.
- Emit the CodeMeta 3.1 context URL instead of 3.0.

## [0.13.3] - 2026-10-19

### Fixed

- Merge bare manifest requirements with matching CodeMeta dependencies by name or identifier, retaining richer names, types, and metadata without duplicates.
- Avoid false license ambiguity between SPDX variants and prefer current identifiers over deprecated forms.

## [0.13.2] - 2026-10-19

### Fixed

- Deduplicate programming languages, runtime platforms, and operating systems in CodeMeta output.
- Preserve CodeMeta dependency node types, repository URLs, and homepage URLs when parsing and regenerating metadata.
- Merge CodeMeta software requirements with non-package-manager manifests so omitted host-platform dependencies are retained.
- Canonicalize known SPDX IDs case-insensitively and preserve license expressions or free text instead of constructing invalid SPDX URLs.

### Maintenance

- Update the declared Zod requirement.

## [0.13.1] - 2026-10-19

### Changed

- Include metadata.json descriptions, homepages, repository URLs, and keywords in CodeMeta output while preserving existing manifest and CodeMeta precedence.

### Fixed

- Extract Git statistics from linked worktrees, submodules, and repositories without commits.
- Measure tracked file sizes from each nested or workspace repository's own root.

### Documentation

- Explain metadata-file fallback precedence in CodeMeta templates and remove obsolete tree-sitter installation guidance.

### Maintenance

- Refresh runtime and development dependencies, update release and dependency-automation workflows, and correct Windows test-path expectations.

## [0.13.0] - 2026-10-08

### Added

- Scan remote Git repository URLs through the CLI and API, including requested branches, tags, commits, and supported browse URLs; record the scanned remote commit.
- Cache remote clones by default, support offline cache reuse and temporary clones through `--no-cache` or `cache: false`, and export remote-URL and cache-directory helpers.

### Changed

- Exclude Git internals from the project file tree and filesystem statistics while discovering repositories separately.
- Download the shared Obsidian plugin-statistics file once per extraction instead of once per discovered plugin.

### Fixed

- Honor offline mode in dependency-update checks so they do not query package registries.

### Documentation

- Document remote scanning, cache lifecycle, authentication, and CLI/API examples; clarify dependency-update networking and scan-detail metadata.

### Maintenance

- Refresh dependencies, CI and automation configuration, and extraction benchmarks.

## [0.12.2] - 2026-10-06

### Documentation

- Document GitHub Actions as a supported source and update README examples, package wording, and Homebrew badge links.

### Maintenance

- Refresh runtime requirements for XML parsing, Python project metadata, and dependency updates.
- Add scheduled dependency-update automation and contributor skill synchronization.
- Refresh development dependencies and pnpm, adjust peer-dependency compatibility, and apply internal naming and configuration cleanup.

## [0.12.1] - 2026-09-28

### Added

- Add Homebrew installation through `kitschpatrol/tap/metascope` and integrate formula publication into releases.

### Changed

- **Breaking:** Restrict supported Node.js versions to `^24.16.0 || >=26.3.0`, excluding Node.js 25 and earlier Node.js 26 releases.

### Documentation

- Separate CLI and library installation guidance and document Homebrew installation and the precise Node.js requirement.
- Correct publiccode YAML and CSDMS links and restore the npm package badge.

### Maintenance

- Refresh runtime and contributor dependencies, update publishing commands, and fix link-check error capture.

## [0.12.0] - 2026-09-17

### Changed

- **Breaking:** Distinguish exact, reference, modified, and uncertain license matches through match status and record type; only confirmed SPDX matches supply inferred CodeMeta licenses.
- Reduce distributed package contents by replacing full SPDX license texts with compact fingerprints and the umbrella Octokit package with a focused GitHub client.

### Documentation

- Document license-match interpretation, normalization limits, fingerprint regeneration, and benchmarks, and correct the nested license-match access example.
- Correct the documented Node.js requirement to 24.16+ and add a package-size badge.

### Maintenance

- Add deterministic fingerprint generation, corpus validation, and license-mutation regression benchmarks.
- Refresh runtime dependencies and development tooling, migrate to Vitest 5 and pnpm 12, and update benchmark and release workflows.

## [0.11.1] - 2026-08-25

### Fixed

- Handle rate limits per host with adaptive pacing, cooldown probes, and request timeouts; cancel unread responses to release connections.

### Documentation

- Replace the unreliable ASCL link with an accessible reference.

### Maintenance

- Use npm for publishing with the configured one-time password.

## [0.11.0] - 2026-08-25

### Added

- Include the scanned directory's `Folder Name` in frontmatter output.

### Changed

- Adopt compact dependency-update ages such as `3mo` and calculate libyears using the new units, distinguishing minutes from months.

### Documentation

- Correct the ASCL reference link.

### Maintenance

- Refresh dependencies and CI actions, improve sitemap discovery, and update publishing authentication.

## [0.10.0] - 2026-08-03

### Changed

- **Breaking:** Raise the minimum supported Node.js runtime from 22.17.0 to 24.16.0.

### Documentation

- Correct npm, license, and swMATH links.

### Maintenance

- Refresh runtime and development dependencies, editor tasks, TypeScript configuration, and build externals.
- Migrate link checking to cached lychee scans with sitemap discovery and tighten release-tag validation against the default branch.

## [0.9.0] - 2026-07-24

### Changed

- Emit audited direct HTTPS license URLs with SPDX fallbacks, and recognize both original and redirected license URLs in pointer files.

### Documentation

- Correct source-specification and crosswalk links and add ecosyste.ms to related projects.

### Maintenance

- Add automated repository and website link checking.
- Add license-URL regeneration tooling and regression coverage for canonical URLs.
- Refresh runtime dependencies, GitHub Actions, TypeScript 6, and shared configuration; apply stricter linting and require Node.js 24.16+ for contributor tooling.

## [0.8.5] - 2026-07-05

### Fixed

- Pace registry-request starts globally to prevent parallel sources and workspace scans from causing rate-limit storms.

## [0.8.4] - 2026-07-05

### Fixed

- Prevent unbounded file-tree crawling through symlinked directory cycles.
- Read Git ignore paths as unquoted, NUL-separated names so ignored filenames with non-ASCII or special characters are handled correctly.

### Maintenance

- Refresh runtime dependencies, build and validation tooling, tests, and pnpm.

## [0.8.3] - 2026-06-08

### Security

- Replace the Xcode parser with the @mshibanami-org/xcode fork containing security fixes.

### Documentation

- Refresh example output to reflect the current license-record schema and Xcode parser dependency.

### Maintenance

- Update process-execution, file-globbing, and test tooling dependencies and adjust pnpm workspace configuration.

## [0.8.2] - 2026-06-05

### Maintenance

- Refresh runtime dependencies, including tokei, semver, tinyexec, updates, and web-tree-sitter.
- Update declaration-checking and development tools, remove the fflate compatibility override, and raise the contributor Node.js requirement to 22.22.2.

## [0.8.1] - 2026-05-22

### Fixed

- Resolve input-directory symlinks before extraction so all sources receive a canonical path; reported source paths and scan options now use the resolved target.

## [0.8.0] - 2026-05-17

### Changed

- **Breaking:** Require a `data.type` discriminator on license-file records: `spdx` for matched files and `unknown` for unmatched files, preserving their paths and record shape.

## [0.7.6] - 2026-05-17

### Maintenance

- Upgrade plist to version 5 and adapt plist parsing to its named export and bundled types.
- Return contributor tooling to TypeScript 5.9, update tsx, and pin fflate for type-checking compatibility.

## [0.7.5] - 2026-05-16

### Changed

- **Breaking:** Move license-file match fields beneath `data.match` and retain discovered file paths when their contents do not match an SPDX license.

### Fixed

- Preserve `UNLICENSED` and `SEE LICENSE IN ...` declarations without fabricating SPDX URLs.
- Deduplicate dependency-update entries by package name so update counts and libyears are not inflated.

### Documentation

- Refresh sample output for nested license matches and deduplicated dependency updates.

### Maintenance

- Refresh dependencies and GitHub Actions, migrate contributor setup to pnpm 11 build permissions, and correct publishing-token handling.

## [0.7.4] - 2026-05-12

### Documentation

- Correct the description of the custom metadata.json format.

### Maintenance

- Refresh runtime dependencies, shared configuration, publishing checks, build tools, tests, and pnpm.

## [0.7.3] - 2026-04-30

### Documentation

- Correct the README's MIT license link.

## [0.7.2] - 2026-04-30

### Fixed

- Restore parsing of absent optional metadata fields and default string arrays under Zod 4.4.

### Maintenance

- Update declared tinyexec and updates requirements.

## [0.7.1] - 2026-04-28

### Added

- Include the full license name and OSI approval status in license-file matches.

### Fixed

- Parse Info.plist files containing malformed XML comments or leading content that stricter XML parsing rejects.

### Documentation

- Clarify contribution expectations and document the repository's linting and Markdown-generation tools.

### Maintenance

- Refresh runtime dependencies, build and documentation tooling, TypeScript, Vitest, and pnpm.

## [0.7.0] - 2026-04-09

### Added

- Identify short license-pointer files from recognized SPDX or vendor URLs and include `spdxUrl` in license matches.

### Changed

- Accept kebab-case values for `--sources` while continuing to accept camelCase source names.

### Documentation

- Show kebab-case source names in CLI help and examples, and refresh sample license output.

### Maintenance

- Use the updates library API instead of resolving and spawning its CLI executable.
- Refresh runtime dependencies and development tooling, adopt TypeScript 6, and support release tags without a leading v.

## [0.6.3] - 2026-04-07

### Added

- Export `setGrammarDirectory()` so consumers can override the tree-sitter WASM grammar directory.

## [0.6.2] - 2026-04-07

### Fixed

- Resolve tree-sitter WASM grammar paths correctly on Windows.

### Maintenance

- Refresh logging, Python metadata, Git, and development-tooling dependencies.

## [0.6.1] - 2026-04-05

### Fixed

- Report projects without GitHub metadata as non-public in frontmatter and project templates.

### Maintenance

- Update tokei, XML parsing, dependency checks, and development tooling.

## [0.6.0] - 2026-04-03

### Added

- Include `CI` and `CI URL` fields in frontmatter output for a workflow named CI.
- Expose `helpers.toOptionalMarkdownLink()` and explicit literal types for workflow run statuses and conclusions.

### Fixed

- Match GitHub Actions run results to workflow files correctly with relative output paths and Windows separators.
- Sort matched files by directory depth correctly on Windows.
- Correct title-case typing by replacing scule with string-ts.

### Documentation

- Refresh examples to show workflow run metadata and frontmatter CI fields.

### Maintenance

- Make grammar-copy setup cross-platform, mock the workflow-runs endpoint, and run benchmarks without watch mode.

## [0.5.0] - 2026-04-02

### Added

- Enrich GitHub Actions workflows with their latest completed default-branch run's status, conclusion, timestamp, duration, and URL.

### Changed

- Speed up metadata extraction through concurrent Git operations and reduced file-matching, README-parsing, license-matching, and template-processing overhead.

### Maintenance

- Add metadata and template benchmarks, consolidate parser regular expressions, and refresh shared configuration and contributor tooling.
- Update runtime requirements for lognow and updates.

## [0.4.0] - 2026-04-01

### Added

- Add a `githubActions` source that extracts workflow names and file paths.
- Extract YAML frontmatter from README files alongside their Markdown titles.

### Changed

- Move expected offline skips and source-discovery fallback messages from warnings to debug output.

### Fixed

- Locate the dependency-update executable through its installed entry point.

### Documentation

- Update example metadata to demonstrate GitHub Actions workflow extraction.

### Maintenance

- Run CI on Linux, macOS, and Windows, and refresh runtime and documentation-tooling dependencies.

## [0.3.0] - 2026-04-01

### Added

- Add the `codemetaJson` template and its exported result type for normalized metadata without JSON-LD annotations.

### Changed

- Move expected PyPI discovery fallback messages to debug logging.

### Fixed

- Use ESM module resolution to locate the dependency-update executable.

### Documentation

- Document the `codemetaJson` template and provide sample output.

### Maintenance

- Share normalized CodeMeta template processing across the frontmatter, metadata, and project templates.

## [0.2.3] - 2026-03-31

### Fixed

- Skip PyPI lookups for Python projects declaring a `Private ::` classifier.
- Make GitHub and PyPI sources honor offline mode.

### Documentation

- Expand related-project references and clarify source availability behavior.

### Maintenance

- Add build, lint, and test CI with deterministic network mocks and an optional live-network test command; harden existing workflow configuration.
- Refresh runtime dependencies, development tooling, and pnpm requirements.

## [0.2.2] - 2026-03-11

### Fixed

- Resolve Python and Ruby WASM grammars correctly from both bundled CLI and unbundled library installations, and include grammar assets in CLI builds.

### Documentation

- Shorten `--sources` help output while retaining source validation and detailed invalid-source errors.

### Maintenance

- Update the GitHub repository-metadata synchronization workflow.

## [0.2.1] - 2026-03-11

### Fixed

- Add JSON import attributes so the CLI and library load correctly on Node.js 25.

## [0.2.0] - 2026-03-11

### Added

- Add the `metadata` template for repository descriptions, homepages, and topics, with explicit metadata-file values overriding inferred values.
- Support source selection through `--sources`/`-s` and the API `sources` option, and export the available `sourceNames`.
- Export built-in template result types and helpers for dependency queries, dependency names, comma-separated strings, and URL validation.
- Include `folderName` in filesystem statistics.

### Changed

- **Breaking:** Revise frontmatter output with normalized names, IDs, contributors, maintainers, aliases, and monorepo information; rename keys, return dependency-name lists, and remove several previous fields.
- **Breaking:** Change `helpers.toStatus()` to consider contributors, maintainers, and fork ownership and return `author`, `maintainer`, `observer`, or `unknown`; expose the previous behavior as `toStatusLegacy()`.
- **Breaking:** Return Cinder author metadata as an array, splitting comma-separated author names.
- Expand CodeMeta aggregation with Poetry metadata, Python homepage and repository URLs, package maintainers, README and folder-name fallbacks, and code-statistics language fallback.
- Retry registry requests after network errors and HTTP 429/5xx responses using exponential backoff and numeric `Retry-After` headers.
- Label diagnostics with the package name and move expected private-package skips to debug logging.

### Removed

- **Breaking:** Remove `helpers.usesSharedConfig()` in favor of the general `helpers.hasDependencyWithId()` helper.
- **Breaking:** Remove the unused GitHub `license` type field; retain the specific license key, name, SPDX ID, and URL fields.

### Fixed

- Report zero uncommitted files for clean Git repositories instead of omitting the count.
- Exclude GitHub's `NOASSERTION` value from SPDX license identifiers.
- Correct decimal byte and megabyte conversions in GitHub metadata and template helpers.
- Skip npm registry lookups for packages marked private or configured for restricted publishing.
- Improve published TypeScript declarations by preserving the library's module structure.

### Documentation

- Document the metadata template and source selection, and refresh examples for the revised template output.

### Maintenance

- Refresh runtime and build dependencies, reorganize grammar assets, and stabilize test setup and execution.

## [0.1.0] - 2026-03-10

### Added

- Provide typed `getMetadata()` extraction with source provenance, parallel source processing, and partial results when individual sources fail.
- Parse Node, Python, Rust, Ruby, Go, GoReleaser, and Maven manifests, including complete Node and Python package metadata.
- Extract metadata from Arduino libraries, Processing libraries and sketches, Cinder, openFrameworks addons, Obsidian manifests, and Xcode projects and plists.
- Read README titles, identify licenses, normalize CodeMeta metadata, and parse publiccode YAML and custom metadata JSON/YAML files.
- Collect Git configuration and history statistics, filesystem sizes and counts, language and code statistics, dependency updates, and libyears.
- Enrich local metadata with GitHub repository activity and npm, PyPI, and Obsidian registry statistics; resolve GitHub credentials from options, the environment, or GitHub CLI authentication.
- Provide CLI controls for recursive scanning, workspace discovery or explicit workspace paths, ignored files, absolute or relative paths, offline sources, credentials, and verbose diagnostics.
- Offer CodeMeta JSON-LD, Obsidian frontmatter, and legacy project templates, plus custom TypeScript templates with inferred return types and parameterized ownership checks.
- Export template helpers, default options, source-record and context types, and configurable logging through the library API.
- Distribute an npm-installable CLI and ESM library with TypeScript declarations, native code-statistics bindings, and parser grammars; require Node.js 22.17+ and Git.

### Documentation

- Document installation, CLI and library usage, supported sources, custom templates, sample output, and expected API instability before 1.0.

### Maintenance

- Establish build, lint, fixture-based tests, declaration validation, example generation, and release tooling.

[Unreleased]: https://github.com/kitschpatrol/metascope/compare/v0.13.9...HEAD
[0.1.0]: https://github.com/kitschpatrol/metascope/releases/tag/v0.1.0
[0.2.0]: https://github.com/kitschpatrol/metascope/compare/v0.1.0...v0.2.0
[0.2.1]: https://github.com/kitschpatrol/metascope/compare/v0.2.0...v0.2.1
[0.2.2]: https://github.com/kitschpatrol/metascope/compare/v0.2.1...v0.2.2
[0.2.3]: https://github.com/kitschpatrol/metascope/compare/v0.2.2...v0.2.3
[0.3.0]: https://github.com/kitschpatrol/metascope/compare/v0.2.3...v0.3.0
[0.4.0]: https://github.com/kitschpatrol/metascope/compare/v0.3.0...v0.4.0
[0.5.0]: https://github.com/kitschpatrol/metascope/compare/v0.4.0...v0.5.0
[0.6.0]: https://github.com/kitschpatrol/metascope/compare/v0.5.0...v0.6.0
[0.6.1]: https://github.com/kitschpatrol/metascope/compare/v0.6.0...v0.6.1
[0.6.2]: https://github.com/kitschpatrol/metascope/compare/v0.6.1...v0.6.2
[0.6.3]: https://github.com/kitschpatrol/metascope/compare/v0.6.2...v0.6.3
[0.7.0]: https://github.com/kitschpatrol/metascope/compare/v0.6.3...v0.7.0
[0.7.1]: https://github.com/kitschpatrol/metascope/compare/v0.7.0...v0.7.1
[0.7.2]: https://github.com/kitschpatrol/metascope/compare/v0.7.1...v0.7.2
[0.7.3]: https://github.com/kitschpatrol/metascope/compare/v0.7.2...v0.7.3
[0.7.4]: https://github.com/kitschpatrol/metascope/compare/v0.7.3...v0.7.4
[0.7.5]: https://github.com/kitschpatrol/metascope/compare/v0.7.4...v0.7.5
[0.7.6]: https://github.com/kitschpatrol/metascope/compare/v0.7.5...v0.7.6
[0.8.0]: https://github.com/kitschpatrol/metascope/compare/v0.7.6...v0.8.0
[0.8.1]: https://github.com/kitschpatrol/metascope/compare/v0.8.0...v0.8.1
[0.8.2]: https://github.com/kitschpatrol/metascope/compare/v0.8.1...v0.8.2
[0.8.3]: https://github.com/kitschpatrol/metascope/compare/v0.8.2...v0.8.3
[0.8.4]: https://github.com/kitschpatrol/metascope/compare/v0.8.3...v0.8.4
[0.8.5]: https://github.com/kitschpatrol/metascope/compare/v0.8.4...v0.8.5
[0.9.0]: https://github.com/kitschpatrol/metascope/compare/v0.8.5...v0.9.0
[0.10.0]: https://github.com/kitschpatrol/metascope/compare/v0.9.0...v0.10.0
[0.11.0]: https://github.com/kitschpatrol/metascope/compare/v0.10.0...v0.11.0
[0.11.1]: https://github.com/kitschpatrol/metascope/compare/v0.11.0...v0.11.1
[0.12.0]: https://github.com/kitschpatrol/metascope/compare/v0.11.1...v0.12.0
[0.12.1]: https://github.com/kitschpatrol/metascope/compare/v0.12.0...v0.12.1
[0.12.2]: https://github.com/kitschpatrol/metascope/compare/v0.12.1...v0.12.2
[0.13.0]: https://github.com/kitschpatrol/metascope/compare/v0.12.2...v0.13.0
[0.13.1]: https://github.com/kitschpatrol/metascope/compare/v0.13.0...v0.13.1
[0.13.2]: https://github.com/kitschpatrol/metascope/compare/v0.13.1...v0.13.2
[0.13.3]: https://github.com/kitschpatrol/metascope/compare/v0.13.2...v0.13.3
[0.13.4]: https://github.com/kitschpatrol/metascope/compare/v0.13.3...v0.13.4
[0.13.5]: https://github.com/kitschpatrol/metascope/compare/v0.13.4...v0.13.5
[0.13.6]: https://github.com/kitschpatrol/metascope/compare/v0.13.5...v0.13.6
[0.13.7]: https://github.com/kitschpatrol/metascope/compare/v0.13.6...v0.13.7
[0.13.8]: https://github.com/kitschpatrol/metascope/compare/v0.13.7...v0.13.8
[0.13.9]: https://github.com/kitschpatrol/metascope/compare/v0.13.8...v0.13.9

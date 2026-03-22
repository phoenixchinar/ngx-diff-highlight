# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Redesigned `computeDiff()` to return a structured diff result with field entries, array-item entries, move metadata, and projected highlight paths.
- Added path-aware array matching rules, global identity hooks, bounded automatic fingerprint matching, and explicit array matching modes.
- Updated the demo app to showcase basic path matching, structured visual diffs, semantic array moves, row-level plus field-level table highlighting, and automatic fingerprint matching.
- Updated the documentation to reflect the structured diff architecture and current default CSS classes.

## [0.1.0] - 2026-03-21

### Added
- Initial project structure for `ngx-diff-highlight` library and demo app.
- GitHub Actions CI workflow.
- Standard open-source documentation.
